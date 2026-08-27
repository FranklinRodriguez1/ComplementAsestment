"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProfile, updateProfile } from "@/lib/api/api";
import { queryKeys } from "./keys";

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile(), profile);
    },
  });
}
