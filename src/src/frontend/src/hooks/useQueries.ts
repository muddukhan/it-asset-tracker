import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Asset,
  AssetCategory,
  AssetInput,
  AssetStatus,
  LocalUser,
  LocalUserInput,
  UserRole,
  UserWithRole,
} from "../backend";
import {
  useLocalAdminCreds,
  useLocalSession,
} from "../context/LocalSessionContext";
import { addToLocalUserRegistry } from "../utils/localUserRegistry";
import { useActor } from "./useActor";

export function useGetAllAssets() {
  const { actor, isFetching } = useActor();
  return useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAssets();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useFilterAssets(
  status: AssetStatus | null,
  category: AssetCategory | null,
  location: string | null,
  searchTerm: string | null,
) {
  const { actor, isFetching } = useActor();
  return useQuery<Asset[]>({
    queryKey: ["assets", "filter", status, category, location, searchTerm],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAssets();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetStats() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      if (!actor)
        return {
          total: BigInt(0),
          available: BigInt(0),
          assigned: BigInt(0),
          inRepair: BigInt(0),
        };
      return actor.getStats();
    },
    enabled: !!actor && !isFetching,
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

  // If local session already says admin, return true immediately without a backend round-trip.
  // This covers users from users.json and localStorage registry who may not be synced
  // to the backend yet.
  const isLocalAdmin = localSession?.accessLevel === "admin";

  return useQuery<boolean>({
    queryKey: ["isAdmin", localAdminCreds?.username, isLocalAdmin],
    queryFn: async () => {
      // Trust the local session first
      if (isLocalAdmin) return true;
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
    // If we already know from local session, we don't need to wait for actor
    enabled: isLocalAdmin || (!!actor && !isFetching),
    // Immediately return true if local session says admin
    initialData: isLocalAdmin ? true : undefined,
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
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const localAdminCreds = useLocalAdminCreds();
  return useMutation({
    mutationFn: async (input: AssetInput) => {
      if (!actor) throw new Error("Not connected");
      if (localAdminCreds)
        return actor.addAssetWithCreds(
          localAdminCreds.username,
          localAdminCreds.password,
          input,
        );
      return actor.addAsset(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateAsset() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const localAdminCreds = useLocalAdminCreds();
  return useMutation({
    mutationFn: async ({ id, input }: { id: bigint; input: AssetInput }) => {
      if (!actor) throw new Error("Not connected");
      if (localAdminCreds)
        return actor.updateAssetWithCreds(
          localAdminCreds.username,
          localAdminCreds.password,
          id,
          input,
        );
      return actor.updateAsset(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteAsset() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const localAdminCreds = useLocalAdminCreds();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      if (localAdminCreds)
        return actor.deleteAssetWithCreds(
          localAdminCreds.username,
          localAdminCreds.password,
          id,
        );
      return actor.deleteAsset(id);
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
      // Always save to localStorage registry so user can login even if backend restarts
      if (input.password) {
        addToLocalUserRegistry({
          userId: input.username,
          password: input.password,
          name: input.name,
          accessLevel: input.accessLevel,
        });
      }
      if (localAdminCreds) {
        try {
          return await actor.addLocalUserWithCreds(
            localAdminCreds.username,
            localAdminCreds.password,
            input,
          );
        } catch {
          // If backend fails, registry save above ensures user can still login
          return;
        }
      }
      try {
        return await actor.addLocalUser(input);
      } catch {
        // If backend fails, registry save above ensures user can still login
        return;
      }
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
