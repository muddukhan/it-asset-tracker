import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserRole, UserWithRole } from "../backend";
import { useLocalSession } from "../context/LocalSessionContext";
import {
  type LocalAsset,
  type LocalAssetInput,
  type LocalDBUser,
  type LocalDBUserInput,
  type LocalHistoryEntry,
  fileToBase64,
  localDB,
} from "../utils/localDB";
import { useActor } from "./useActor";

export type {
  LocalAsset,
  LocalAssetInput,
  LocalHistoryEntry,
  LocalDBUser,
  LocalDBUserInput,
};

export function useGetAllAssets() {
  return useQuery<LocalAsset[]>({
    queryKey: ["assets"],
    queryFn: () => localDB.getAllAssets(),
    staleTime: 0,
  });
}

export function useFilterAssets(
  _status: string | null,
  _category: string | null,
  _location: string | null,
  _searchTerm: string | null,
) {
  return useQuery<LocalAsset[]>({
    queryKey: ["assets"],
    queryFn: () => localDB.getAllAssets(),
    staleTime: 0,
  });
}

export function useGetStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => {
      const s = localDB.getStats();
      return {
        total: BigInt(s.total),
        available: BigInt(s.available),
        assigned: BigInt(s.assigned),
        inRepair: BigInt(s.inRepair),
      };
    },
    staleTime: 0,
  });
}

export function useGetHistory() {
  return useQuery({
    queryKey: ["history"],
    queryFn: () => localDB.getHistory(),
    staleTime: 0,
  });
}

export function useGetHistoryForAsset(assetId: number | null) {
  return useQuery({
    queryKey: ["history", "asset", assetId?.toString()],
    queryFn: () => {
      if (assetId === null) return [];
      return localDB.getHistory().filter((e) => e.assetId === assetId);
    },
    enabled: assetId !== null,
    staleTime: 0,
  });
}

export function useIsCallerAdmin() {
  const localSession = useLocalSession();
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin", localSession?.username],
    queryFn: async () => {
      if (localSession?.accessLevel === "admin") return true;
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    initialData: localSession?.accessLevel === "admin" ? true : undefined,
    enabled: localSession?.accessLevel !== "admin" && !!actor && !isFetching,
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
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsersWithRoles();
    },
    enabled: !!actor && !isFetching && isAdmin,
  });
}

export function useAddAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LocalAssetInput & { photoFile?: File }) => {
      let photoDataUrl: string | undefined = input.photoDataUrl;
      if (input.photoFile) {
        photoDataUrl = await fileToBase64(input.photoFile);
      }
      const { photoFile: _photoFile, ...rest } = input;
      return localDB.addAsset({ ...rest, photoDataUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: number; input: LocalAssetInput & { photoFile?: File } }) => {
      let photoDataUrl: string | undefined = input.photoDataUrl;
      if (input.photoFile) {
        photoDataUrl = await fileToBase64(input.photoFile);
      }
      const { photoFile: _photoFile, ...rest } = input;
      return localDB.updateAsset(id, { ...rest, photoDataUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return localDB.deleteAsset(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

// ── Local User Management ──
// All local user operations use localDB (localStorage) directly.
// This is intentional: the backend canister loses state on every deployment,
// making credential-based auth unreliable. localStorage is permanent.

export function useGetAllLocalUsers() {
  return useQuery<LocalDBUser[]>({
    queryKey: ["localUsers"],
    queryFn: () => localDB.getAllUsers(),
    staleTime: 0,
  });
}

export function useAddLocalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LocalDBUserInput) => {
      return localDB.addUser(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["localUsers"] });
    },
  });
}

export function useUpdateLocalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: number; input: LocalDBUserInput }) => {
      const result = localDB.updateUser(id, input);
      if (!result) throw new Error("User not found");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["localUsers"] });
    },
  });
}

export function useDeleteLocalUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const ok = localDB.deleteUser(id);
      if (!ok) throw new Error("User not found");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["localUsers"] });
    },
  });
}
