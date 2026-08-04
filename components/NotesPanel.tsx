"use client";

import { FormEvent, useState } from "react";
import { RepoNote } from "@/lib/types";
import { addNote, deleteNote, getNotesForRepo } from "@/lib/storage";
import { formatRelativeDate } from "@/lib/format";

interface Props {
  scopeKey: string;
  // true (default) when the parent gives this a real, definite height --
  // e.g. inside RepoDetailPanel's slide-over -- so the notes list can
  // grow to fill it and the input pins to the panel's actual bottom
  // edge. false on the plain profile page, where there's no parent
  // height to fill, so instead it just sizes to its content and caps
  // itself with internal scrolling past a fixed height.
  fillHeight?: boolean;
}

// Callers should render this with `key={scopeKey}` whenever scopeKey
// can change (e.g. switching repos) so state initializes fresh per
// scope, rather than syncing it via setState-in-effect.
export default function NotesPanel({ scopeKey, fillHeight = true }: Props) {
  const [notes, setNotes] = useState<RepoNote[]>(() => getNotesForRepo(scopeKey));
  const [draft, setDraft] = useState("");

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addNote(scopeKey, text);
    setNotes(getNotesForRepo(scopeKey));
    setDraft("");
  }

  function handleDelete(id: string) {
    deleteNote(id);
    setNotes(getNotesForRepo(scopeKey));
  }

  return (
    <div className={fillHeight ? "flex h-full flex-col" : "flex flex-col"}>
      <div
        className={
          fillHeight
            ? "themed-scroll flex-1 space-y-2 overflow-y-auto pr-1"
            : "themed-scroll max-h-[50vh] space-y-2 overflow-y-auto pr-1"
        }
      >
        {notes.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            No notes yet.
          </p>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            className="fade-up group flex items-start justify-between gap-2 rounded-md border p-3"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div>
              <p className="text-sm" style={{ color: "var(--text)" }}>
                {note.text}
              </p>
              <span className="font-mono-tabular text-[10px]" style={{ color: "var(--text-dim)" }}>
                {formatRelativeDate(note.createdAt)}
              </span>
            </div>
            <button
              onClick={() => handleDelete(note.id)}
              className="shrink-0 text-xs opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: "var(--diff-remove)" }}
              aria-label="Delete note"
            >
              remove
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
          className="flex-1 rounded-md border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="shrink-0 rounded px-3 py-2 font-mono-tabular text-xs font-medium disabled:opacity-40"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          save
        </button>
      </form>
    </div>
  );
}
