using System.Text;
using OpenAI;
using OpenAI.Chat;
using Propl.Api.Dtos;

namespace Propl.Api.Services;

public interface IOpenAiService
{
    // Returns the chosen option's index (0 or 1) and a short explanation.
    // Throws on failure — caller catches and sets AiStatus.Failed.
    Task<(int chosenIndex, string explanation)> GetOpinionAsync(
        string question, string optionA, string optionB);

    // Runs the Ro vs Plo debate. Ro's initial pick seeds the conversation.
    // They alternate until they agree or 4 turns are exhausted.
    Task<List<DebateMessage>> RunDebateAsync(
        string question, string optionA, string optionB,
        int roInitialIndex, string roInitialExplanation);
}

public class OpenAiService(IConfiguration config) : IOpenAiService
{
    public async Task<(int chosenIndex, string explanation)> GetOpinionAsync(
        string question, string optionA, string optionB)
    {
        var chat = GetChatClient();

        var prompt =
            $"""
            You are Ro, an opinionated AI with strong takes. You're about to give your hot take on a poll.
            Be confident, direct, and a little spicy — like you'd say it to a friend, not write it in a report.
            Reply in this exact format, nothing else:
            CHOICE: <A or B>
            REASON: <one punchy conversational sentence, max 20 words>

            Poll question: {question}
            Option A: {optionA}
            Option B: {optionB}
            """;

        var response = await chat.CompleteChatAsync([new UserChatMessage(prompt)]);
        var text = response.Value.Content[0].Text.Trim();
        return Parse(text);
    }

    public async Task<List<DebateMessage>> RunDebateAsync(
        string question, string optionA, string optionB,
        int roInitialIndex, string roInitialExplanation)
    {
        var chat = GetChatClient();

        var roInitialPick = roInitialIndex == 0 ? optionA : optionB;
        var messages = new List<DebateMessage>
        {
            new() { Speaker = "Ro", Pick = roInitialPick, Message = roInitialExplanation }
        };

        // Alternating speakers: Plo → Ro → Plo → … (max 10 more turns after Ro's initial)
        const int maxExtraTurns = 10;
        var speakers = Enumerable.Range(0, maxExtraTurns)
            .Select(i => i % 2 == 0 ? ("Plo", "Ro") : ("Ro", "Plo"))
            .ToArray();

        for (int i = 0; i < speakers.Length; i++)
        {
            var (speaker, opponent) = speakers[i];
            bool isFinalTurn = i == speakers.Length - 1;

            var prompt = BuildDebatePrompt(speaker, opponent, question, optionA, optionB, messages, isFinalTurn);
            var response = await chat.CompleteChatAsync([new UserChatMessage(prompt)]);
            var text = response.Value.Content[0].Text.Trim();

            var (pick, message) = ParseDebate(text, optionA, optionB);
            messages.Add(new DebateMessage { Speaker = speaker, Pick = pick, Message = message });

            // Stop as soon as the last two messages agree on the same pick
            var lastTwo = messages.TakeLast(2).ToList();
            if (lastTwo.Count == 2 && lastTwo[0].Pick == lastTwo[1].Pick)
                break;
        }

        return messages;
    }

    private static string BuildDebatePrompt(
        string speaker, string opponent,
        string question, string optionA, string optionB,
        List<DebateMessage> history, bool isFinalTurn)
    {
        var historyText = new StringBuilder();
        foreach (var msg in history)
            historyText.AppendLine($"{msg.Speaker} chose \"{msg.Pick}\": {msg.Message}");

        var finalInstruction = isFinalTurn
            ? $"This is your last chance. {opponent} made a good point — concede and agree with them. Pick the same option they last chose."
            : $"Push back on {opponent}'s last point. Be direct, even a little confrontational. Call them out by name if needed.";

        return $"""
            You are {speaker}, having a casual heated debate with {opponent} about a poll.
            Talk like a real person — not an AI giving an analysis. Use natural, conversational language.
            React directly to what {opponent} just said. Call them out, challenge their logic, or throw a little shade.
            Keep it short — one or two punchy sentences max.
            {finalInstruction}

            Poll question: {question}
            Option A: {optionA}
            Option B: {optionB}

            Conversation so far:
            {historyText.ToString().Trim()}

            Reply in this exact format, nothing else:
            PICK: <{optionA} or {optionB}>
            SAY: <your response, conversational, max 25 words>
            """;
    }

    private static (string pick, string message) ParseDebate(string text, string optionA, string optionB)
    {
        var lines = text.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var pickLine = lines.FirstOrDefault(l => l.StartsWith("PICK:", StringComparison.OrdinalIgnoreCase));
        var sayLine = lines.FirstOrDefault(l => l.StartsWith("SAY:", StringComparison.OrdinalIgnoreCase));

        if (pickLine is null || sayLine is null)
            throw new FormatException($"Unexpected debate response format: {text}");

        var pickValue = pickLine["PICK:".Length..].Trim();
        var message = sayLine["SAY:".Length..].Trim();

        // Normalize to one of the two option texts
        var pick = pickValue.Equals(optionA, StringComparison.OrdinalIgnoreCase) ? optionA : optionB;

        return (pick, message);
    }

    private ChatClient GetChatClient()
    {
        var apiKey = config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI:ApiKey is not configured.");
        return new OpenAIClient(apiKey).GetChatClient("gpt-4o-mini");
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
