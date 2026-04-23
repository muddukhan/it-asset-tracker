/**
 * backendSync.ts — Shared credential sync helper
 *
 * Provides a single syncCredentialsToBackend() function used by LoginPage,
 * ReLoginDialog, and all mutation hooks to ensure the current user's credentials
 * are registered in the backend before any WithCreds call.
 *
 * Key design:
 *  - Calls selfRegisterLocalUser (4-param backend function) with retries
 *  - Returns true on success or already-registered-same-password
 *  - Returns false ONLY on username conflict (different password) — NOT retryable
 *  - Network errors are retried up to maxAttempts times
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
 * Returns true if credentials are confirmed registered.
 * Returns false if username is taken with a DIFFERENT password (conflict — stop, not retryable).
 * Returns false if all retry attempts were exhausted due to network errors.
 */
export async function syncCredentialsToBackend(
  actor: Backend,
  creds: SyncCredentials,
  maxAttempts = 3,
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
      // Network/canister error — retry
      console.warn(
        `[backendSync] attempt ${attempt}/${maxAttempts}: username=${creds.username}, threw:`,
        err,
      );
      if (attempt < maxAttempts) {
        // Exponential back-off: 400ms, 800ms
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      // All attempts exhausted
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
    console.warn(
      "[backendSync] Username already registered with a different password — conflict, not retrying",
      creds.username,
    );
    return false;
  }

  return false;
}
