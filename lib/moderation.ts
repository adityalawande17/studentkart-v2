import "server-only";

const MODEL = "gpt-6-luna";

const SYSTEM_PROMPT = `You moderate listings for a campus marketplace where students sell used items (furniture, appliances, textbooks, electronics) to other students nearby.

Flag a listing only if it shows real signs of one of these:
- Spam or nonsense content unrelated to selling an item
- A prohibited item (weapons, drugs, alcohol, counterfeit goods, live animals, anything illegal)
- A scam pattern: implausibly low price for the stated item combined with urgency/pressure language ("must sell today", "cash only, no questions"), requests for payment outside the platform, or other manipulation tactics

Do NOT flag a listing just for being a good deal, informally written, or vague — students write casual listings. When in doubt, do not flag.

Respond with ONLY a JSON object: {"flagged": boolean, "reason": string}. If not flagged, reason should be an empty string.`;

export type ModerationResult = { flagged: boolean; reason: string };

/**
 * Fails open: if the API call errors or returns something unparseable,
 * treat the listing as clean rather than blocking a legitimate seller on
 * an AI provider hiccup. Errors are logged server-side for visibility.
 */
export async function moderateListingContent(input: {
  title: string;
  description: string;
  price: number;
}): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set — skipping AI moderation");
    return { flagged: false, reason: "" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Title: ${input.title}\nPrice: ₹${input.price}\nDescription: ${input.description}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Moderation API error:", res.status, await res.text());
      return { flagged: false, reason: "" };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.error("Moderation API returned no content:", JSON.stringify(data));
      return { flagged: false, reason: "" };
    }

    const parsed = JSON.parse(content);
    if (typeof parsed.flagged !== "boolean") {
      console.error("Moderation API returned unexpected shape:", content);
      return { flagged: false, reason: "" };
    }

    return { flagged: parsed.flagged, reason: typeof parsed.reason === "string" ? parsed.reason : "" };
  } catch (err) {
    console.error("Moderation call failed:", err);
    return { flagged: false, reason: "" };
  }
}
