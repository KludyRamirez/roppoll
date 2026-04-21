using Propl.Api.Services;

namespace Propl.Tests.Services;

public class OpenAiServiceTests
{
    // ─── Happy path ───────────────────────────────────────────

    [Fact]
    public void Parse_ChoiceA_ReturnsIndex0()
    {
        var text = "CHOICE: A\nREASON: Pizza is universally loved and endlessly versatile.";
        var (index, reason) = OpenAiService.Parse(text);
        Assert.Equal(0, index);
        Assert.Equal("Pizza is universally loved and endlessly versatile.", reason);
    }

    [Fact]
    public void Parse_ChoiceB_ReturnsIndex1()
    {
        var text = "CHOICE: B\nREASON: Burgers are juicy, satisfying, and iconic.";
        var (index, reason) = OpenAiService.Parse(text);
        Assert.Equal(1, index);
        Assert.Equal("Burgers are juicy, satisfying, and iconic.", reason);
    }

    [Fact]
    public void Parse_LowercaseChoice_StillWorks()
    {
        var text = "choice: a\nreason: Remote work saves time and boosts flexibility.";
        var (index, reason) = OpenAiService.Parse(text);
        Assert.Equal(0, index);
        Assert.Equal("Remote work saves time and boosts flexibility.", reason);
    }

    [Fact]
    public void Parse_ExtraWhitespace_Trimmed()
    {
        var text = "CHOICE:  B  \nREASON:  Dogs are loyal and loving companions.  ";
        var (index, reason) = OpenAiService.Parse(text);
        Assert.Equal(1, index);
        Assert.Equal("Dogs are loyal and loving companions.", reason);
    }

    [Fact]
    public void Parse_LinesInAnyOrder_StillWorks()
    {
        // REASON before CHOICE
        var text = "REASON: Cats are independent and low-maintenance.\nCHOICE: A";
        var (index, _) = OpenAiService.Parse(text);
        Assert.Equal(0, index);
    }

    // ─── Error cases ──────────────────────────────────────────

    [Fact]
    public void Parse_MissingChoiceLine_Throws()
    {
        var text = "REASON: Some reason here.";
        Assert.Throws<FormatException>(() => OpenAiService.Parse(text));
    }

    [Fact]
    public void Parse_MissingReasonLine_Throws()
    {
        var text = "CHOICE: A";
        Assert.Throws<FormatException>(() => OpenAiService.Parse(text));
    }

    [Fact]
    public void Parse_UnknownChoice_Throws()
    {
        var text = "CHOICE: C\nREASON: Neither, both are fine.";
        Assert.Throws<FormatException>(() => OpenAiService.Parse(text));
    }

    [Fact]
    public void Parse_EmptyString_Throws()
    {
        Assert.Throws<FormatException>(() => OpenAiService.Parse(""));
    }

    [Fact]
    public void Parse_CompletelyWrongFormat_Throws()
    {
        var text = "I think option A is better because it is more popular.";
        Assert.Throws<FormatException>(() => OpenAiService.Parse(text));
    }
}
