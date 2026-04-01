/**
 * EIA (U.S. Energy Information Administration) API client.
 * Free tier — register at https://www.eia.gov/opendata/register.php
 */

const EIA_BASE = "https://api.eia.gov/v2";

function apiKey(): string {
  return process.env.EIA_API_KEY?.trim() ?? "";
}

type EiaSeriesRow = {
  period: string;
  value: number | null;
  [k: string]: unknown;
};

type EiaResponse = {
  response?: {
    data?: EiaSeriesRow[];
  };
};

async function eiaFetch(path: string, params: Record<string, string> = {}): Promise<EiaSeriesRow[]> {
  const key = apiKey();
  if (!key) throw new Error("EIA_API_KEY not configured");

  const url = new URL(`${EIA_BASE}${path}`);
  url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`EIA API ${res.status}: ${await res.text().then(t => t.slice(0, 300))}`);
  }

  const json = (await res.json()) as EiaResponse;
  return json.response?.data ?? [];
}

export type EiaPriceRow = {
  date: string;
  value: number;
};

/** WTI spot price (daily) — PET/PRI/SPT series RWTC */
export async function fetchWtiSpotPrices(limit = 365): Promise<EiaPriceRow[]> {
  const rows = await eiaFetch("/petroleum/pri/spt/data/", {
    "data[0]": "value",
    frequency: "daily",
    "facets[series][]": "RWTC",
    sort: JSON.stringify([{ column: "period", direction: "desc" }]),
    length: String(limit),
  });
  return rows
    .filter((r) => r.value != null)
    .map((r) => ({ date: r.period, value: r.value as number }));
}

/** Brent spot price (daily) — PET/PRI/SPT series RBRTE */
export async function fetchBrentSpotPrices(limit = 365): Promise<EiaPriceRow[]> {
  const rows = await eiaFetch("/petroleum/pri/spt/data/", {
    "data[0]": "value",
    frequency: "daily",
    "facets[series][]": "RBRTE",
    sort: JSON.stringify([{ column: "period", direction: "desc" }]),
    length: String(limit),
  });
  return rows
    .filter((r) => r.value != null)
    .map((r) => ({ date: r.period, value: r.value as number }));
}

/** Weekly U.S. crude oil inventories (excluding SPR) */
export async function fetchCrudeInventories(limit = 52): Promise<EiaPriceRow[]> {
  const rows = await eiaFetch("/petroleum/stoc/wstk/data/", {
    "data[0]": "value",
    frequency: "weekly",
    "facets[product][]": "EPC0",
    "facets[process][]": "SAX",
    sort: JSON.stringify([{ column: "period", direction: "desc" }]),
    length: String(limit),
  });
  return rows
    .filter((r) => r.value != null)
    .map((r) => ({ date: r.period, value: r.value as number }));
}

/** Weekly U.S. gasoline inventories */
export async function fetchGasolineInventories(limit = 52): Promise<EiaPriceRow[]> {
  const rows = await eiaFetch("/petroleum/stoc/wstk/data/", {
    "data[0]": "value",
    frequency: "weekly",
    "facets[product][]": "EPM0",
    "facets[process][]": "SAX",
    sort: JSON.stringify([{ column: "period", direction: "desc" }]),
    length: String(limit),
  });
  return rows
    .filter((r) => r.value != null)
    .map((r) => ({ date: r.period, value: r.value as number }));
}

/** U.S. crude oil production (monthly) */
export async function fetchUsProduction(limit = 36): Promise<EiaPriceRow[]> {
  const rows = await eiaFetch("/petroleum/crd/crpdn/data/", {
    "data[0]": "value",
    frequency: "monthly",
    "facets[duoarea][]": "NUS-Z00",
    "facets[product][]": "EPC0",
    sort: JSON.stringify([{ column: "period", direction: "desc" }]),
    length: String(limit),
  });
  return rows
    .filter((r) => r.value != null)
    .map((r) => ({ date: r.period, value: r.value as number }));
}
