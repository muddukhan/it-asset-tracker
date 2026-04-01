import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type LocalSoftware,
  type LocalSoftwareInput,
  localDB,
} from "../utils/localDB";

export type { LocalSoftware, LocalSoftwareInput };

export function useGetAllSoftware() {
  return useQuery<LocalSoftware[]>({
    queryKey: ["software"],
    queryFn: () => localDB.getAllSoftware(),
    staleTime: 0,
  });
}

export function useAddSoftware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LocalSoftwareInput) => {
      return localDB.addSoftware(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
    },
  });
}

export function useUpdateSoftware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: number; input: LocalSoftwareInput }) => {
      const result = localDB.updateSoftware(id, input);
      if (!result) throw new Error("Software not found");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
    },
  });
}

export function useDeleteSoftware() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return localDB.deleteSoftware(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software"] });
    },
  });
}
