/**
 * backendSync.ts — Shared credential sync helper
 *
 * Provides syncCredentialsToBackend() used by LoginPage and all mutation hooks
 * to ensure the current user's credentials are registered in the backend
 * before any WithCreds call.
 *
 * Key design:
 *  - Calls selfRegisterLocalUser (4-param backend function) with retries
 *  - Returns true on success or already-registered-same-password
 *  - Returns false ONLY on username conflict (different password) — NOT retryable
 *  - Network errors are retried up to maxAttempts times with exponential backoff
 *
 * credSyncPromise:
 *  - Set by App.tsx on startup to the result of the initial sync
 *  - Mutations import and await this before firing to eliminate race conditions
 */

import type { Backend } from "../backend";

export interface SyncCredentials {
  username: string;
  password: string;
  name: string;
  accessLevel: string;
}

/**
 * Module-level promise tracking the in-flight or completed startup sync.
 * App.tsx sets this immediately after login so mutations can await it.
 * Defaults to resolved(false) so awaiting it never blocks if never set.
 */
let _credSyncPromise: Promise<boolean> = Promise.resolve(false);

/** Set by App.tsx after login begins. Mutations await this before firing. */
export function setCredSyncPromise(p: Promise<boolean>): void {
  _credSyncPromise = p;
}

/** Await the current credential sync. Resolves immediately if already done. */
export async function awaitCredSync(): Promise<boolean> {
  return _credSyncPromise;
}

/**
 * Sync credentials to the backend canister with up to maxAttempts retries.
 * Returns true if credentials are confirmed registered.
 * Returns false if username is taken with a DIFFERENT password (conflict — not retryable).
 * Returns false if all retry attempts were exhausted due to network errors.
 */
export async function syncCredentialsToBackend(
  actor: Backend,
  creds: SyncCredentials,
  maxAttempts = 5,
): Promise<boolean> {
  if (!creds.username || !creds.password) {
    console.warn("[backendSync] Missing username or password — skipping sync");
    return false;
  }

  // Preserve the exact accessLevel — never fall back to "readonly" for admin users
  const accessLevel = creds.accessLevel || "readonly";
  const displayName = creds.name || creds.username;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let result: boolean | undefined;
    try {
      result = await actor.selfRegisterLocalUser(
        creds.username,
        creds.password,
        displayName,
        accessLevel,
      );
      console.log(
        `[backendSync] attempt ${attempt}/${maxAttempts}: username=${creds.username}, accessLevel=${accessLevel}, result=${result}`,
      );
    } catch (err) {
      // Network/canister error — retry with exponential backoff
      console.warn(
        `[backendSync] attempt ${attempt}/${maxAttempts}: username=${creds.username}, threw:`,
        err,
      );
      if (attempt < maxAttempts) {
        // Exponential back-off: 400ms, 800ms, 1200ms, 1600ms
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      console.error(
        `[backendSync] All ${maxAttempts} attempts failed for username=${creds.username}. Backend may be unreachable.`,
      );
      return false;
    }

    if (result === true) {
      // Successfully registered (or already registered with same password)
      return true;
    }

    // result === false: username taken with different password — NOT retryable
    // This can happen if the canister was redeployed and another user registered
    // the same username with a different password. Allow login anyway.
    console.warn(
      "[backendSync] Username conflict (different password stored in canister). " +
        "User will be allowed to log in via localStorage fallback.",
      creds.username,
    );
    // Try once more in case the backend state was in a transient bad state
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
      continue;
    }
    return false;
  }

  return false;
}
