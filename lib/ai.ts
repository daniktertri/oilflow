import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export async function summarizeNewsArticle(text: string): Promise<{
  summary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  category: string;
} | null> {
  const ai = getClient();
  if (!ai) return null;

  const res = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an oil market analyst. Analyze the following news article and return JSON with:
- "summary": 1-2 sentence summary focused on oil market impact
- "sentiment": "bullish", "bearish", or "neutral" (for oil prices)
- "category": one of "opec", "geopolitics", "supply", "demand", "refining", "shipping", "policy", "general"`,
      },
      { role: "user", content: text.slice(0, 2000) },
    ],
  });

  try {
    const raw = res.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      summary: string;
      sentiment: "bullish" | "bearish" | "neutral";
      category: string;
    };
    return parsed;
  } catch {
    return null;
  }
}

export async function generateMarketBrief(context: {
  wtiPrice: number;
  brentPrice: number;
  wtiChange: number;
  brentChange: number;
  recentNews: string[];
}): Promise<{
  summary: string;
  outlook: string;
  keyDrivers: string;
  sentiment: "bullish" | "bearish" | "neutral";
} | null> {
  const ai = getClient();
  if (!ai) return null;

  const newsBlock = context.recentNews.slice(0, 5).join("\n---\n");

  const res = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a senior oil market analyst writing a daily market brief. Be concise and professional, like a Bloomberg terminal note. Return JSON with:
- "summary": 2-3 sentence market overview
- "outlook": 1-2 sentence forward-looking view
- "keyDrivers": comma-separated list of 3-5 key drivers
- "sentiment": "bullish", "bearish", or "neutral"`,
      },
      {
        role: "user",
        content: `Market snapshot:
WTI: $${context.wtiPrice.toFixed(2)} (${context.wtiChange >= 0 ? "+" : ""}${context.wtiChange.toFixed(2)}%)
Brent: $${context.brentPrice.toFixed(2)} (${context.brentChange >= 0 ? "+" : ""}${context.brentChange.toFixed(2)}%)

Recent headlines:
${newsBlock || "No recent headlines available."}`,
      },
    ],
  });

  try {
    const raw = res.choices[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw) as {
      summary: string;
      outlook: string;
      keyDrivers: string;
      sentiment: "bullish" | "bearish" | "neutral";
    };
  } catch {
    return null;
  }
}
