import { createContext, useContext, useState } from "react";

// ── Session shape ─────────────────────────────────────────────────────────────
// password is stored in React state (in-memory) ONLY — never in localStorage.
// localStorage only persists {username, name, accessLevel} for "soft restore".

export interface LocalSession {
  name: string;
  accessLevel: string;
  username: string;
  /** In-memory only. Never written to localStorage or any persistent store. */
  password: string;
}

/** What gets persisted to localStorage (no password) */
interface PersistedSession {
  username: string;
  name: string;
  accessLevel: string;
}

interface LocalSessionContextValue {
  localSession: LocalSession | null;
  setLocalSession: (session: LocalSession | null) => void;
}

export const LocalSessionContext = createContext<LocalSessionContextValue>({
  localSession: null,
  setLocalSession: () => {},
});

export function useLocalSession() {
  return useContext(LocalSessionContext).localSession;
}

/**
 * Returns {username, password} for use in WithCreds backend calls.
 * Returns null if:
 *   - No session is active
 *   - Session accessLevel is not 'admin'
 *   - Password is empty (session was restored from localStorage after a refresh
 *     but user hasn't re-entered password yet)
 */
export function useLocalAdminCreds(): {
  username: string;
  password: string;
} | null {
  const session = useContext(LocalSessionContext).localSession;
  if (session?.username && session?.password) {
    return { username: session.username, password: session.password };
  }
  return null;
}

/**
 * Returns {username, password} for ANY logged-in user (not just admin).
 * Used by mutation hooks that require credentials for standard users too.
 */
export function useLocalCreds(): { username: string; password: string } | null {
  const session = useContext(LocalSessionContext).localSession;
  if (session?.username && session?.password) {
    return { username: session.username, password: session.password };
  }
  return null;
}

// ── Persistence helpers ───────────────────────────────────────────────────────

const SESSION_KEY = "localUserSession";

export function persistSession(session: LocalSession): void {
  const persisted: PersistedSession = {
    username: session.username,
    name: session.name,
    accessLevel: session.accessLevel,
    // password intentionally omitted
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(persisted));
}

export function clearPersistedSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function loadPersistedSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}
