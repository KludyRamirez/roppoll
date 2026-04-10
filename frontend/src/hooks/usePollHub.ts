import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createPollHubConnection } from "../lib/signalr";
import type { Poll } from "../types/poll";

// Connects to the SignalR hub and listens for "PollUpdated" events.
// When a poll expires on the server, this patches it in the feed cache
// so the UI transitions from Active → Expired without a page refresh.
export function usePollHub() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const connection = createPollHubConnection();

    connection.on("PollUpdated", (broadcast: Poll) => {
      // The broadcast has user-specific fields set to defaults (isCreator: false,
      // hasVoted: false, votedOptionId: null) because the server doesn't know
      // who's connected. We preserve those from the existing cache entry.
      queryClient.setQueriesData<Poll[]>({ queryKey: ["polls"] }, (old) =>
        old?.map((p) => {
          if (p.id !== broadcast.id) return p;
          return {
            ...broadcast,
            isCreator: p.isCreator,
            hasVoted: p.hasVoted,
            votedOptionId: p.votedOptionId,
          };
        }) ?? old
      );
    });

    connection.start().catch((err) =>
      console.error("SignalR connection failed:", err)
    );

    return () => {
      connection.stop();
    };
  }, [queryClient]);
}
