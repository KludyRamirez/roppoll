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
    <div className="max-w-[560px] mx-auto mt-[60px] px-5">
      <h1 className="text-[26px] mb-1.5">Create a Poll</h1>
      <p className="text-[var(--text-muted)] mb-7 text-[14px]">
        Post a question with two options. When the timer expires, AI will give its opinion.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
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
          <small className="text-[var(--text-muted)] text-[12px]">{question.length}/300</small>
        </div>

        <div className="mb-4">
          <label htmlFor="optionA">Option A</label>
          <input id="optionA" type="text" value={optionA} onChange={(e) => setOptionA(e.target.value)} required maxLength={100} placeholder="e.g. Remote" />
        </div>

        <div className="mb-5">
          <label htmlFor="optionB">Option B</label>
          <input id="optionB" type="text" value={optionB} onChange={(e) => setOptionB(e.target.value)} required maxLength={100} placeholder="e.g. In-office" />
        </div>

        <div className="mb-7">
          <label htmlFor="duration">Timer Duration</label>
          <select id="duration" value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value))}>
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {validationError && (
          <p className="text-[var(--red)] mb-3 text-[14px]">{validationError}</p>
        )}

        {createPoll.isError && (
          <p className="text-[var(--red)] mb-3 text-[14px]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(createPoll.error as any)?.response?.data?.message || "Failed to create poll."}
          </p>
        )}

        <button
          type="submit"
          disabled={createPoll.isPending}
          className="px-8 py-[11px] rounded-[7px] border-0 bg-[var(--green)] text-white font-semibold text-[15px] font-[var(--sans)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {createPoll.isPending ? "Creating..." : "Create Poll"}
        </button>
      </form>
    </div>
  );
}
