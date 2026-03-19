import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Asset,
  AssetCategory,
  AssetInput,
  AssetStatus,
  UserRole,
  UserWithRole,
} from "../backend";
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
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
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
  return useMutation({
    mutationFn: async (input: AssetInput) => {
      if (!actor) throw new Error("Not connected");
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
  return useMutation({
    mutationFn: async ({ id, input }: { id: bigint; input: AssetInput }) => {
      if (!actor) throw new Error("Not connected");
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
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteAsset(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
