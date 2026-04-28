import { createContext, useContext, useState } from "react";

// ── Session shape ─────────────────────────────────────────────────────────────
// username/name/accessLevel/password are all persisted across tabs and refreshes.
// localStorage is the primary store (survives tab close/reopen).
// sessionStorage is a secondary copy for same-tab fast reads.

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

/**
 * Module-level in-memory cache for the session password.
 * Provides a last-resort fallback if both localStorage and sessionStorage
 * return empty (e.g. private browsing mode or storage quota exceeded).
 */
let _inMemoryPassword = "";

export function persistSession(session: LocalSession): void {
  const persisted: PersistedSession = {
    username: session.username,
    name: session.name,
    accessLevel: session.accessLevel,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(persisted));

  // ALWAYS write password to BOTH storages — never skip either.
  // localStorage survives tab close; sessionStorage is fast for same-tab reads.
  if (session.password) {
    _inMemoryPassword = session.password;
    localStorage.setItem(SESSION_PWD_KEY, session.password);
    sessionStorage.setItem(SESSION_PWD_SS_KEY, session.password);
  }
}

export function clearPersistedSession(): void {
  _inMemoryPassword = "";
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
 * Load the persisted password.
 * Priority: in-memory cache → localStorage (most persistent) → sessionStorage
 * localStorage is checked first because it survives tab close and is the
 * canonical store. sessionStorage is a fallback for the same-tab case.
 */
export function loadSessionPassword(): string {
  // 1. In-memory cache (fastest, safest)
  if (_inMemoryPassword) return _inMemoryPassword;
  // 2. localStorage (survives tab close)
  const lsPassword = localStorage.getItem(SESSION_PWD_KEY);
  if (lsPassword) {
    _inMemoryPassword = lsPassword; // warm cache
    return lsPassword;
  }
  // 3. sessionStorage (legacy fallback)
  const ssPassword = sessionStorage.getItem(SESSION_PWD_SS_KEY);
  if (ssPassword) {
    _inMemoryPassword = ssPassword; // warm cache
    return ssPassword;
  }
  return "";
}
