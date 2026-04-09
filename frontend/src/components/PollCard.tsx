import { useNavigate } from "react-router-dom";
import type { Poll } from "../types/poll";

interface Props {
  poll: Poll;
}

// Converts seconds remaining into a readable string
function formatTimeLeft(expiresAt: string): string {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

export default function PollCard({ poll }: Props) {
  const navigate = useNavigate();
  const isExpired = poll.status === "Expired";

  return (
    <div
      onClick={() => navigate(`/polls/${poll.id}`)}
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        cursor: "pointer",
        background: "#fff",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <small style={{ color: "gray" }}>by {poll.creatorEmail}</small>
        <span
          style={{
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 12,
            background: isExpired ? "#f0f0f0" : "#e6f4ea",
            color: isExpired ? "#555" : "#1a7a32",
            fontWeight: 600,
          }}
        >
          {isExpired ? "Expired" : formatTimeLeft(poll.expiresAt)}
        </span>
      </div>

      {/* Question */}
      <p style={{ margin: "0 0 12px", fontWeight: 600, fontSize: 15 }}>{poll.question}</p>

      {/* Options preview */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {poll.options.map((opt) => (
          <span
            key={opt.id}
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: 6,
              background: "#f5f5f5",
              fontSize: 13,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {opt.text}
          </span>
        ))}
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <small style={{ color: "gray" }}>
          {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
        </small>
        <div style={{ display: "flex", gap: 8 }}>
          {poll.hasVoted && (
            <small style={{ color: "#1a7a32" }}>✓ Voted</small>
          )}
          {isExpired && poll.aiStatus === "Complete" && (
            <small style={{ color: "#7b4faf" }}>✦ AI responded</small>
          )}
        </div>
      </div>
    </div>
  );
}
