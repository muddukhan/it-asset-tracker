import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Asset,
  AssetInput,
  FlexHistoryEntry,
  LocalUser,
  LocalUserInput,
} from "../backend";
import { useLocalSession } from "../context/LocalSessionContext";
import { syncCredentialsToBackend } from "../utils/backendSync";
import type {
  LocalAsset,
  LocalAssetInput,
  LocalDBUser,
  LocalDBUserInput,
  LocalHistoryEntry,
} from "../utils/localDB";
import { fileToBase64 } from "../utils/localDB";
import { useActor } from "./useActor";

// Local type definitions (backend doesn't expose these — local auth only)
export enum UserRole {
  admin = "admin",
  user = "user",
  guest = "guest",
}
export interface UserWithRole {
  principal: Principal;
  role: UserRole;
}

export type {
  LocalAsset,
  LocalAssetInput,
  LocalHistoryEntry,
  LocalDBUser,
  LocalDBUserInput,
};

// ── Type transform helpers ────────────────────────────────────────────────────

/** Normalize backend status enum to display-friendly capitalized string */
function normalizeStatus(s: string): string {
  const map: Record<string, string> = {
    assigned: "Assigned",
    available: "Available",
    inRepair: "In Repair",
    inStorage: "In Storage",
    retired: "Retired",
  };
  return map[s] ?? s;
}

/** Normalize backend category enum to display-friendly capitalized string */
function normalizeCategory(c: string): string {
  const map: Record<string, string> = {
    laptop: "Laptop",
    desktop: "Desktop",
    server: "Server",
    printer: "Printer",
    monitor: "Monitor",
    peripheral: "Peripheral",
    other: "Other",
  };
  return map[c] ?? c;
}

/** Map Motoko backend Asset to the frontend LocalAsset shape */
function toFrontendAsset(a: Asset): LocalAsset {
  return {
    id: Number(a.id),
    name: a.name,
    serialNumber: a.serialNumber,
    category: normalizeCategory(a.category),
    status: normalizeStatus(a.status),
    location: a.location,
    assignedUser: a.assignedUser,
    employeeCode: a.employeeCode,
    purchaseDate: a.purchaseDate,
    warrantyDate: a.warrantyDate,
    notes: a.notes,
    processorType: a.processorType,
    ram: a.ram,
    storage: a.storage,
    assetTag: a.assetTag,
    vendorName: a.vendorName,
    invoiceNumber: a.invoiceNumber,
    windowsVersion: a.windowsVersion,
    createdAt: Number(a.createdAt),
  };
}

/** Convert display status string back to backend enum value */
function toBackendStatus(s: string): AssetInput["status"] {
  const map: Record<string, AssetInput["status"]> = {
    Assigned: "assigned" as AssetInput["status"],
    Available: "available" as AssetInput["status"],
    "In Repair": "inRepair" as AssetInput["status"],
    "In Storage": "inStorage" as AssetInput["status"],
    Retired: "retired" as AssetInput["status"],
    assigned: "assigned" as AssetInput["status"],
    available: "available" as AssetInput["status"],
    inRepair: "inRepair" as AssetInput["status"],
    inStorage: "inStorage" as AssetInput["status"],
    retired: "retired" as AssetInput["status"],
  };
  return (map[s] ?? "available") as AssetInput["status"];
}

/** Convert display category string back to backend enum value */
function toBackendCategory(c: string): AssetInput["category"] {
  const map: Record<string, AssetInput["category"]> = {
    Laptop: "laptop" as AssetInput["category"],
    Desktop: "desktop" as AssetInput["category"],
    Server: "server" as AssetInput["category"],
    Printer: "printer" as AssetInput["category"],
    Monitor: "monitor" as AssetInput["category"],
    Peripheral: "peripheral" as AssetInput["category"],
    Other: "other" as AssetInput["category"],
    laptop: "laptop" as AssetInput["category"],
    desktop: "desktop" as AssetInput["category"],
    server: "server" as AssetInput["category"],
    printer: "printer" as AssetInput["category"],
    monitor: "monitor" as AssetInput["category"],
    peripheral: "peripheral" as AssetInput["category"],
    other: "other" as AssetInput["category"],
  };
  return (map[c] ?? "other") as AssetInput["category"];
}

