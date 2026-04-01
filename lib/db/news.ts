import type { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

export type NewsArticleRow = {
  id: string;
  source: string;
  source_name: string;
  title: string;
  body: string | null;
  url: string;
  published_at: string;
  ai_summary: string | null;
  direction: string | null;
  impact_level: string | null;
  price_impact: string | null;
  confidence: string | null;
  affected_benchmarks: string | null;
  category: string | null;
  sentiment: string | null;
};

export async function upsertNewsArticle(
  sql: Sql,
  article: {
    source: string;
    sourceName: string;
    title: string;
    body?: string;
    url: string;
    publishedAt: string;
  }
): Promise<boolean> {
  const rows = (await sql`
    INSERT INTO news_articles (source, source_name, title, body, url, published_at)
    VALUES (${article.source}, ${article.sourceName}, ${article.title}, ${article.body ?? null}, ${article.url}, ${article.publishedAt})
    ON CONFLICT (url) DO NOTHING
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}

export async function updateNewsArticleAi(
  sql: Sql,
  url: string,
  ai: {
    summary: string;
    direction: string;
    impactLevel: string;
    priceImpact: string;
    confidence: string;
    affectedBenchmarks: string;
    category: string;
    sentiment: string;
  }
): Promise<void> {
  await sql`
    UPDATE news_articles
    SET ai_summary = ${ai.summary},
        direction = ${ai.direction},
        impact_level = ${ai.impactLevel},
        price_impact = ${ai.priceImpact},
        confidence = ${ai.confidence},
        affected_benchmarks = ${ai.affectedBenchmarks},
        category = ${ai.category},
        sentiment = ${ai.sentiment}
    WHERE url = ${url}
  `;
}

export async function getRecentNewsArticles(
  sql: Sql,
  limit: number = 30,
  category?: string
): Promise<NewsArticleRow[]> {
  if (category) {
    return (await sql`
      SELECT id, source, source_name, title, body, url, published_at::text,
             ai_summary, direction, impact_level, price_impact, confidence,
             affected_benchmarks, category, sentiment
      FROM news_articles
      WHERE category = ${category}
      ORDER BY published_at DESC
      LIMIT ${limit}
    `) as NewsArticleRow[];
  }
  return (await sql`
    SELECT id, source, source_name, title, body, url, published_at::text,
           ai_summary, direction, impact_level, price_impact, confidence,
           affected_benchmarks, category, sentiment
    FROM news_articles
    ORDER BY published_at DESC
    LIMIT ${limit}
  `) as NewsArticleRow[];
}
