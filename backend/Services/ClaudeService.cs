using Anthropic.SDK;
using Anthropic.SDK.Constants;
using Anthropic.SDK.Messaging;

namespace RopPoll.Api.Services;

public interface IClaudeService
{
    // Returns the chosen option's index (0 or 1) and a short explanation.
    // Throws on failure — caller catches and sets AiStatus.Failed.
    Task<(int chosenIndex, string explanation)> GetOpinionAsync(
        string question, string optionA, string optionB);
}

public class ClaudeService(IConfiguration config) : IClaudeService
{
    public async Task<(int chosenIndex, string explanation)> GetOpinionAsync(
        string question, string optionA, string optionB)
    {
        var apiKey = config["Claude:ApiKey"]
            ?? throw new InvalidOperationException("Claude:ApiKey is not configured.");

        var client = new AnthropicClient(apiKey);

        var prompt =
            $"""
            You are participating in a two-option poll. Pick EXACTLY ONE of the two options below.
            Reply in this exact format, nothing else:
            CHOICE: <A or B>
            REASON: <one punchy sentence, max 20 words>

            Poll question: {question}
            Option A: {optionA}
            Option B: {optionB}
            """;

        var parameters = new MessageParameters
        {
            Model = AnthropicModels.Claude45Haiku,
            MaxTokens = 100,
            Messages = [new Message(RoleType.User, prompt)]
        };

        var response = await client.Messages.GetClaudeMessageAsync(parameters);
        var text = response.Message.ToString()?.Trim() ?? "";
        return Parse(text);
    }

    private static (int chosenIndex, string explanation) Parse(string text)
    {
        // Expected format:
        //   CHOICE: A
        //   REASON: Dogs are loyal companions that offer unconditional love.
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var choiceLine = lines.FirstOrDefault(l => l.StartsWith("CHOICE:", StringComparison.OrdinalIgnoreCase));
        var reasonLine = lines.FirstOrDefault(l => l.StartsWith("REASON:", StringComparison.OrdinalIgnoreCase));

        if (choiceLine is null || reasonLine is null)
            throw new FormatException($"Unexpected response format: {text}");

        var choice = choiceLine["CHOICE:".Length..].Trim().ToUpperInvariant();
        var reason = reasonLine["REASON:".Length..].Trim();

        int index = choice switch
        {
            "A" => 0,
            "B" => 1,
            _ => throw new FormatException($"Unknown choice '{choice}'")
        };

        return (index, reason);
    }
}
