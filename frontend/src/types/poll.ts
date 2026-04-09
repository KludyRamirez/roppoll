// Mirror of backend enums
export type PollStatus = "Active" | "Expired";
export type AiStatus = "Pending" | "Complete" | "Failed";

export interface PollOption {
  id: number;
  text: string;
  displayOrder: number;
  voteCount: number;
}

export interface Poll {
  id: number;
  question: string;
  durationSeconds: number;
  createdAt: string;
  expiresAt: string;
  status: PollStatus;
  aiStatus: AiStatus;

  // Creator
  creatorId: number;
  creatorEmail: string;

  // Caller-specific (only meaningful when authenticated)
  isCreator: boolean;
  hasVoted: boolean;
  votedOptionId: number | null;

  // Votes — always visible
  options: PollOption[];
  totalVotes: number;

  // AI result — only set when aiStatus === "Complete"
  aiChoiceOptionId: number | null;
  aiExplanation: string | null;
}

// Duration presets with display labels
export const DURATION_OPTIONS = [
  { label: "1 minute",  value: 60 },
  { label: "5 minutes", value: 300 },
  { label: "15 minutes",value: 900 },
  { label: "1 hour",    value: 3600 },
  { label: "24 hours",  value: 86400 },
] as const;
