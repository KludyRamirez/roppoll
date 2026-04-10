import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreatePoll } from "../hooks/usePolls";
import { DURATION_OPTIONS } from "../types/poll";

export default function CreatePollPage() {
  const navigate = useNavigate();
  const createPoll = useCreatePoll();

  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [validationError, setValidationError] = useState("");

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setValidationError("");

    if (optionA.trim() === optionB.trim()) {
      setValidationError("The two options must be different.");
      return;
    }

    createPoll.mutate(
      { question, optionA, optionB, durationSeconds },
      { onSuccess: () => navigate("/") },
    );
  };

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Create a Poll</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 14 }}>
        Post a question with two options. When the timer expires, AI will give its opinion.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="question">Question</label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            minLength={5}
            maxLength={300}
            rows={3}
            placeholder="e.g. Is it better to work remote or in-office?"
          />
          <small style={{ color: "var(--text-muted)", fontSize: 12 }}>{question.length}/300</small>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="optionA">Option A</label>
          <input
            id="optionA"
            type="text"
            value={optionA}
            onChange={(e) => setOptionA(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g. Remote"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="optionB">Option B</label>
          <input
            id="optionB"
            type="text"
            value={optionB}
            onChange={(e) => setOptionB(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g. In-office"
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label htmlFor="duration">Timer Duration</label>
          <select
            id="duration"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {validationError && (
          <p style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>{validationError}</p>
        )}

        {createPoll.isError && (
          <p style={{ color: "var(--red)", marginBottom: 12, fontSize: 14 }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(createPoll.error as any)?.response?.data?.message || "Failed to create poll."}
          </p>
        )}

        <button
          type="submit"
          disabled={createPoll.isPending}
          style={{
            padding: "11px 32px",
            borderRadius: 7,
            border: "none",
            background: "var(--green)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            cursor: createPoll.isPending ? "not-allowed" : "pointer",
            opacity: createPoll.isPending ? 0.7 : 1,
            fontFamily: "var(--sans)",
          }}
        >
          {createPoll.isPending ? "Creating..." : "Create Poll"}
        </button>
      </form>
    </div>
  );
}
