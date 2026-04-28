import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GoChevronUp, GoChevronDown } from "react-icons/go";
import { PiFlagBannerFill } from "react-icons/pi";
import { useVote } from "../hooks/usePolls";
import { useAuthStore } from "../stores/authStore";
import type { Poll } from "../types/poll";

interface Props {
  poll: Poll;
}

function sc(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
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
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span
          className={`text-[13px] flex items-center gap-1.5 ${
            isChosen
              ? "font-medium text-[var(--green)]"
              : isAiChoice
                ? "font-medium text-[var(--purple)]"
                : "text-[var(--text-secondary)]"
          }`}
        >
          {sc(text)}
        </span>
        <span
          className={`text-[12px] font-medium tabular-nums ${
            isChosen
              ? "text-[var(--green)]"
              : isAiChoice
                ? "text-[var(--purple)]"
                : "text-[var(--text-muted)]"
          }`}
        >
          {pct}%
        </span>
      </div>
      <div className="bg-[var(--bg-bar)] rounded-full h-[3px] overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            isChosen
              ? "bg-[var(--green)]"
              : isAiChoice
                ? "bg-[var(--purple)]"
                : "bg-[var(--text-muted)]"
          }`}
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

  const aiOptionIndex = poll.options.findIndex(
    (o) => o.id === poll.aiChoiceOptionId,
  );

  const majorityOption =
    optionA && optionB
      ? optionA.voteCount >= optionB.voteCount
        ? optionA
        : optionB
      : null;

  const aiAgreesWithMajority =
    totalVotes > 0 &&
    poll.aiChoiceOptionId !== null &&
    majorityOption !== null &&
    poll.aiChoiceOptionId === majorityOption.id;

  const majorityPct =
    totalVotes > 0 && majorityOption
      ? Math.round((majorityOption.voteCount / totalVotes) * 100)
      : 0;

  const handleVote = (optionId: number) => {
    if (!user || poll.isCreator || poll.hasVoted || isExpired) return;
    vote.mutate(optionId);
  };

  const username = poll.creatorEmail.split("@")[0];

  return (
    <article className="border-b border-[var(--border)] px-5 py-4 flex gap-3 bg-[var(--bg-card)]">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center font-semibold text-[13px] shrink-0 select-none mt-0.5">
        {username[0].toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-[14px] text-[var(--text)] leading-none truncate">
            {username}
          </span>
          {isExpired ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-[11px] font-semibold leading-none text-[var(--text-muted)]">
                <PiFlagBannerFill className="text-[12px] mt-[-1px]" />
                <span className="">Resolved</span>
              </span>
              {poll.aiStatus === "Pending" && (
                <span className="flex gap-[3px] items-center">
                  <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          ) : (
            <span className="text-[12px] font-medium leading-none text-[var(--green)]">
              {countdown}
            </span>
          )}
        </div>

        {/* Question */}
        <p
          className="text-[15px] leading-snug text-[var(--text)] font-medium mt-2 mb-3 cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          {sc(poll.question)}
        </p>

        {/* Option pills */}
        <div className="flex gap-2 mb-3">
          {poll.options.map((opt) => {
            const isVoted = poll.votedOptionId === opt.id;
            const isAi = poll.aiChoiceOptionId === opt.id && isExpired;
            return (
              <span
                key={opt.id}
                className={`flex-1 px-3 py-[6px] rounded-md text-[13px] text-center border truncate transition-all duration-150 ${
                  isVoted
                    ? "font-medium text-[var(--bg-card)] bg-[var(--text)] border-[var(--text)]"
                    : isAi
                      ? "font-medium text-[var(--bg-card)] bg-[var(--text)] border-[var(--text)]"
                      : "text-[var(--text-secondary)] bg-transparent border-[var(--border)]"
                }`}
              >
                {sc(opt.text)}
              </span>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4">
          <span className="text-[12px] text-[var(--text-muted)]">
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-2.5 py-1 rounded-md border border-[var(--border)] bg-transparent text-[var(--text-muted)] text-[12px] cursor-pointer font-[var(--sans)] font-medium flex items-center gap-1 hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all duration-150"
          >
            {expanded ? "Hide" : "More"}
            {expanded ? (
              <GoChevronUp className="text-[11px]" />
            ) : (
              <GoChevronDown className="text-[11px]" />
            )}
          </button>
        </div>

        {/* Expanded body */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            {/* ACTIVE */}
            {!isExpired && (
              <div>
                {!user && (
                  <p className="text-[13px] text-[var(--text-muted)] mb-4">
                    <Link
                      to="/login"
                      className="text-[var(--green)] font-medium no-underline"
                    >
                      Log in
                    </Link>{" "}
                    to vote on this poll
                  </p>
                )}

                {user && poll.isCreator && (
                  <p className="text-[13px] text-[var(--text-muted)] mb-4">
                    You created this poll — you can't vote on it.
                  </p>
                )}

                {user && !poll.isCreator && !poll.hasVoted && (
                  <div className="flex gap-2 mb-4">
                    {poll.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleVote(opt.id)}
                        disabled={vote.isPending}
                        className="flex-1 py-2 rounded-md border border-[var(--border)] bg-transparent text-[var(--text)] font-medium text-[13px] font-[var(--sans)] hover:border-[var(--green)] hover:text-[var(--green)] hover:bg-[var(--green-bg)] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {sc(opt.text)}
                      </button>
                    ))}
                  </div>
                )}

                {user && poll.hasVoted && (
                  <p className="text-[13px] text-[var(--green)] font-medium mb-4 flex items-center gap-1.5">
                    <span>—</span>
                    <span>
                      You voted for{" "}
                      <strong className="font-semibold">
                        {
                          poll.options.find((o) => o.id === poll.votedOptionId)
                            ?.text
                        }
                      </strong>
                    </span>
                  </p>
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
                <p className="text-[12px] text-[var(--text-muted)] mt-1">
                  {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
                </p>
              </div>
            )}

            {/* EXPIRED */}
            {isExpired && (
              <div>
                {poll.aiStatus === "Pending" && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex gap-[3px] items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:300ms]" />
                      </span>
                      <span className="text-[13px] text-[var(--text-muted)]">
                        Ro and Plo are thinking…
                      </span>
                    </div>
                    <div className="space-y-2 animate-pulse">
                      <div className="h-2.5 bg-[var(--bg-option)] rounded-full w-3/4" />
                      <div className="h-2.5 bg-[var(--bg-option)] rounded-full w-1/2" />
                      <div className="h-2.5 bg-[var(--bg-option)] rounded-full w-2/3" />
                    </div>
                  </div>
                )}

                {poll.aiStatus === "Failed" && (
                  <p className="mb-4 text-[13px] text-[var(--red)]">
                    Ro couldn't give an opinion on this one.
                  </p>
                )}

                {poll.aiStatus === "Complete" && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
                      Results
                    </p>

                    {/* Human votes */}
                    <div className="mb-1">
                      <p className="text-[12px] text-[var(--text-muted)] mb-3">
                        Human votes
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
                      <p className="text-[12px] text-[var(--text-muted)] mt-1">
                        {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
                      </p>
                    </div>

                    <div className="h-px bg-[var(--border)] my-4" />

                    {/* AI opinion */}
                    <div className="pl-3 border-l-2 border-[var(--purple)]">
                      <p className="text-[12px] font-medium text-[var(--purple)] mb-2">
                        Ro first take
                      </p>
                      <p className="text-[14px] font-semibold text-[var(--text)] mb-1">
                        {sc(poll.options[aiOptionIndex]?.text ?? "—")}
                      </p>
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-3">
                        {poll.aiExplanation}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                          aiAgreesWithMajority
                            ? "text-[var(--green)] bg-[var(--green-bg)]"
                            : "text-[var(--orange)] bg-[var(--orange-bg)]"
                        }`}
                      >
                        {aiAgreesWithMajority
                          ? `Agrees with humans ${majorityPct}%`
                          : "Disagrees with humans"}
                      </span>
                    </div>

                    {/* Ro vs Plo debate */}
                    {poll.debateStatus === "Complete" &&
                      poll.aiDebate &&
                      poll.aiDebate.length > 0 && (
                        <>
                          <div className="h-px bg-[var(--border)] my-4" />
                          <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-3">
                            Ro vs Plo
                          </p>
                          <div className="flex flex-col gap-3">
                            {poll.aiDebate.slice(1).map((msg, i) => {
                              const isRo = msg.speaker === "Ro";
                              return (
                                <div
                                  key={i}
                                  className={`pl-3 border-l-2 ${isRo ? "border-[var(--purple)]" : "border-[var(--orange)]"}`}
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span
                                      className={`text-[11px] font-semibold ${isRo ? "text-[var(--purple)]" : "text-[var(--orange)]"}`}
                                    >
                                      {msg.speaker}
                                    </span>
                                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                                      {sc(msg.pick)}
                                    </span>
                                  </div>
                                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                                    {msg.message}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                          {(() => {
                            const last =
                              poll.aiDebate[poll.aiDebate.length - 1];
                            return (
                              <p className="mt-3 text-[16px] text-[var(--text-muted)]">
                                <span className="font-semibold text-[var(--text)]">
                                  Ro
                                </span>{" "}
                                and{" "}
                                <span className="font-semibold text-[var(--text)]">
                                  Plo
                                </span>{" "}
                                agreed on{" "}
                                <span className="font-semibold text-[var(--text)]">
                                  {sc(last.pick)}
                                </span>
                              </p>
                            );
                          })()}
                        </>
                      )}

                    {poll.debateStatus === "Failed" && (
                      <p className="text-[12px] text-[var(--red)] mt-3">
                        Ro and Plo couldn't finish their debate.
                      </p>
                    )}
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
                    <p className="text-[12px] text-[var(--text-muted)] mt-1">
                      {totalVotes} total {totalVotes === 1 ? "vote" : "votes"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {vote.isError && (
              <p className="text-[var(--red)] text-[13px] mt-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(vote.error as any)?.response?.data?.message ??
                  "Failed to vote."}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
