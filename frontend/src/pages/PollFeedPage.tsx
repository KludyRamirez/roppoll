import { Link } from "react-router-dom";
import { usePollFeed } from "../hooks/usePolls";
import { useAuthStore } from "../stores/authStore";
import PollCard from "../components/PollCard";

export default function PollFeedPage() {
  const user = useAuthStore((s) => s.user);
  const { data: polls, isLoading, isError } = usePollFeed();

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>RopPoll</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {user ? (
            <>
              <small style={{ color: "gray" }}>{user.email}</small>
              <Link to="/polls/new">
                <button style={{ padding: "8px 16px", cursor: "pointer" }}>
                  + New Poll
                </button>
              </Link>
            </>
          ) : (
            <Link to="/login">
              <button style={{ padding: "8px 16px", cursor: "pointer" }}>
                Login to vote
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Feed */}
      {isLoading && <p style={{ color: "gray" }}>Loading polls...</p>}

      {isError && (
        <p style={{ color: "red" }}>Failed to load polls. Is the backend running?</p>
      )}

      {polls && polls.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "gray" }}>
          <p>No polls yet.</p>
          {user && (
            <Link to="/polls/new">Create the first one!</Link>
          )}
        </div>
      )}

      {polls && polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} />
      ))}
    </div>
  );
}
