import { NextRequest } from "next/server";
import { getRepoContext, GitHubApiError } from "@/lib/github";
import { buildRepoSystemPrompt, getGroqClient, isScopeViolation, AI_MODEL } from "@/lib/ai";
import { ChatMessage, CHAT_ERROR_MARKER } from "@/lib/types";

export const maxDuration = 60;

const ALLOWED_ROLES = new Set(["user", "assistant"]);

// Clients can hit this endpoint directly, not just through our UI, so a
// message could arrive with role: "system" and get treated as a second
// system prompt. Forced everything down to user/assistant so that can't happen.
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

  let groq;
  try {
    groq = getGroqClient();
  } catch {
    return new Response(
      JSON.stringify({ error: "AI chat is unavailable: server is missing an API key" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // getRepoContext and isScopeViolation don't depend on each other, so
  // run them together instead of one after the other, cuts the wait
  // roughly in half when the repo context isn't cached.
  const latestUserMessage = messages[messages.length - 1]?.content ?? "";

  let systemPrompt: string;
  let violatesScope: boolean;
  try {
    const [context, scopeResult] = await Promise.all([
      getRepoContext(owner, repo),
      isScopeViolation(latestUserMessage),
    ]);
    systemPrompt = buildRepoSystemPrompt(context);
    violatesScope = scopeResult;
  } catch (err) {
    const status = err instanceof GitHubApiError ? err.status : 500;
    const message = err instanceof GitHubApiError ? err.message : "Failed to load repo context";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

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

        // Headers are already sent by the time we're in here, so we can't
        // return a clean JSON error anymore, controller.error() would just
        // kill the connection and look like a network failure to the browser.
        // Enqueue the message as normal stream content instead so it shows up
        // as a regular chat bubble.
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