import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoreSoftware, StoreSoftwareInput } from "../backend";
import { useLocalSession } from "../context/LocalSessionContext";
import { syncCredentialsToBackend } from "../utils/backendSync";
import type { LocalSoftware, LocalSoftwareInput } from "../utils/localDB";
import { useActor } from "./useActor";

export type { LocalSoftware, LocalSoftwareInput };

// ── Type transform helpers ────────────────────────────────────────────────────

function toFrontendSoftware(s: StoreSoftware): LocalSoftware {
  return {
    id: Number(s.id),
    name: s.name,
    vendor: s.vendor,
    purchaseDate: s.purchaseDate,
    licenseExpiry: s.licenseExpiry,
    licenseKey: s.licenseKey,
    licenseType: s.licenseType,
    notes: s.notes,
    assignedTo: s.assignedTo,
    assetTag: s.assetTag,
    invoiceNumber: s.invoiceNumber,
    createdAt: Number(s.createdAt),
  };
}

function toBackendSoftwareInput(input: LocalSoftwareInput): StoreSoftwareInput {
  return {
    name: input.name,
    vendor: input.vendor,
    purchaseDate: input.purchaseDate,
    licenseExpiry: input.licenseExpiry,
    licenseKey: input.licenseKey,
    licenseType: input.licenseType,
    notes: input.notes,
    assignedTo: input.assignedTo,
    assetTag: input.assetTag,
    invoiceNumber: input.invoiceNumber,
  };
}

/** Check if an error from the backend is an auth/unauthorized failure */
function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Unauthorized") ||
    msg.includes("unauthorized") ||
    msg.includes("trap") ||
    msg.includes("Invalid credentials") ||
    msg.includes("not authenticated")
  );
}

/** Wrap a backend call and convert auth errors to a friendly message */
async function withAuthErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isAuthError(err)) {
      throw new Error("Session expired. Please log out and log back in.");
    }
    throw err;
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useGetAllSoftware() {
  const { actor, isFetching } = useActor();
  return useQuery<LocalSoftware[]>({
    queryKey: ["software"],
    queryFn: async () => {
      if (!actor) return [];
      const items = await actor.getAllSoftware();
      return items.map(toFrontendSoftware);
    },
    enabled: !!actor && !isFetching,
    staleTime: 10_000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useAddSoftware() {
  const { actor } = useActor();
  const localSession = useLocalSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LocalSoftwareInput) => {
      if (!actor) throw new Error("Backend not ready");
      const creds = localSession;
      if (!creds?.username || !creds?.password)
        throw new Error(
          "Session expired — please log out and log back in to continue.",
        );

      // Re-sync credentials before mutation to handle fresh deploys
      const synced = await syncCredentialsToBackend(actor, {
        username: creds.username,
        password: creds.password,
        name: creds.name,
        accessLevel: creds.accessLevel,
      });
      if (!synced) {
        throw new Error(
          "Failed to sync credentials. Please log out and log back in.",
        );
      }

      const backendInput = toBackendSoftwareInput(input);
      await withAuthErrorHandling(() =>
        actor.addSoftwareWithCreds(
          creds.username,
          creds.password,
          backendInput,
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
    },
  });
}

export function useUpdateSoftware() {
  const { actor } = useActor();
  const localSession = useLocalSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: number; input: LocalSoftwareInput }) => {
      if (!actor) throw new Error("Backend not ready");
      const creds = localSession;
      if (!creds?.username || !creds?.password)
        throw new Error(
          "Session expired — please log out and log back in to continue.",
        );

      // Re-sync credentials before mutation
      await syncCredentialsToBackend(actor, {
        username: creds.username,
        password: creds.password,
        name: creds.name,
        accessLevel: creds.accessLevel,
      });

      const backendInput = toBackendSoftwareInput(input);
      await withAuthErrorHandling(() =>
        actor.updateSoftwareWithCreds(
          creds.username,
          creds.password,
          BigInt(id),
          backendInput,
        ),
      );

      // Record history entry for software transfer tracking
      try {
        await actor.addHistoryEntryWithCreds(creds.username, creds.password, {
          assetId: BigInt(id),
          assetName: input.name,
          assetType: "software",
          action: "updated",
          changedBy: creds.username,
          newAssignee: input.assignedTo,
          timestamp: BigInt(Date.now()),
        });
      } catch {
        // Non-fatal
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useDeleteSoftware() {
  const { actor } = useActor();
  const localSession = useLocalSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      if (!actor) throw new Error("Backend not ready");
      const creds = localSession;
      if (!creds?.username || !creds?.password)
        throw new Error(
          "Session expired — please log out and log back in to continue.",
        );

      // Re-sync credentials before mutation
      await syncCredentialsToBackend(actor, {
        username: creds.username,
        password: creds.password,
        name: creds.name,
        accessLevel: creds.accessLevel,
      });

      await withAuthErrorHandling(() =>
        actor.deleteSoftwareWithCreds(
          creds.username,
          creds.password,
          BigInt(id),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
    },
  });
}
