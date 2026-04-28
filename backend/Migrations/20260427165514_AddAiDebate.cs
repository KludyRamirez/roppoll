using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Propl.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAiDebate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AiDebate",
                table: "Polls",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DebateStatus",
                table: "Polls",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AiDebate",
                table: "Polls");

            migrationBuilder.DropColumn(
                name: "DebateStatus",
                table: "Polls");
        }
    }
}
