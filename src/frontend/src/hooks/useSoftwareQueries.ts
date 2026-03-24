import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoreSoftware, StoreSoftwareInput } from "../backend";
import { useActor } from "./useActor";

export function useGetAllSoftware() {
  const { actor, isFetching } = useActor();
  return useQuery<StoreSoftware[]>({
    queryKey: ["software"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllSoftware();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddSoftware() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StoreSoftwareInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.addSoftware(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
    },
  });
}

export function useUpdateSoftware() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: bigint; input: StoreSoftwareInput }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateSoftware(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
    },
  });
}

export function useDeleteSoftware() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteSoftware(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
    },
  });
}