/** Map frontend LocalAssetInput to backend AssetInput */
function toBackendAssetInput(input: LocalAssetInput): AssetInput {
  return {
    name: input.name,
    serialNumber: input.serialNumber,
    category: toBackendCategory(input.category),
    status: toBackendStatus(input.status),
    location: input.location || "Unknown",
    assignedUser: input.assignedUser,
    employeeCode: input.employeeCode,
    purchaseDate: input.purchaseDate,
    warrantyDate: input.warrantyDate,
    notes: input.notes,
    processorType: input.processorType,
    ram: input.ram,
    storage: input.storage,
    assetTag: input.assetTag,
    vendorName: input.vendorName,
    invoiceNumber: input.invoiceNumber,
    windowsVersion: input.windowsVersion,
  };
}

/** Map backend FlexHistoryEntry to frontend LocalHistoryEntry */
function toFrontendHistory(h: FlexHistoryEntry): LocalHistoryEntry {
  return {
    id: Number(h.id),
    assetId: Number(h.assetId),
    assetName: h.assetName,
    changedBy: h.changedBy,
    fromAssignee: h.previousAssignee,
    toAssignee: h.newAssignee,
    fromStatus: "", // FlexHistoryEntry has no separate fromStatus — use empty to suppress "from → to" display
    toStatus: h.action,
    timestamp: Number(h.timestamp),
  };
}

/** Map backend LocalUser to frontend LocalDBUser */
function toFrontendUser(u: LocalUser): LocalDBUser {
  return {
    id: Number(u.id),
    name: u.name,
    username: u.username,
    password: "", // never returned from backend
    accessLevel: u.accessLevel,
    employeeCode: u.employeeCode,
    department: u.department,
    email: u.email,
    notes: u.notes,
    createdAt: 0,
  };
}

// ── Auth check helpers ────────────────────────────────────────────────────────

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

// ── Asset queries ─────────────────────────────────────────────────────────────

export function useGetAllAssets() {
  const { actor, isFetching } = useActor();
  return useQuery<LocalAsset[]>({
    queryKey: ["assets"],
    queryFn: async () => {
      if (!actor) return [];
      const assets = await actor.getAllAssets();
      return assets.map(toFrontendAsset);
    },
    enabled: !!actor && !isFetching,
    staleTime: 10_000,
  });
}

export function useFilterAssets(
  _status: string | null,
  _category: string | null,
  _location: string | null,
  _searchTerm: string | null,
) {
  return useGetAllAssets();
}

export function useGetStats() {
  const assetsQuery = useGetAllAssets();
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => {
      const assets = assetsQuery.data ?? [];
      return {
        total: BigInt(assets.length),
        assigned: BigInt(assets.filter((a) => a.status === "Assigned").length),
        available: BigInt(
          assets.filter((a) => a.status === "Available").length,
        ),
        inRepair: BigInt(assets.filter((a) => a.status === "In Repair").length),
      };
    },
    enabled: assetsQuery.isSuccess,
    staleTime: 10_000,
  });
}

export function useGetHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<LocalHistoryEntry[]>({
    queryKey: ["history"],
    queryFn: async () => {
      if (!actor) return [];
      const entries = await actor.getFlexHistory();
      return entries
        .map(toFrontendHistory)
        .sort((a, b) => b.timestamp - a.timestamp);
    },
    enabled: !!actor && !isFetching,
    staleTime: 15_000,
  });
}

export function useGetHistoryForAsset(assetId: number | null) {
  const { actor, isFetching } = useActor();
  return useQuery<LocalHistoryEntry[]>({
    queryKey: ["history", "asset", assetId?.toString()],
    queryFn: async () => {
      if (!actor || assetId === null) return [];
      const entries = await actor.getFlexHistoryForAsset(BigInt(assetId));
      return entries.map(toFrontendHistory);
    },
    enabled: !!actor && !isFetching && assetId !== null,
    staleTime: 15_000,
  });
}

