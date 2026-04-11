import { Link } from "react-router-dom";
import { usePollFeed } from "../hooks/usePolls";
import { useAuthStore } from "../stores/authStore";
import { useLogout } from "../hooks/useAuth";
import { usePollHub } from "../hooks/usePollHub";
import { useThemeStore } from "../stores/themeStore";
import PollCard from "../components/PollCard";
import PollComposer from "../components/PollComposer";

export default function PollFeedPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: polls, isLoading, isError } = usePollFeed();
  const { theme, toggle } = useThemeStore();
  usePollHub();

  return (
    <div className="max-w-[620px] mx-auto px-5 pt-5 pb-10">

      {/* Nav */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-[var(--text)]">RopPoll</h1>

        <div className="flex gap-2 items-center">
          <button
            onClick={toggle}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="px-2.5 py-[7px] rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] cursor-pointer text-[15px] leading-none"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          {user ? (
            <>
              <small className="text-[var(--text-muted)] text-[13px]">{user.email}</small>
              <button
                onClick={() => logout.mutate()}
                className="px-[14px] py-[7px] rounded-full border border-[var(--border)] bg-[var(--bg-card)] cursor-pointer text-[13px] text-[var(--text-secondary)] font-[var(--sans)]"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login">
                <button className="px-4 py-[7px] rounded-full border border-[var(--border)] bg-[var(--bg-card)] cursor-pointer text-[13px] text-[var(--text)] font-[var(--sans)]">
                  Log in
                </button>
              </Link>
              <Link to="/register">
                <button className="px-4 py-[7px] rounded-full border-0 bg-[var(--green)] text-white font-bold cursor-pointer text-[13px] font-[var(--sans)]">
                  Sign up
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Feed column */}
      <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">

        {/* Tab header */}
        <div className="flex border-b border-[var(--border)]">
          <div className="flex-1 text-center py-4 pb-[14px] text-[15px] font-bold text-[var(--text)] border-b-2 border-[var(--green)]">
            For you
          </div>
        </div>

        {/* Inline composer */}
        <PollComposer />

        {/* Loading */}
        {isLoading && (
          <p className="text-[var(--text-muted)] text-center px-5 py-10">Loading polls...</p>
        )}

        {/* Error */}
        {isError && (
          <p className="text-[var(--red)] text-center px-5 py-10">
            Failed to load polls. Is the backend running?
          </p>
        )}

        {/* Empty */}
        {polls && polls.length === 0 && (
          <div className="text-center px-5 py-[60px] text-[var(--text-muted)]">
            <p className="text-[16px] mb-3">No polls yet.</p>
            {user ? (
              <Link to="/polls/new" className="text-[var(--green)] font-semibold">
                Create the first one →
              </Link>
            ) : (
              <Link to="/register" className="text-[var(--green)] font-semibold">
                Register to create the first one →
              </Link>
            )}
          </div>
        )}

        {polls?.map((poll) => (
          <PollCard key={poll.id} poll={poll} />
        ))}
      </div>
    </div>
  );
}
