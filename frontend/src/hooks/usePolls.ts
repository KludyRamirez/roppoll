import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import type { Poll } from "../types/poll";

// ─── Feed: GET /api/polls ────────────────────────────────────
export function usePollFeed(page = 1) {
  return useQuery<Poll[]>({
    queryKey: ["polls", page],
    queryFn: async () => {
      const { data } = await api.get("/polls", { params: { page, pageSize: 20 } });
      return data;
    },
    staleTime: 30_000, // Consider feed fresh for 30 seconds
  });
}

// ─── Single poll: GET /api/polls/:id ─────────────────────────
export function usePoll(id: number) {
  return useQuery<Poll>({
    queryKey: ["poll", id],
    queryFn: async () => {
      const { data } = await api.get(`/polls/${id}`);
      return data;
    },
    staleTime: 10_000,
  });
}

// ─── Create poll: POST /api/polls ────────────────────────────
export function useCreatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      question: string;
      optionA: string;
      optionB: string;
      durationSeconds: number;
    }) => {
      const { data } = await api.post<Poll>("/polls", payload);
      return data;
    },
    onSuccess: () => {
      // Invalidate the feed so the new poll appears immediately
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}
