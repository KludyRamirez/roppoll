using OpenAI;
using OpenAI.Chat;

namespace RopPoll.Api.Services;

public interface IOpenAiService
{
    // Returns the chosen option's index (0 or 1) and a short explanation.
    // Throws on failure — caller catches and sets AiStatus.Failed.
    Task<(int chosenIndex, string explanation)> GetOpinionAsync(
        string question, string optionA, string optionB);
}

public class OpenAiService(IConfiguration config) : IOpenAiService
{
    public async Task<(int chosenIndex, string explanation)> GetOpinionAsync(
        string question, string optionA, string optionB)
    {
        var apiKey = config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI:ApiKey is not configured.");

        var client = new OpenAIClient(apiKey);
        var chat = client.GetChatClient("gpt-4o-mini");

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

        var response = await chat.CompleteChatAsync([new UserChatMessage(prompt)]);
        var text = response.Value.Content[0].Text.Trim();
        return Parse(text);
    }

    internal static (int chosenIndex, string explanation) Parse(string text)
    {
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
