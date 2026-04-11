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
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 20px 40px" }}>

      {/* ── Nav bar ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>RopPoll</h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={toggle}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            style={{
              padding: "7px 10px",
              borderRadius: 99,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text)",
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          {user ? (
            <>
              <small style={{ color: "var(--text-muted)", fontSize: 13 }}>{user.email}</small>
              <button
                onClick={() => logout.mutate()}
                style={{
                  padding: "7px 14px",
                  borderRadius: 99,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--sans)",
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <Link to="/login">
                <button style={{
                  padding: "7px 16px",
                  borderRadius: 99,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text)",
                  fontFamily: "var(--sans)",
                }}>
                  Log in
                </button>
              </Link>
              <Link to="/register">
                <button style={{
                  padding: "7px 16px",
                  borderRadius: 99,
                  border: "none",
                  background: "var(--green)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "var(--sans)",
                }}>
                  Sign up
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Feed column ── */}
      <div style={{
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--bg-card)",
      }}>

        {/* Tab header */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            flex: 1,
            textAlign: "center",
            padding: "16px 0 14px",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text)",
            borderBottom: "2px solid var(--green)",
          }}>
            For you
          </div>
        </div>

        {/* Inline composer */}
        <PollComposer />

        {/* Loading */}
        {isLoading && (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px 20px" }}>
            Loading polls...
          </p>
        )}

        {/* Error */}
        {isError && (
          <p style={{ color: "var(--red)", textAlign: "center", padding: "40px 20px" }}>
            Failed to load polls. Is the backend running?
          </p>
        )}

        {/* Empty */}
        {polls && polls.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <p style={{ fontSize: 16, marginBottom: 12 }}>No polls yet.</p>
            {user ? (
              <Link to="/polls/new" style={{ color: "var(--green)", fontWeight: 600 }}>
                Create the first one →
              </Link>
            ) : (
              <Link to="/register" style={{ color: "var(--green)", fontWeight: 600 }}>
                Register to create the first one →
              </Link>
            )}
          </div>
        )}

        {/* Posts */}
        {polls?.map((poll) => (
          <PollCard key={poll.id} poll={poll} />
        ))}
      </div>
    </div>
  );
}
