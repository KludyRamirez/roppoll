import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useVote } from "../hooks/usePolls";
import { useAuthStore } from "../stores/authStore";
import type { Poll } from "../types/poll";

interface Props {
  poll: Poll;
}

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
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: isChosen ? 600 : 400,
          color: isChosen ? "var(--green)" : isAiChoice ? "var(--purple)" : "var(--text)",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}>
          {isChosen && <span style={{ fontSize: 11 }}>✓</span>}
          {isAiChoice && <span style={{ fontSize: 12 }}>🤖</span>}
          {text}
        </span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: isChosen ? "var(--green)" : isAiChoice ? "var(--purple)" : "var(--text-muted)",
          letterSpacing: "0.2px",
        }}>
          {pct}%
        </span>
      </div>
      <div style={{
        background: "var(--bg-bar)",
        borderRadius: 99,
        height: 6,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: isChosen
            ? "var(--green)"
            : isAiChoice
            ? "var(--purple)"
            : "var(--text-muted)",
          borderRadius: 99,
          transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}

export default function PollCard({ poll }: Props) {
  const [expanded, setExpanded] = useState(false);
  const user = useAuthStore((s) => s.user);
  const vote = useVote(poll.id);
  const isExpired = poll.status === "Expired";
  const countdown = useCountdown(poll.expiresAt, isExpired);

  const totalVotes = poll.totalVotes;
  const optionA = poll.options[0];
  const optionB = poll.options[1];

  const aiOptionIndex = poll.options.findIndex((o) => o.id === poll.aiChoiceOptionId);

  const majorityOption =
    optionA && optionB
      ? optionA.voteCount >= optionB.voteCount ? optionA : optionB
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
    <div style={{
      borderRadius: 16,
      marginBottom: 16,
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      overflow: "hidden",
      transition: "box-shadow 0.15s ease",
    }}>

      {/* ── Header (always visible) ── */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ padding: "18px 20px 16px", cursor: "pointer" }}
      >
        {/* Top row: creator + status */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}>
          <span style={{
            fontSize: 12,
            color: "var(--text-muted)",
            fontWeight: 500,
            letterSpacing: "0.1px",
          }}>
            {poll.creatorEmail}
          </span>

          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.4px",
            textTransform: "uppercase",
            padding: "3px 10px",
            borderRadius: 99,
            background: isExpired ? "var(--bg-option)" : "var(--green-bg)",
            color: isExpired ? "var(--text-muted)" : "var(--green)",
          }}>
            {isExpired ? "Ended" : countdown}
          </span>
        </div>

        {/* Question */}
        <p style={{
          margin: "0 0 14px",
          fontWeight: 600,
          fontSize: 15,
          lineHeight: 1.5,
          color: "var(--text)",
          letterSpacing: "-0.1px",
        }}>
          {poll.question}
        </p>

        {/* Option pills + footer */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {poll.options.map((opt) => {
            const isVoted = poll.votedOptionId === opt.id;
            const isAi = poll.aiChoiceOptionId === opt.id && isExpired;
            return (
              <span key={opt.id} style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: 99,
                fontSize: 13,
                fontWeight: isVoted ? 600 : 500,
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: isVoted
                  ? "var(--green)"
                  : isAi
                  ? "var(--purple)"
                  : "var(--text-secondary)",
                background: isVoted
                  ? "var(--bg-option-voted)"
                  : isAi
                  ? "var(--bg-option-ai)"
                  : "var(--bg-option)",
                border: isVoted
                  ? "1.5px solid var(--green)"
                  : isAi
                  ? "1.5px solid var(--purple)"
                  : "1.5px solid transparent",
                transition: "all 0.15s ease",
              }}>
                {opt.text}
              </span>
            );
          })}
        </div>

        {/* Footer: vote count + expand */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </span>
          <span style={{
            fontSize: 11,
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontWeight: 500,
          }}>
            {expanded ? "Less" : "More"}
            <span style={{ fontSize: 10 }}>{expanded ? "▲" : "▼"}</span>
          </span>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{
          padding: "20px 20px 20px",
          borderTop: "1px solid var(--border-subtle)",
        }}>

          {/* ── ACTIVE ── */}
          {!isExpired && (
            <div>
              {!user && (
                <div style={{
                  textAlign: "center",
                  padding: "14px 0 20px",
                  color: "var(--text-muted)",
                  fontSize: 14,
                }}>
                  <Link to="/login" style={{
                    color: "var(--green)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}>
                    Log in
                  </Link>{" "}
                  to vote on this poll
                </div>
              )}

              {user && poll.isCreator && (
                <p style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 20,
                  padding: "10px 14px",
                  background: "var(--bg-option)",
                  borderRadius: 10,
                }}>
                  You created this poll — you can't vote on it.
                </p>
              )}

              {user && !poll.isCreator && !poll.hasVoted && (
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  {poll.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleVote(opt.id)}
                      disabled={vote.isPending}
                      style={{
                        flex: 1,
                        padding: "11px 0",
                        borderRadius: 10,
                        border: "2px solid var(--green)",
                        background: "transparent",
                        color: "var(--green)",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: vote.isPending ? "not-allowed" : "pointer",
                        opacity: vote.isPending ? 0.5 : 1,
                        fontFamily: "var(--sans)",
                        transition: "background 0.15s, color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!vote.isPending) {
                          (e.target as HTMLButtonElement).style.background = "var(--green)";
                          (e.target as HTMLButtonElement).style.color = "#fff";
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.background = "transparent";
                        (e.target as HTMLButtonElement).style.color = "var(--green)";
                      }}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}

              {user && poll.hasVoted && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 20,
                  padding: "10px 14px",
                  background: "var(--green-bg)",
                  borderRadius: 10,
                  border: "1px solid var(--green)",
                }}>
                  <span style={{ fontSize: 15 }}>✓</span>
                  <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>
                    You voted for{" "}
                    <strong>{poll.options.find((o) => o.id === poll.votedOptionId)?.text}</strong>
                  </span>
                </div>
              )}

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

              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
              </span>
            </div>
          )}

          {/* ── EXPIRED ── */}
          {isExpired && (
            <div>

              {poll.aiStatus === "Pending" && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  background: "var(--bg-option)",
                  borderRadius: 10,
                  marginBottom: 20,
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}>
                  <span>🤖</span>
                  <span>Waiting for AI's opinion…</span>
                </div>
              )}

              {poll.aiStatus === "Failed" && (
                <div style={{
                  padding: "12px 14px",
                  background: "var(--bg-option)",
                  borderRadius: 10,
                  marginBottom: 20,
                  fontSize: 13,
                  color: "var(--red)",
                }}>
                  ⚠ AI couldn't give an opinion on this one.
                </div>
              )}

              {poll.aiStatus === "Complete" && (
                <div style={{ marginBottom: 20 }}>

                  {/* Section label */}
                  <p style={{
                    margin: "0 0 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}>
                    Results
                  </p>

                  {/* Human votes */}
                  <div style={{
                    background: "var(--bg-muted)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 12,
                  }}>
                    <p style={{
                      margin: "0 0 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-secondary)",
                      letterSpacing: "0.2px",
                    }}>
                      👥 Human votes
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
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
                    </span>
                  </div>

                  {/* AI opinion */}
                  <div style={{
                    borderRadius: 12,
                    padding: "14px 16px",
                    background: "var(--bg-ai-panel)",
                    borderLeft: "3px solid var(--purple)",
                  }}>
                    <p style={{
                      margin: "0 0 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--purple)",
                      letterSpacing: "0.2px",
                    }}>
                      🤖 AI's take
                    </p>
                    <p style={{
                      margin: "0 0 6px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}>
                      {poll.options[aiOptionIndex]?.text ?? "—"}
                    </p>
                    <p style={{
                      margin: "0 0 12px",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      fontStyle: "italic",
                    }}>
                      "{poll.aiExplanation}"
                    </p>
                    <span style={{
                      display: "inline-block",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.2px",
                      padding: "4px 10px",
                      borderRadius: 99,
                      background: aiAgreesWithMajority ? "var(--green-bg)" : "var(--orange-bg)",
                      color: aiAgreesWithMajority ? "var(--green)" : "var(--orange)",
                    }}>
                      {aiAgreesWithMajority
                        ? `✅ Agrees with humans · ${majorityOption ? Math.round((majorityOption.voteCount / totalVotes) * 100) : 0}%`
                        : "⚡ Disagrees with humans"}
                    </span>
                  </div>
                </div>
              )}

              {poll.aiStatus !== "Complete" && (
                <div>
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
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
                  </span>
                </div>
              )}
            </div>
          )}

          {vote.isError && (
            <p style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(vote.error as any)?.response?.data?.message ?? "Failed to vote."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
