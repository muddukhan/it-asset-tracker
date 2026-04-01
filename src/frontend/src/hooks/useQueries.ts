import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  LocalUser,
  LocalUserInput,
  UserRole,
  UserWithRole,
} from "../backend";
import {
  useLocalAdminCreds,
  useLocalSession,
} from "../context/LocalSessionContext";
import {
  type LocalAsset,
  type LocalAssetInput,
  fileToBase64,
  localDB,
} from "../utils/localDB";
import { useActor } from "./useActor";

export type { LocalAsset, LocalAssetInput };

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
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetHistoryForAsset(assetId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["history", "asset", assetId?.toString()],
    queryFn: async () => {
      if (!actor || assetId === null) return [];
      return actor.getHistoryForAsset(assetId);
    },
    enabled: !!actor && !isFetching && assetId !== null,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const localAdminCreds = useLocalAdminCreds();
  const localSession = useLocalSession();
  return useQuery<boolean>({
    queryKey: ["isAdmin", localAdminCreds?.username],
    queryFn: async () => {
      if (localSession?.accessLevel === "admin") return true;
      if (!actor) return false;
      try {
        if (localAdminCreds) {
          return await actor.isAdminWithCreds(
            localAdminCreds.username,
            localAdminCreds.password,
          );
        }
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

export function useGetAllLocalUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<LocalUser[]>({
    queryKey: ["localUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllLocalUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddLocalUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const localAdminCreds = useLocalAdminCreds();
  return useMutation({
    mutationFn: async (input: LocalUserInput) => {
      if (!actor) throw new Error("Not connected");
      if (localAdminCreds)
        return actor.addLocalUserWithCreds(
          localAdminCreds.username,
          localAdminCreds.password,
          input,
        );
      return actor.addLocalUser(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["localUsers"] });
    },
  });
}

export function useUpdateLocalUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const localAdminCreds = useLocalAdminCreds();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: bigint; input: LocalUserInput }) => {
      if (!actor) throw new Error("Not connected");
      if (localAdminCreds)
        return actor.updateLocalUserWithCreds(
          localAdminCreds.username,
          localAdminCreds.password,
          id,
          input,
        );
      return actor.updateLocalUser(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["localUsers"] });
    },
  });
}

export function useDeleteLocalUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const localAdminCreds = useLocalAdminCreds();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      if (localAdminCreds)
        return actor.deleteLocalUserWithCreds(
          localAdminCreds.username,
          localAdminCreds.password,
          id,
        );
      return actor.deleteLocalUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["localUsers"] });
    },
  });
}
