import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useVote } from "../hooks/usePolls";
import { useAuthStore } from "../stores/authStore";
import type { Poll } from "../types/poll";

interface Props {
  poll: Poll;
}

// ─── Timer hook ───────────────────────────────────────────────
// Ticks every second and returns a formatted string.
// Returns null once the poll has expired.
function useCountdown(expiresAt: string, isExpired: boolean) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (isExpired) return;

    const tick = () => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      const s = Math.floor(diff / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (h > 0) setLabel(`${h}h ${m}m left`);
      else if (m > 0) setLabel(`${m}m ${sec}s left`);
      else setLabel(`${sec}s left`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, isExpired]);

  return label;
}

// ─── Vote bar ─────────────────────────────────────────────────
function VoteBar({
  text,
  votes,
  total,
  isChosen,
  isAiChoice,
}: {
  text: string;
  votes: number;
  total: number;
  isChosen: boolean;
  isAiChoice: boolean;
}) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
        <span style={{ fontWeight: isChosen ? 700 : 400 }}>
          {isChosen && "✓ "}
          {isAiChoice && "🤖 "}
          {text}
        </span>
        <span style={{ color: "#555" }}>
          {pct}% · {votes} {votes === 1 ? "vote" : "votes"}
        </span>
      </div>
      <div style={{ background: "#eee", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: isChosen ? "#1a7a32" : isAiChoice ? "#7b4faf" : "#aaa",
            borderRadius: 4,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main PollCard ────────────────────────────────────────────
export default function PollCard({ poll }: Props) {
  const [expanded, setExpanded] = useState(false);
  const user = useAuthStore((s) => s.user);
  const vote = useVote(poll.id);
  const isExpired = poll.status === "Expired";
  const countdown = useCountdown(poll.expiresAt, isExpired);

  const totalVotes = poll.totalVotes;
  const optionA = poll.options[0];
  const optionB = poll.options[1];

  // Determine which option Claude picked (for highlighting)
  const aiOptionIndex = poll.options.findIndex(
    (o) => o.id === poll.aiChoiceOptionId
  );

  // Human majority option
  const majorityOption =
    optionA && optionB
      ? optionA.voteCount >= optionB.voteCount
        ? optionA
        : optionB
      : null;

  const aiAgreesWithMajority =
    poll.aiChoiceOptionId !== null &&
    majorityOption !== null &&
    poll.aiChoiceOptionId === majorityOption.id;

  const handleVote = (optionId: number) => {
    if (!user || poll.isCreator || poll.hasVoted || isExpired) return;
    vote.mutate(optionId);
  };

  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: 10,
        marginBottom: 14,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      {/* ── Collapsed header (always visible) ── */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ padding: "14px 16px", cursor: "pointer" }}
      >
        {/* Top row: creator + status badge */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <small style={{ color: "#888" }}>by {poll.creatorEmail}</small>
          <span
            style={{
              fontSize: 12,
              padding: "2px 9px",
              borderRadius: 12,
              background: isExpired ? "#f0f0f0" : "#e6f4ea",
              color: isExpired ? "#666" : "#1a7a32",
              fontWeight: 600,
            }}
          >
            {isExpired ? "Expired" : countdown}
          </span>
        </div>

        {/* Question */}
        <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>
          {poll.question}
        </p>

        {/* Option chips + vote count + expand toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {poll.options.map((opt) => (
            <span
              key={opt.id}
              style={{
                flex: 1,
                padding: "5px 10px",
                borderRadius: 6,
                background:
                  poll.votedOptionId === opt.id ? "#e6f4ea" :
                  poll.aiChoiceOptionId === opt.id && isExpired ? "#f3eeff" :
                  "#f5f5f5",
                fontSize: 13,
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                border:
                  poll.votedOptionId === opt.id ? "1px solid #1a7a32" :
                  poll.aiChoiceOptionId === opt.id && isExpired ? "1px solid #7b4faf" :
                  "1px solid transparent",
              }}
            >
              {opt.text}
            </span>
          ))}
          <small style={{ color: "#888", whiteSpace: "nowrap" }}>
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </small>
          <span style={{ color: "#aaa", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f0f0f0" }}>

          {/* ── ACTIVE: show vote buttons or state message ── */}
          {!isExpired && (
            <div style={{ marginTop: 14 }}>
              {!user && (
                // Guest — prompt to log in
                <div style={{ textAlign: "center", padding: "10px 0 14px", color: "#888", fontSize: 14 }}>
                  <Link to="/login" style={{ color: "#1a7a32", fontWeight: 600 }}>
                    Login
                  </Link>{" "}
                  to vote on this poll
                </div>
              )}

              {user && poll.isCreator && (
                <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
                  You created this poll — you can't vote on it.
                </p>
              )}

              {user && !poll.isCreator && !poll.hasVoted && (
                // Vote buttons
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  {poll.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleVote(opt.id)}
                      disabled={vote.isPending}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 8,
                        border: "2px solid #1a7a32",
                        background: "#fff",
                        color: "#1a7a32",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: vote.isPending ? "not-allowed" : "pointer",
                        opacity: vote.isPending ? 0.6 : 1,
                      }}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}

              {user && poll.hasVoted && (
                <p style={{ fontSize: 13, color: "#1a7a32", marginBottom: 12 }}>
                  ✓ You voted for{" "}
                  <strong>
                    {poll.options.find((o) => o.id === poll.votedOptionId)?.text}
                  </strong>
                </p>
              )}

              {/* Live vote bars — always shown when expanded and active */}
              {poll.options.map((opt) => (
                <VoteBar
                  key={opt.id}
                  text={opt.text}
                  votes={opt.voteCount}
                  total={totalVotes}
                  isChosen={poll.votedOptionId === opt.id}
                  isAiChoice={false}
                />
              ))}
              <small style={{ color: "#aaa" }}>{totalVotes} total votes</small>
            </div>
          )}

          {/* ── EXPIRED: show results ── */}
          {isExpired && (
            <div style={{ marginTop: 14 }}>

              {/* AI still thinking */}
              {poll.aiStatus === "Pending" && (
                <p style={{ fontSize: 13, color: "#888", marginBottom: 14 }}>
                  🤖 Waiting for Claude's opinion...
                </p>
              )}

              {/* AI failed */}
              {poll.aiStatus === "Failed" && (
                <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 14 }}>
                  ⚠ Claude couldn't give an opinion on this one.
                </p>
              )}

              {/* Human vs AI — two column panel */}
              {poll.aiStatus === "Complete" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 14,
                  }}
                >
                  {/* Left: Human votes */}
                  <div
                    style={{
                      background: "#f9f9f9",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 13 }}>
                      👥 Humans voted
                    </p>
                    {poll.options.map((opt) => (
                      <VoteBar
                        key={opt.id}
                        text={opt.text}
                        votes={opt.voteCount}
                        total={totalVotes}
                        isChosen={poll.votedOptionId === opt.id}
                        isAiChoice={false}
                      />
                    ))}
                    <small style={{ color: "#aaa" }}>{totalVotes} total votes</small>
                  </div>

                  {/* Right: AI opinion */}
                  <div
                    style={{
                      background: "#f9f4ff",
                      borderRadius: 8,
                      padding: 12,
                      borderLeft: "3px solid #7b4faf",
                    }}
                  >
                    <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 13 }}>
                      🤖 Claude's take
                    </p>
                    <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600 }}>
                      Picked:{" "}
                      <span style={{ color: "#7b4faf" }}>
                        {poll.options[aiOptionIndex]?.text ?? "—"}
                      </span>
                    </p>
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: "#444", lineHeight: 1.5 }}>
                      "{poll.aiExplanation}"
                    </p>
                    {/* Agreement verdict */}
                    <span
                      style={{
                        fontSize: 12,
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontWeight: 600,
                        background: aiAgreesWithMajority ? "#e6f4ea" : "#fff3e0",
                        color: aiAgreesWithMajority ? "#1a7a32" : "#e65100",
                      }}
                    >
                      {aiAgreesWithMajority
                        ? `✅ Agrees with majority (${majorityOption ? Math.round((majorityOption.voteCount / totalVotes) * 100) : 0}% picked this)`
                        : `⚡ Disagrees with majority`}
                    </span>
                  </div>
                </div>
              )}

              {/* Show bars even if AI is still pending/failed */}
              {poll.aiStatus !== "Complete" &&
                poll.options.map((opt) => (
                  <VoteBar
                    key={opt.id}
                    text={opt.text}
                    votes={opt.voteCount}
                    total={totalVotes}
                    isChosen={poll.votedOptionId === opt.id}
                    isAiChoice={false}
                  />
                ))}
              {poll.aiStatus !== "Complete" && (
                <small style={{ color: "#aaa" }}>{totalVotes} total votes</small>
              )}
            </div>
          )}

          {/* Vote error */}
          {vote.isError && (
            <p style={{ color: "#c0392b", fontSize: 13, marginTop: 8 }}>
              {(vote.error as any)?.response?.data?.message ?? "Failed to vote."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
