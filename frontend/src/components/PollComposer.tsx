import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useCreatePoll } from "../hooks/usePolls";
import { useAuthStore } from "../stores/authStore";
import { DURATION_OPTIONS } from "../types/poll";

export default function PollComposer() {
  const user = useAuthStore((s) => s.user);
  const createPoll = useCreatePoll();
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [validationError, setValidationError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const username = user?.email?.split("@")[0] ?? "";

  const expand = () => {
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const cancel = () => {
    setExpanded(false);
    setQuestion("");
    setOptionA("");
    setOptionB("");
    setValidationError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (optionA.trim() === optionB.trim()) {
      setValidationError("The two options must be different.");
      return;
    }

    createPoll.mutate(
      { question, optionA, optionB, durationSeconds },
      { onSuccess: cancel },
    );
  };

  const canPost =
    question.trim().length >= 5 && optionA.trim() && optionB.trim();

  /* ── Not logged in ── */
  if (!user) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
        <div className="w-[42px] h-[42px] rounded-full bg-[var(--bg-option)] shrink-0" />
        <span className="text-[15px] text-[var(--text-muted)]">
          <Link
            to="/login"
            className="text-[var(--green)] font-semibold no-underline"
          >
            Log in
          </Link>{" "}
          to post a poll
        </span>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-b border-[var(--border)]">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-[42px] h-[42px] rounded-full bg-[var(--green-bg)] text-[var(--green)] flex items-center justify-center font-bold text-[17px] shrink-0 select-none">
          {username[0]?.toUpperCase()}
        </div>

        {/* Compose area */}
        <div className="flex-1 min-w-0">
          {/* Collapsed */}
          {!expanded && (
            <div
              onClick={expand}
              className="py-[11px] text-[16px] text-[var(--text-muted)] cursor-text select-none"
            >
              Ask a question...
            </div>
          )}

          {/* Expanded */}
          {expanded && (
            <form onSubmit={handleSubmit}>
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                required
                minLength={5}
                maxLength={300}
                rows={3}
                className="block w-full mt-0 font-[var(--sans)] text-[16px] text-[var(--text)] bg-transparent border border-[var(--border)] rounded-xl outline-none resize-none p-3 mb-4 caret-[var(--green)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />

              <div className="flex gap-2.5 mb-3.5">
                <input
                  type="text"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  placeholder="Option A"
                  required
                  maxLength={100}
                  className="flex-1 w-auto mt-0 px-[14px] py-[9px] font-[var(--sans)] text-[14px] rounded-lg border-[1px] border-[var(--border)] text-[var(--text)] focus:outline-none"
                />
                <input
                  type="text"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  placeholder="Option B"
                  required
                  maxLength={100}
                  className="flex-1 w-auto mt-0 px-[14px] py-[9px] font-[var(--sans)] text-[14px] rounded-lg border-[1px] border-[var(--border)] text-[var(--text)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2.5 flex-wrap">
                <select
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="w-[100px] mt-0 rounded-lg border-[var(--border)] text-[var(--text)] text-[14px] cursor-pointer outline-none focus:ring-0 focus:shadow-none"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancel}
                    className="px-[18px] py-2 rounded-full border-[1.5px] border-[var(--border)] bg-transparent text-[var(--text-secondary)] font-semibold text-[14px] cursor-pointer font-[var(--sans)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPoll.isPending || !canPost}
                    className="px-5 py-2 rounded-full border-0 bg-[var(--green)] text-white font-bold text-[14px] font-[var(--sans)] transition-opacity disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {createPoll.isPending ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>

              {validationError && (
                <p className="text-[var(--red)] text-[13px] mt-2.5">
                  {validationError}
                </p>
              )}

              {createPoll.isError && (
                <p className="text-[var(--red)] text-[13px] mt-2.5">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(createPoll.error as any)?.response?.data?.message ||
                    "Failed to create poll."}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
