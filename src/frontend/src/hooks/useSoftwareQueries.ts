import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { StoreSoftware, StoreSoftwareInput } from "../backend";
import { useLocalSession } from "../context/LocalSessionContext";
import { awaitCredSync, syncCredentialsToBackend } from "../utils/backendSync";
import type { LocalSoftware, LocalSoftwareInput } from "../utils/localDB";
import { getActorWithRetry, resetActor, useActor } from "./useActor";

export type { LocalSoftware, LocalSoftwareInput };

// ── localStorage fallback storage ─────────────────────────────────────────────
const LS_SOFTWARE_KEY = "brandscapes_software";

function readLocalSoftware(): LocalSoftware[] {
  try {
    return JSON.parse(localStorage.getItem(LS_SOFTWARE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLocalSoftware(items: LocalSoftware[]): void {
  localStorage.setItem(LS_SOFTWARE_KEY, JSON.stringify(items));
}

function nextLocalId(items: { id: number }[]): number {
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

function addSoftwareLocally(input: LocalSoftwareInput): void {
  const items = readLocalSoftware();
  const newItem: LocalSoftware = {
    ...input,
    id: nextLocalId(items),
    createdAt: Date.now(),
  };
  writeLocalSoftware([...items, newItem]);
  toast.warning("Saved locally — backend sync will retry automatically");
}

function updateSoftwareLocally(
  id: number,
  input: Partial<LocalSoftwareInput>,
): void {
  const items = readLocalSoftware();
  const idx = items.findIndex((s) => s.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...input };
    writeLocalSoftware(items);
  }
  toast.warning("Saved locally — backend sync will retry automatically");
}

function deleteSoftwareLocally(id: number): void {
  const items = readLocalSoftware();
  writeLocalSoftware(items.filter((s) => s.id !== id));
  toast.warning("Deleted locally — backend sync will retry automatically");
}

/**
 * Attempt to get a live actor, resetting the cache and retrying if the
 * currently-cached actor is null (e.g. after a silent init failure).
 */
async function ensureActor(currentActor: import("../backend").Backend | null) {
  if (currentActor) return currentActor;
  console.warn(
    "[useSoftwareQueries] Actor is null — resetting cache and retrying…",
  );
  resetActor();
  return getActorWithRetry(5);
}

/**
 * Attempt to call a WithCreds backend function.
 * If it fails with an auth error, reset the actor, re-sync credentials, and retry once.
 */
async function withCredRetry<T>(
  actor: import("../backend").Backend,
  creds: {
    username: string;
    password: string;
    name: string;
    accessLevel: string;
  },
  fn: (a: import("../backend").Backend) => Promise<T>,
): Promise<T> {
  try {
    return await fn(actor);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isAuth =
      msg.includes("Unauthorized") ||
      msg.includes("unauthorized") ||
      msg.includes("Invalid credentials") ||
      msg.includes("not authenticated") ||
      msg.includes("trap");
    if (!isAuth) throw err;
    console.warn(
      "[useSoftwareQueries] Auth error — resetting actor and re-syncing for retry",
    );
    resetActor();
    const freshActor = await getActorWithRetry(5);
    await syncCredentialsToBackend(freshActor, creds).catch(() => {});
    return await fn(freshActor);
  }
}

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

// ── Queries ───────────────────────────────────────────────────────────────────

export function useGetAllSoftware() {
  const { actor, isFetching } = useActor();
  return useQuery<LocalSoftware[]>({
    queryKey: ["software"],
    queryFn: async () => {
      if (!actor) {
        // Backend unavailable — return from localStorage fallback
        return readLocalSoftware();
      }
      try {
        const items = await actor.getAllSoftware();
        return items.map(toFrontendSoftware);
      } catch {
        // Backend call failed — return from localStorage fallback
        return readLocalSoftware();
      }
    },
    enabled: !isFetching,
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
      const creds = localSession;
      if (!creds?.username || !creds?.password)
        throw new Error(
          "Session expired — please log out and log back in to continue.",
        );

      // Await startup credential sync (eliminates race condition after login)
      await awaitCredSync().catch(() => {});

      const resolvedActor = await ensureActor(actor).catch(() => null);
      if (!resolvedActor) {
        addSoftwareLocally(input);
        return;
      }

      // Re-sync credentials before mutation (ensures backend has the creds)
      await syncCredentialsToBackend(resolvedActor, {
        username: creds.username,
        password: creds.password,
        name: creds.name,
        accessLevel: creds.accessLevel,
      }).catch(() => {});

      const backendInput = toBackendSoftwareInput(input);
      try {
        await withCredRetry(resolvedActor, creds, (a) =>
          a.addSoftwareWithCreds(creds.username, creds.password, backendInput),
        );
      } catch (err) {
        console.warn(
          "[useAddSoftware] Backend call failed — saving locally:",
          err,
        );
        addSoftwareLocally(input);
      }
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
      const creds = localSession;
      if (!creds?.username || !creds?.password)
        throw new Error(
          "Session expired — please log out and log back in to continue.",
        );

      const resolvedActor = await ensureActor(actor).catch(() => null);
      if (!resolvedActor) {
        updateSoftwareLocally(id, input);
        return;
      }

      // Re-sync credentials before mutation (non-blocking)
      await syncCredentialsToBackend(resolvedActor, {
        username: creds.username,
        password: creds.password,
        name: creds.name,
        accessLevel: creds.accessLevel,
      }).catch(() => {});

      const backendInput = toBackendSoftwareInput(input);
      try {
        await withCredRetry(resolvedActor, creds, (a) =>
          a.updateSoftwareWithCreds(
            creds.username,
            creds.password,
            BigInt(id),
            backendInput,
          ),
        );
      } catch (err) {
        console.warn(
          "[useUpdateSoftware] Backend call failed — saving locally:",
          err,
        );
        updateSoftwareLocally(id, input);
      }

      // Record history entry for software transfer tracking
      try {
        await resolvedActor.addHistoryEntryWithCreds(
          creds.username,
          creds.password,
          {
            assetId: BigInt(id),
            assetName: input.name,
            assetType: "software",
            action: "updated",
            changedBy: creds.username,
            newAssignee: input.assignedTo,
            timestamp: BigInt(Date.now()),
          },
        );
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
      const creds = localSession;
      if (!creds?.username || !creds?.password)
        throw new Error(
          "Session expired — please log out and log back in to continue.",
        );

      const resolvedActor = await ensureActor(actor).catch(() => null);
      if (!resolvedActor) {
        deleteSoftwareLocally(id);
        return;
      }

      // Re-sync credentials before mutation (non-blocking)
      await syncCredentialsToBackend(resolvedActor, {
        username: creds.username,
        password: creds.password,
        name: creds.name,
        accessLevel: creds.accessLevel,
      }).catch(() => {});

      try {
        await withCredRetry(resolvedActor, creds, (a) =>
          a.deleteSoftwareWithCreds(creds.username, creds.password, BigInt(id)),
        );
      } catch (err) {
        console.warn(
          "[useDeleteSoftware] Backend call failed — deleting locally:",
          err,
        );
        deleteSoftwareLocally(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
    },
  });
}
