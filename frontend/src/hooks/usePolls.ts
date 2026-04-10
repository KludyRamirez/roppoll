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

// ─── Vote: POST /api/polls/:id/vote ─────────────────────────
export function useVote(pollId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (optionId: number) => {
      const { data } = await api.post<Poll>(`/polls/${pollId}/vote`, { optionId });
      return data;
    },
    onSuccess: (updatedPoll) => {
      // Update this poll inside the feed cache so vote counts reflect immediately
      queryClient.setQueriesData<Poll[]>({ queryKey: ["polls"] }, (old) =>
        old?.map((p) => (p.id === pollId ? updatedPoll : p)) ?? old
      );
    },
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
