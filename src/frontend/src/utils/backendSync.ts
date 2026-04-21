/**
 * backendSync.ts — Shared credential sync helper
 *
 * Provides a single syncCredentialsToBackend() function used by LoginPage,
 * ReLoginDialog, and all mutation hooks to ensure the current user's credentials
 * are registered in the backend before any WithCreds call.
 *
 * Key design:
 *  - Calls selfRegisterLocalUser (4-param backend function) with retries
 *  - Returns true on success, false on all-retries failure
 *  - Safe to call repeatedly: backend returns true if already registered
 */

import type { Backend } from "../backend";

export interface SyncCredentials {
  username: string;
  password: string;
  name: string;
  accessLevel: string;
}

/**
 * Sync credentials to the backend canister with up to maxAttempts retries.
 * Returns true if credentials are confirmed registered, false otherwise.
 */
export async function syncCredentialsToBackend(
  actor: Backend,
  creds: SyncCredentials,
  maxAttempts = 3,
): Promise<boolean> {
  if (!creds.username || !creds.password) return false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const ok = await actor.selfRegisterLocalUser(
        creds.username,
        creds.password,
        creds.name || creds.username,
        creds.accessLevel || "readonly",
      );
      if (ok) return true;
      // ok === false means username taken with different password — no retry needed
      console.warn(
        "syncCredentialsToBackend: username already registered with a different password",
      );
      return false;
    } catch (err) {
      console.warn(
        `syncCredentialsToBackend attempt ${attempt + 1}/${maxAttempts} failed:`,
        err,
      );
      if (attempt < maxAttempts - 1) {
        // Exponential back-off: 400ms, 800ms
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  return false;
}
