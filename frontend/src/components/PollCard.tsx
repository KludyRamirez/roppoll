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

function VoteBar({ text, votes, total, isChosen, isAiChoice }: {
  text: string; votes: number; total: number; isChosen: boolean; isAiChoice: boolean;
}) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;

  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-center mb-[5px]">
        <span className={`text-[13px] flex items-center gap-1.5 ${isChosen ? "font-semibold text-[var(--green)]" : isAiChoice ? "font-normal text-[var(--purple)]" : "font-normal text-[var(--text)]"}`}>
          {isChosen && <span className="text-[11px]">✓</span>}
          {isAiChoice && <span className="text-[12px]">🤖</span>}
          {text}
        </span>
        <span className={`text-[12px] font-semibold ${isChosen ? "text-[var(--green)]" : isAiChoice ? "text-[var(--purple)]" : "text-[var(--text-muted)]"}`}>
          {pct}%
        </span>
      </div>
      <div className="bg-[var(--bg-bar)] rounded-full h-[5px] overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isChosen ? "bg-[var(--green)]" : isAiChoice ? "bg-[var(--purple)]" : "bg-[var(--text-muted)]"}`}
          style={{ width: `${pct}%` }}
        />
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

  const username = poll.creatorEmail.split("@")[0];

  return (
    <article className="border-b border-[var(--border)] px-5 py-4 flex gap-3 bg-[var(--bg-card)]">

      {/* Avatar */}
      <div className="w-[42px] h-[42px] rounded-full bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center font-bold text-[17px] shrink-0 select-none">
        {username[0].toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">

        {/* Header */}
        <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
          <span className="font-bold text-[15px] text-[var(--text)]">{username}</span>
          <span className="text-[14px] text-[var(--text-muted)]">{poll.creatorEmail}</span>
          <span className="text-[14px] text-[var(--text-muted)]">·</span>
          <span className={`text-[11px] font-bold tracking-[0.4px] uppercase px-2 py-[2px] rounded-full ${isExpired ? "bg-[var(--bg-option)] text-[var(--text-muted)]" : "bg-[var(--green-bg)] text-[var(--green)]"}`}>
            {isExpired ? "Ended" : countdown}
          </span>
        </div>

        {/* Question */}
        <p className="text-[15px] leading-[1.55] text-[var(--text)] font-normal mb-3.5">
          {poll.question}
        </p>

        {/* Option pills */}
        <div className="flex gap-2 mb-3.5">
          {poll.options.map((opt) => {
            const isVoted = poll.votedOptionId === opt.id;
            const isAi = poll.aiChoiceOptionId === opt.id && isExpired;
            return (
              <span
                key={opt.id}
                className={`flex-1 px-3 py-[7px] rounded-full text-[13px] text-center overflow-hidden text-ellipsis whitespace-nowrap transition-all duration-150 border-[1.5px] ${
                  isVoted
                    ? "font-semibold text-[var(--green)] bg-[var(--bg-option-voted)] border-[var(--green)]"
                    : isAi
                    ? "font-medium text-[var(--purple)] bg-[var(--bg-option-ai)] border-[var(--purple)]"
                    : "font-medium text-[var(--text-secondary)] bg-[var(--bg-option)] border-transparent"
                }`}
              >
                {opt.text}
              </span>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-5">
          <span className="text-[13px] text-[var(--text-muted)]">
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="bg-transparent border-0 p-0 text-[var(--text-muted)] text-[13px] cursor-pointer font-[var(--sans)] flex items-center gap-1 font-medium"
          >
            {expanded ? "Less" : "More"}
            <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* Expanded body */}
        {expanded && (
          <div className="mt-[18px]">

            {/* ACTIVE */}
            {!isExpired && (
              <div>
                {!user && (
                  <div className="text-center py-3.5 pb-5 text-[var(--text-muted)] text-[14px]">
                    <Link to="/login" className="text-[var(--green)] font-semibold no-underline">
                      Log in
                    </Link>{" "}
                    to vote on this poll
                  </div>
                )}

                {user && poll.isCreator && (
                  <p className="text-[13px] text-[var(--text-muted)] mb-5 px-3.5 py-2.5 bg-[var(--bg-option)] rounded-[10px]">
                    You created this poll — you can't vote on it.
                  </p>
                )}

                {user && !poll.isCreator && !poll.hasVoted && (
                  <div className="flex gap-2.5 mb-5">
                    {poll.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleVote(opt.id)}
                        disabled={vote.isPending}
                        className="flex-1 py-[11px] rounded-full border-[1.5px] border-[var(--green)] bg-transparent text-[var(--green)] font-semibold text-[14px] font-[var(--sans)] transition-[background,color] duration-150 hover:bg-[var(--green)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                )}

                {user && poll.hasVoted && (
                  <div className="flex items-center gap-2 mb-5 px-3.5 py-2.5 bg-[var(--green-bg)] rounded-[10px] border border-[var(--green)]">
                    <span className="text-[15px]">✓</span>
                    <span className="text-[13px] text-[var(--green)] font-medium">
                      You voted for{" "}
                      <strong>{poll.options.find((o) => o.id === poll.votedOptionId)?.text}</strong>
                    </span>
                  </div>
                )}

                {poll.options.map((opt) => (
                  <VoteBar
                    key={opt.id} text={opt.text} votes={opt.voteCount} total={totalVotes}
                    isChosen={poll.votedOptionId === opt.id} isAiChoice={false}
                  />
                ))}
                <span className="text-[12px] text-[var(--text-muted)]">
                  {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
                </span>
              </div>
            )}

            {/* EXPIRED */}
            {isExpired && (
              <div>
                {poll.aiStatus === "Pending" && (
                  <div className="flex items-center gap-2.5 px-3.5 py-3 bg-[var(--bg-option)] rounded-[10px] mb-5 text-[13px] text-[var(--text-muted)]">
                    <span>🤖</span>
                    <span>Waiting for AI's opinion…</span>
                  </div>
                )}

                {poll.aiStatus === "Failed" && (
                  <div className="px-3.5 py-3 bg-[var(--bg-option)] rounded-[10px] mb-5 text-[13px] text-[var(--red)]">
                    ⚠ AI couldn't give an opinion on this one.
                  </div>
                )}

                {poll.aiStatus === "Complete" && (
                  <div className="mb-5">
                    <p className="text-[11px] font-bold tracking-[0.6px] uppercase text-[var(--text-muted)] mb-3">
                      Results
                    </p>

                    {/* Human votes */}
                    <div className="bg-[var(--bg-muted)] rounded-xl px-4 py-3.5 mb-3">
                      <p className="text-[12px] font-bold text-[var(--text-secondary)] tracking-[0.2px] mb-3">
                        👥 Human votes
                      </p>
                      {poll.options.map((opt) => (
                        <VoteBar
                          key={opt.id} text={opt.text} votes={opt.voteCount} total={totalVotes}
                          isChosen={poll.votedOptionId === opt.id} isAiChoice={false}
                        />
                      ))}
                      <span className="text-[12px] text-[var(--text-muted)]">
                        {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
                      </span>
                    </div>

                    {/* AI opinion */}
                    <div className="rounded-xl px-4 py-3.5 bg-[var(--bg-ai-panel)] border-l-[3px] border-[var(--purple)]">
                      <p className="text-[12px] font-bold text-[var(--purple)] tracking-[0.2px] mb-2.5">
                        🤖 AI's take
                      </p>
                      <p className="text-[14px] font-semibold text-[var(--text)] mb-1.5">
                        {poll.options[aiOptionIndex]?.text ?? "—"}
                      </p>
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed italic mb-3">
                        "{poll.aiExplanation}"
                      </p>
                      <span className={`inline-block text-[11px] font-bold tracking-[0.2px] px-2.5 py-1 rounded-full ${aiAgreesWithMajority ? "bg-[var(--green-bg)] text-[var(--green)]" : "bg-[var(--orange-bg)] text-[var(--orange)]"}`}>
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
                        key={opt.id} text={opt.text} votes={opt.voteCount} total={totalVotes}
                        isChosen={poll.votedOptionId === opt.id} isAiChoice={false}
                      />
                    ))}
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {vote.isError && (
              <p className="text-[var(--red)] text-[13px] mt-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(vote.error as any)?.response?.data?.message ?? "Failed to vote."}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
