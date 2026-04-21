import { createContext, useContext, useState } from "react";

// ── Session shape ─────────────────────────────────────────────────────────────
// username/name/accessLevel/password are all persisted in localStorage.
// sessionStorage is also written as a secondary copy (faster read in same tab).

export interface LocalSession {
  name: string;
  accessLevel: string;
  username: string;
  /**
   * Stored in localStorage (key: session_password) AND sessionStorage.
   * localStorage copy survives tab close/reopen so mutations work seamlessly.
   */
  password: string;
}

/** What gets persisted to localStorage for the session itself (no password in this object) */
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
 * Returns null if no session is active or password is missing.
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
const SESSION_PWD_KEY = "session_password"; // localStorage key (persists tab close)
const SESSION_PWD_SS_KEY = "localSessionPwd"; // sessionStorage key (legacy compat)

export function persistSession(session: LocalSession): void {
  const persisted: PersistedSession = {
    username: session.username,
    name: session.name,
    accessLevel: session.accessLevel,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(persisted));

  // Store password in BOTH localStorage (survives tab close) and sessionStorage (fast read)
  if (session.password) {
    localStorage.setItem(SESSION_PWD_KEY, session.password);
    sessionStorage.setItem(SESSION_PWD_SS_KEY, session.password);
  }
}

export function clearPersistedSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_PWD_KEY);
  sessionStorage.removeItem(SESSION_PWD_SS_KEY);
  localStorage.removeItem("pendingBackendSync");
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

/**
 * Load the persisted password, checking sessionStorage first (faster),
 * then falling back to localStorage (survives tab close).
 */
export function loadSessionPassword(): string {
  return (
    sessionStorage.getItem(SESSION_PWD_SS_KEY) ??
    localStorage.getItem(SESSION_PWD_KEY) ??
    ""
  );
}
