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

export type NewsAnalysis = {
  summary: string;
  direction: "bullish" | "bearish" | "neutral";
  confidence: "high" | "medium" | "low";
  impactLevel: "high" | "medium" | "low";
  affectedBenchmarks: string[];
  priceImpact: string;
  category: string;
};

const NEWS_SYSTEM_PROMPT = `You are a SENIOR oil market analyst at a top commodity trading desk. You produce sharp, differentiated analysis — never generic filler.

RULES:
- NEVER say "could disrupt oil supply routes and impact global oil prices" or any variant. That is banned.
- NEVER produce generic, template-like analysis. Every summary must be UNIQUE to the specific event.
- Be SPECIFIC: name the mechanism (supply cut, demand destruction, tanker rerouting, refinery margin squeeze, etc.)
- Quantify when possible: "removes ~500K bbl/day from market" not "could reduce supply"
- State the TIME HORIZON: "immediate" / "1-2 weeks" / "medium-term"
- State which SPECIFIC benchmarks are affected and WHY (e.g. "Brent widens vs WTI due to Atlantic Basin tightness")

Return JSON with these exact fields:
- "summary": 2-3 sentences of UNIQUE, SPECIFIC analysis. Explain the mechanism, magnitude, and timeframe.
- "direction": "bullish" | "bearish" | "neutral" — the price direction signal
- "confidence": "high" | "medium" | "low" — how certain is this signal
- "impactLevel": "high" | "medium" | "low" — magnitude of market impact
- "affectedBenchmarks": array of benchmark codes affected, e.g. ["WTI","BRENT"] or ["BRENT","URALS"]
- "priceImpact": short estimate like "+$2-4/bbl near-term" or "limited, <$0.50" or "-$1/bbl if sustained"
- "category": one of "opec", "geopolitics", "supply", "demand", "refining", "shipping", "policy", "macro", "inventory", "general"`;

export async function summarizeNewsArticle(text: string): Promise<NewsAnalysis | null> {
  const ai = getClient();
  if (!ai) return null;

  const res = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: NEWS_SYSTEM_PROMPT },
      { role: "user", content: text.slice(0, 3000) },
    ],
  });

  try {
    const raw = res.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary ?? "",
      direction: parsed.direction ?? "neutral",
      confidence: parsed.confidence ?? "low",
      impactLevel: parsed.impactLevel ?? "low",
      affectedBenchmarks: Array.isArray(parsed.affectedBenchmarks) ? parsed.affectedBenchmarks : ["WTI", "BRENT"],
      priceImpact: parsed.priceImpact ?? "uncertain",
      category: parsed.category ?? "general",
    };
  } catch {
    return null;
  }
}

export type MarketBriefResult = {
  direction: "LONG" | "SHORT" | "NEUTRAL";
  conviction: "high" | "medium" | "low";
  summary: string;
  outlook: string;
  keyDrivers: string;
  risks: string;
  sentiment: "bullish" | "bearish" | "neutral";
};

const BRIEF_SYSTEM_PROMPT = `You are the HEAD of oil trading strategy at a major commodity house. You write the daily morning brief that traders read before the open.

Your brief must be:
- ACTIONABLE: Give a clear LONG, SHORT, or NEUTRAL call with conviction level
- SPECIFIC: Reference exact price levels, spreads, and catalysts
- FORWARD-LOOKING: What matters in the next 1-5 trading days
- RISK-AWARE: Always state what would invalidate the thesis

Return JSON with:
- "direction": "LONG" | "SHORT" | "NEUTRAL" — the trading call
- "conviction": "high" | "medium" | "low"
- "summary": 3-4 sentences. Open with the call ("We are SHORT Brent at $XX..."). Reference specific catalysts.
- "outlook": 1-2 sentences on 1-week forward view with key levels to watch
- "keyDrivers": comma-separated list of 3-5 specific drivers (not generic words — e.g. "Iran supply risk +500K bbl/day" not just "geopolitics")
- "risks": 1-2 sentence description of key risks to the thesis
- "sentiment": "bullish" | "bearish" | "neutral"`;

export async function generateMarketBrief(context: {
  wtiPrice: number;
  brentPrice: number;
  wtiChange: number;
  brentChange: number;
  recentNews: string[];
}): Promise<MarketBriefResult | null> {
  const ai = getClient();
  if (!ai) return null;

  const newsBlock = context.recentNews.slice(0, 8).join("\n---\n");
  const spread = (context.brentPrice - context.wtiPrice).toFixed(2);

  const res = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: BRIEF_SYSTEM_PROMPT },
      {
        role: "user",
        content: `MARKET DATA:
WTI: $${context.wtiPrice.toFixed(2)} (${context.wtiChange >= 0 ? "+" : ""}${context.wtiChange.toFixed(2)}%)
Brent: $${context.brentPrice.toFixed(2)} (${context.brentChange >= 0 ? "+" : ""}${context.brentChange.toFixed(2)}%)
Brent-WTI spread: $${spread}

RECENT HEADLINES:
${newsBlock || "No recent headlines available."}

Generate the morning trading brief.`,
      },
    ],
  });

  try {
    const raw = res.choices[0]?.message?.content;
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      direction: p.direction ?? "NEUTRAL",
      conviction: p.conviction ?? "low",
      summary: p.summary ?? "",
      outlook: p.outlook ?? "",
      keyDrivers: p.keyDrivers ?? "",
      risks: p.risks ?? "",
      sentiment: p.sentiment ?? "neutral",
    };
  } catch {
    return null;
  }
}
