using Microsoft.EntityFrameworkCore;
using Propl.Api.Models;

namespace Propl.Api.Data;

// DbContext is EF Core's main class. It represents a session with the database.
// Each DbSet<T> maps to a table in PostgreSQL.
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Poll> Polls => Set<Poll>();
    public DbSet<PollOption> PollOptions => Set<PollOption>();
    public DbSet<Vote> Votes => Set<Vote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Ensure email is unique at the database level (not just application level)
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Index on the token string for fast lookups during refresh
        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.Token);

        // Index on the reset token for fast lookups
        modelBuilder.Entity<PasswordResetToken>()
            .HasIndex(prt => prt.Token);

        // One user can have many polls
        modelBuilder.Entity<Poll>()
            .HasOne(p => p.Creator)
            .WithMany()
            .HasForeignKey(p => p.CreatorId)
            .OnDelete(DeleteBehavior.Cascade);

        // One poll has exactly 2 options
        modelBuilder.Entity<PollOption>()
            .HasOne(o => o.Poll)
            .WithMany(p => p.Options)
            .HasForeignKey(o => o.PollId)
            .OnDelete(DeleteBehavior.Cascade);

        // One user can only vote once per poll — enforced at the DB level
        modelBuilder.Entity<Vote>()
            .HasIndex(v => new { v.PollId, v.VoterId })
            .IsUnique();

        modelBuilder.Entity<Vote>()
            .HasOne(v => v.Poll)
            .WithMany(p => p.Votes)
            .HasForeignKey(v => v.PollId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Vote>()
            .HasOne(v => v.Option)
            .WithMany(o => o.Votes)
            .HasForeignKey(v => v.OptionId)
            .OnDelete(DeleteBehavior.Restrict);

        // Index on ExpiresAt for fast expiry queries (used by background service)
        modelBuilder.Entity<Poll>()
            .HasIndex(p => p.ExpiresAt);

        // Index on Status for filtering active vs expired polls
        modelBuilder.Entity<Poll>()
            .HasIndex(p => p.Status);
    }
}