export function useIsCallerAdmin() {
  const localSession = useLocalSession();
  return useQuery<boolean>({
    queryKey: ["isAdmin", localSession?.username],
    queryFn: () => localSession?.accessLevel === "admin",
    initialData: localSession?.accessLevel === "admin" ? true : undefined,
  });
}

export function useGetCallerRole() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerRole"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAssignUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: UserRole }) => {
      if (!actor) throw new Error("Not connected");
      return actor.assignCallerUserRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] });
    },
  });
}

export function useBootstrapAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!actor) throw new Error("Not connected");
      return actor.bootstrapAdmin();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["callerRole"] });
      queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] });
    },
  });
}

export function useGetAllUsersWithRoles(isAdmin: boolean) {
  const { actor, isFetching } = useActor();
  return useQuery<UserWithRole[]>({
    queryKey: ["usersWithRoles"],
    queryFn: async (): Promise<UserWithRole[]> => {
      if (!actor) return [];
      return actor.getAllUsersWithRoles() as Promise<UserWithRole[]>;
    },
    enabled: !!actor && !isFetching && isAdmin,
  });
}

// ── Asset mutations ───────────────────────────────────────────────────────────

export function useAddAsset() {
  const { actor } = useActor();
  const localSession = useLocalSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LocalAssetInput & { photoFile?: File }) => {
      if (!actor) throw new Error("Backend not ready");
      const creds = localSession;
      if (!creds?.username || !creds?.password)
        throw new Error(
          "Session expired — please log out and log back in to continue.",
        );

      // Re-sync credentials before every mutation to handle fresh deploys
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

      let photoDataUrl: string | undefined = input.photoDataUrl;
      if (input.photoFile) {
        photoDataUrl = await fileToBase64(input.photoFile);
      }
      const { photoFile: _photoFile, photoDataUrl: _pd, ...rest } = input;
      const backendInput = toBackendAssetInput({ ...rest, photoDataUrl });
      await withAuthErrorHandling(() =>
        actor.addAssetWithCreds(creds.username, creds.password, backendInput),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useUpdateAsset() {
  const { actor } = useActor();
  const localSession = useLocalSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: number;
      input: Partial<LocalAssetInput> & { photoFile?: File };
    }) => {
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

      let photoDataUrl: string | undefined = input.photoDataUrl;
      if (input.photoFile) {
        photoDataUrl = await fileToBase64(input.photoFile);
      }
      const { photoFile: _photoFile, photoDataUrl: _pd, ...rest } = input;
      const merged: LocalAssetInput = {
        name: rest.name ?? "",
        serialNumber: rest.serialNumber ?? "",
        category: rest.category ?? "Other",
        status: rest.status ?? "Available",
        location: rest.location ?? "Unknown",
        ...rest,
        photoDataUrl,
      };
      const backendInput = toBackendAssetInput(merged);
      await withAuthErrorHandling(() =>
        actor.updateAssetWithCreds(
          creds.username,
          creds.password,
          BigInt(id),
          backendInput,
        ),
      );

      // Record history entry for assignment tracking
      try {
        await actor.addHistoryEntryWithCreds(creds.username, creds.password, {
          assetId: BigInt(id),
          assetName: merged.name,
          assetType: "hardware",
          action: merged.status,
          changedBy: creds.username,
          newAssignee: merged.assignedUser,
          timestamp: BigInt(Date.now()),
        });
      } catch {
        // Non-fatal — history is best-effort
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useDeleteAsset() {
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
        actor.deleteAssetWithCreds(creds.username, creds.password, BigInt(id)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ── Local User Management ─────────────────────────────────────────────────────

export function useGetAllLocalUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<LocalDBUser[]>({
    queryKey: ["localUsers"],
    queryFn: async () => {
      if (!actor) return [];
      const users = await actor.getAllLocalUsers();
      return users.map(toFrontendUser);
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useAddLocalUser() {
  const { actor } = useActor();
  const localSession = useLocalSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LocalDBUserInput) => {
      if (!actor) throw new Error("Backend not ready");
      const creds = localSession;
      if (!creds?.username || !creds?.password)
        throw new Error(
          "Session expired — please log out and log back in to continue.",
        );

      // CRITICAL: Re-sync admin credentials to backend before adding a user.
      // This handles fresh deploys where backend has been wiped.
      const synced = await syncCredentialsToBackend(actor, {
        username: creds.username,
        password: creds.password,
        name: creds.name,
        accessLevel: creds.accessLevel,
      });
      if (!synced) {
        throw new Error(
          "Failed to sync admin credentials. Please log out and log in again.",
        );
      }

      const userInput: LocalUserInput = {
        username: input.username,
        password: input.password,
        name: input.name,
        accessLevel: input.accessLevel,
        employeeCode: input.employeeCode || "",
        department: input.department || "",
        email: input.email || "",
        notes: input.notes,
      };
      await withAuthErrorHandling(() =>
        actor.addLocalUserWithCreds(creds.username, creds.password, userInput),
      );

      // Also sync the new user's credentials so they can log in
      // and use WithCreds operations themselves
      if (input.password) {
        await syncCredentialsToBackend(actor, {
          username: input.username,
          password: input.password,
          name: input.name,
          accessLevel: input.accessLevel,
        }).catch(() => {
          // Non-fatal — user can still log in via registry
        });
      }

      // Save new user to localStorage registry as fallback for login
      saveUserToRegistry({
        userId: input.username,
        password: input.password,
        name: input.name,
        accessLevel: input.accessLevel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["localUsers"] });
    },
  });
}

export function useUpdateLocalUser() {
  const { actor } = useActor();
  const localSession = useLocalSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: number; input: LocalDBUserInput }) => {
      if (!actor) throw new Error("Backend not ready");
      const creds = localSession;
      if (!creds?.username || !creds?.password)
        throw new Error(
          "Session expired — please log out and log back in to continue.",
        );

      // Re-sync before mutation
      await syncCredentialsToBackend(actor, {
        username: creds.username,
        password: creds.password,
        name: creds.name,
        accessLevel: creds.accessLevel,
      });

      const userInput: LocalUserInput = {
        username: input.username,
        password: input.password,
        name: input.name,
        accessLevel: input.accessLevel,
        employeeCode: input.employeeCode || "",
        department: input.department || "",
        email: input.email || "",
        notes: input.notes,
      };
      await withAuthErrorHandling(() =>
        actor.updateLocalUserWithCreds(
          creds.username,
          creds.password,
          BigInt(id),
          userInput,
        ),
      );

      // Update registry if password provided
      if (input.password) {
        saveUserToRegistry({
          userId: input.username,
          password: input.password,
          name: input.name,
          accessLevel: input.accessLevel,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["localUsers"] });
    },
  });
}

export function useDeleteLocalUser() {
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

      // Re-sync before mutation
      await syncCredentialsToBackend(actor, {
        username: creds.username,
        password: creds.password,
        name: creds.name,
        accessLevel: creds.accessLevel,
      });

      await withAuthErrorHandling(() =>
        actor.deleteLocalUserWithCreds(
          creds.username,
          creds.password,
          BigInt(id),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["localUsers"] });
    },
  });
}

// ── Local User Registry ───────────────────────────────────────────────────────
// Stored in localStorage so newly-created users can log in even after backend
// restarts / redeployments.

interface RegistryUser {
  userId: string;
  password: string;
  name: string;
  accessLevel: string;
}

function getRegistry(): RegistryUser[] {
  try {
    const raw = localStorage.getItem("localUserRegistry");
    if (!raw) return [];
    return JSON.parse(raw) as RegistryUser[];
  } catch {
    return [];
  }
}

function saveUserToRegistry(user: RegistryUser): void {
  const registry = getRegistry();
  const idx = registry.findIndex((u) => u.userId === user.userId);
  if (idx >= 0) {
    registry[idx] = user;
  } else {
    registry.push(user);
  }
  localStorage.setItem("localUserRegistry", JSON.stringify(registry));
}
