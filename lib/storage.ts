import { RepoNote } from "./types";

const KEY = "gh-explorer-notes";

function readAll(): RepoNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RepoNote[]) : [];
  } catch {
    return [];
  }
}

function writeAll(notes: RepoNote[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(notes));
  } catch {
    // Storage can fail (quota, private browsing) — notes just won't
    // persist in that case, nothing else in the app depends on it.
  }
}

export function getNotesForRepo(repoFullName: string): RepoNote[] {
  return readAll()
    .filter((n) => n.repoFullName === repoFullName)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addNote(repoFullName: string, text: string): RepoNote {
  const note: RepoNote = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    repoFullName,
    text,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), note]);
  return note;
}

export function deleteNote(id: string) {
  writeAll(readAll().filter((n) => n.id !== id));
}
