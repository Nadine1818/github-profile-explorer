import { NextRequest } from "next/server";
import { getRepoContext, GitHubApiError } from "@/lib/github";
import { buildRepoSystemPrompt, getGroqClient, isScopeViolation, AI_MODEL } from "@/lib/ai";
import { ChatMessage, CHAT_ERROR_MARKER } from "@/lib/types";

export const maxDuration = 60;

const ALLOWED_ROLES = new Set(["user", "assistant"]);

// The request body comes straight from the client, which means nothing
// stops someone from bypassing the chat UI entirely and POSTing a
// message with role: "system" (or anything else) directly. If that
// were passed through unchanged, it would land in the Groq request as
// a second system-level message alongside the real one -- potentially
// carrying more authority than a same instruction sent as "user" would.
// This normalizes every incoming message to "user" or "assistant" only,
// so a forged role can never gain elevated standing in the conversation.
function sanitizeMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const sanitized: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const content = (m as { content?: unknown }).content;
    if (typeof content !== "string" || !content.trim()) continue;

    const rawRole = (m as { role?: unknown }).role;
    const role = typeof rawRole === "string" && ALLOWED_ROLES.has(rawRole) ? rawRole : "user";
    sanitized.push({ role: role as ChatMessage["role"], content });
  }

  return sanitized.length > 0 ? sanitized : null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const owner: string | undefined = body?.owner;
  const repo: string | undefined = body?.repo;
  const messages = sanitizeMessages(body?.messages);

  if (!owner || !repo || !messages) {
    return new Response(
      JSON.stringify({ error: "owner, repo, and a non-empty messages array are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let systemPrompt: string;
  try {
    const context = await getRepoContext(owner, repo);
    systemPrompt = buildRepoSystemPrompt(context);
  } catch (err) {
    const status = err instanceof GitHubApiError ? err.status : 500;
    const message = err instanceof GitHubApiError ? err.message : "Failed to load repo context";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  let groq;
  try {
    groq = getGroqClient();
  } catch {
    return new Response(
      JSON.stringify({ error: "AI chat is unavailable: server is missing an API key" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Second, independent line of defense against scope-breaking attempts
  // (roleplay requests, "ignore your instructions", off-topic asks, etc):
  // a small separate model classifies the latest user message *before*
  // the main model ever sees it. If it's flagged, we skip the main call
  // entirely and return a fixed refusal -- this doesn't depend on the
  // main model correctly resisting the same message it received, which
  // testing showed isn't reliable as a sole defense even on the larger model.
  const latestUserMessage = messages[messages.length - 1]?.content ?? "";
  const violatesScope = await isScopeViolation(latestUserMessage);

  // Stream raw text chunks to the client as they arrive from the
  // model, so the chat UI can render tokens progressively instead
  // of waiting for the full reply.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      if (violatesScope) {
        controller.enqueue(
          encoder.encode(
            "I'm scoped to answering questions about this repository and can't " +
              "help with that -- try asking something about the repo instead."
          )
        );
        controller.close();
        return;
      }

      try {
        const groqStream = await groq.chat.completions.create({
          model: AI_MODEL,
          max_tokens: 800,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        });

        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch (err) {
        console.error("Chat stream error", err);

        // The HTTP response has already started by this point (headers
        // are sent as soon as the ReadableStream is returned below), so
        // we can't fall back to a clean JSON error response anymore --
        // controller.error() would just abort the connection and the
        // browser would see a raw network failure instead of a message.
        // Enqueueing a readable explanation as stream content instead
        // means it shows up as normal assistant text in the chat UI.
        const status = (err as { status?: number })?.status;
        const friendlyMessage =
          status === 429
            ? "The AI provider's rate limit was reached. Please wait a minute and try again."
            : "Something went wrong generating a response. Please try again.";
        controller.enqueue(encoder.encode(CHAT_ERROR_MARKER + friendlyMessage));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}