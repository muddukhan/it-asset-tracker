/**
 * Stub for useActor — this app stores all data in localStorage (localDB).
 * The actor is always null; hooks that use it gracefully return defaults.
 */

// Minimal actor interface matching the methods referenced in useQueries.ts
interface ActorInterface {
  isCallerAdmin(): Promise<boolean>;
  getCallerUserRole(): Promise<unknown>;
  assignCallerUserRole(user: unknown, role: unknown): Promise<unknown>;
  bootstrapAdmin(): Promise<boolean>;
  getAllUsersWithRoles(): Promise<unknown[]>;
}

export function useActor(): {
  actor: ActorInterface | null;
  isFetching: boolean;
} {
  return {
    actor: null,
    isFetching: false,
  };
}
