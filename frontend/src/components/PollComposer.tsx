import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useCreatePoll } from "../hooks/usePolls";
import { useAuthStore } from "../stores/authStore";
import { DURATION_OPTIONS } from "../types/poll";

const pillInput: React.CSSProperties = {
  flex: 1,
  width: "auto",
  marginTop: 0,
  padding: "9px 14px",
  borderRadius: 99,
  border: "1.5px solid var(--border)",
  background: "var(--bg-option)",
  color: "var(--text)",
  fontSize: 14,
  fontFamily: "var(--sans)",
  outline: "none",
  display: "block",
};

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

  const canPost = question.trim().length >= 5 && optionA.trim() && optionB.trim();

  /* ── Not logged in ── */
  if (!user) {
    return (
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "var(--bg-option)", flexShrink: 0,
        }} />
        <span style={{ fontSize: 15, color: "var(--text-muted)" }}>
          <Link to="/login" style={{ color: "var(--green)", fontWeight: 600, textDecoration: "none" }}>
            Log in
          </Link>{" "}
          to post a poll
        </span>
      </div>
    );
  }

  return (
    <div style={{
      padding: "16px 20px",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", gap: 12 }}>

        {/* Avatar */}
        <div style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "var(--green-bg)", color: "var(--green)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 17, flexShrink: 0,
          userSelect: "none",
        }}>
          {username[0]?.toUpperCase()}
        </div>

        {/* Compose area */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Collapsed: placeholder tap target */}
          {!expanded && (
            <div
              onClick={expand}
              style={{
                padding: "11px 0",
                fontSize: 18,
                color: "var(--text-muted)",
                cursor: "text",
                borderBottom: "1px solid var(--border-subtle)",
                userSelect: "none",
              }}
            >
              Ask a question...
            </div>
          )}

          {/* Expanded: full form */}
          {expanded && (
            <form onSubmit={handleSubmit}>

              {/* Question textarea — transparent, borderless */}
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                required
                minLength={5}
                maxLength={300}
                rows={3}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 0,
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  borderRadius: 0,
                  outline: "none",
                  fontSize: 18,
                  color: "var(--text)",
                  fontFamily: "var(--sans)",
                  lineHeight: 1.5,
                  resize: "none",
                  padding: "4px 0 12px",
                  marginBottom: 14,
                  caretColor: "var(--green)",
                }}
              />

              {/* Option pills */}
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <input
                  type="text"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  placeholder="Option A"
                  required
                  maxLength={100}
                  style={pillInput}
                />
                <input
                  type="text"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  placeholder="Option B"
                  required
                  maxLength={100}
                  style={pillInput}
                />
              </div>

              {/* Footer row: duration + actions */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}>
                <select
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  style={{
                    width: "auto",
                    marginTop: 0,
                    padding: "7px 14px",
                    borderRadius: 99,
                    border: "1.5px solid var(--border)",
                    background: "var(--bg-option)",
                    color: "var(--text)",
                    fontSize: 13,
                    fontFamily: "var(--sans)",
                    cursor: "pointer",
                  }}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={cancel}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 99,
                      border: "1.5px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPoll.isPending || !canPost}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 99,
                      border: "none",
                      background: "var(--green)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: createPoll.isPending || !canPost ? "not-allowed" : "pointer",
                      opacity: createPoll.isPending || !canPost ? 0.6 : 1,
                      fontFamily: "var(--sans)",
                      transition: "opacity 0.15s",
                    }}
                  >
                    {createPoll.isPending ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>

              {validationError && (
                <p style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>
                  {validationError}
                </p>
              )}

              {createPoll.isError && (
                <p style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(createPoll.error as any)?.response?.data?.message || "Failed to create poll."}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
