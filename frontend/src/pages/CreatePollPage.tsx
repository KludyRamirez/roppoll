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
  const [durationSeconds, setDurationSeconds] = useState(300); // default: 5 min
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
      {
        onSuccess: (poll) => {
          // Redirect to the new poll's detail page
          navigate(`/polls/${poll.id}`);
        },
      }
    );
  };

  return (
    <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 20px" }}>
      <h1>Create a Poll</h1>
      <p style={{ color: "gray", marginBottom: 24 }}>
        Post a question with two options. When the timer expires, Claude will give its opinion.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Question */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="question" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
            Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            minLength={5}
            maxLength={300}
            rows={3}
            placeholder="e.g. Is it better to work remote or in-office?"
            style={{ display: "block", width: "100%", padding: 10, fontSize: 15, resize: "vertical" }}
          />
          <small style={{ color: "gray" }}>{question.length}/300</small>
        </div>

        {/* Option A */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="optionA" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
            Option A
          </label>
          <input
            id="optionA"
            type="text"
            value={optionA}
            onChange={(e) => setOptionA(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g. Remote"
            style={{ display: "block", width: "100%", padding: 10, fontSize: 15 }}
          />
        </div>

        {/* Option B */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="optionB" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
            Option B
          </label>
          <input
            id="optionB"
            type="text"
            value={optionB}
            onChange={(e) => setOptionB(e.target.value)}
            required
            maxLength={100}
            placeholder="e.g. In-office"
            style={{ display: "block", width: "100%", padding: 10, fontSize: 15 }}
          />
        </div>

        {/* Duration */}
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="duration" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
            Timer Duration
          </label>
          <select
            id="duration"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
            style={{ display: "block", width: "100%", padding: 10, fontSize: 15 }}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {validationError && (
          <p style={{ color: "red", marginBottom: 12 }}>{validationError}</p>
        )}

        {createPoll.isError && (
          <p style={{ color: "red", marginBottom: 12 }}>
            {(createPoll.error as any)?.response?.data?.message || "Failed to create poll."}
          </p>
        )}

        <button
          type="submit"
          disabled={createPoll.isPending}
          style={{ padding: "10px 28px", fontSize: 15, cursor: "pointer" }}
        >
          {createPoll.isPending ? "Creating..." : "Create Poll"}
        </button>
      </form>
    </div>
  );
}
