/**
 * Static oil production data, geopolitical events, chokepoints, and pipelines.
 * Sources: EIA International Energy Statistics, IEA, OPEC Monthly Report (2024 figures).
 * Production in thousand bbl/day.
 */

export type CountryOilData = {
  iso3: string;
  name: string;
  production: number;
  reserves?: number;
  exports?: number;
  region: string;
};

export const COUNTRY_OIL_DATA: CountryOilData[] = [
  { iso3: "USA", name: "United States", production: 13300, reserves: 44400, exports: 3600, region: "North America" },
  { iso3: "SAU", name: "Saudi Arabia", production: 10500, reserves: 258600, exports: 7400, region: "Middle East" },
  { iso3: "RUS", name: "Russia", production: 10200, reserves: 80000, exports: 5000, region: "Europe/Asia" },
  { iso3: "CAN", name: "Canada", production: 5800, reserves: 168100, exports: 3900, region: "North America" },
  { iso3: "IRQ", name: "Iraq", production: 4500, reserves: 145019, exports: 3400, region: "Middle East" },
  { iso3: "CHN", name: "China", production: 4100, reserves: 26022, region: "Asia-Pacific" },
  { iso3: "ARE", name: "UAE", production: 4000, reserves: 97800, exports: 2600, region: "Middle East" },
  { iso3: "BRA", name: "Brazil", production: 3700, reserves: 12715, exports: 1200, region: "South America" },
  { iso3: "IRN", name: "Iran", production: 3200, reserves: 208600, exports: 1800, region: "Middle East" },
  { iso3: "KWT", name: "Kuwait", production: 2700, reserves: 101500, exports: 2000, region: "Middle East" },
  { iso3: "NOR", name: "Norway", production: 2000, reserves: 8122, exports: 1600, region: "Europe" },
  { iso3: "MEX", name: "Mexico", production: 1900, reserves: 5786, region: "North America" },
  { iso3: "KAZ", name: "Kazakhstan", production: 1800, reserves: 30000, exports: 1400, region: "Central Asia" },
  { iso3: "NGA", name: "Nigeria", production: 1500, reserves: 36967, exports: 1100, region: "Africa" },
  { iso3: "LBY", name: "Libya", production: 1200, reserves: 48363, exports: 1000, region: "Africa" },
  { iso3: "DZA", name: "Algeria", production: 1000, reserves: 12200, exports: 600, region: "Africa" },
  { iso3: "AGO", name: "Angola", production: 1100, reserves: 7783, exports: 900, region: "Africa" },
  { iso3: "GBR", name: "United Kingdom", production: 800, reserves: 2754, region: "Europe" },
  { iso3: "COL", name: "Colombia", production: 780, reserves: 2036, exports: 500, region: "South America" },
  { iso3: "OMN", name: "Oman", production: 1000, reserves: 5373, exports: 800, region: "Middle East" },
  { iso3: "QAT", name: "Qatar", production: 600, reserves: 25244, exports: 450, region: "Middle East" },
  { iso3: "IND", name: "India", production: 600, reserves: 4728, region: "Asia-Pacific" },
  { iso3: "ARG", name: "Argentina", production: 700, reserves: 2483, region: "South America" },
  { iso3: "IDN", name: "Indonesia", production: 640, reserves: 2480, region: "Asia-Pacific" },
  { iso3: "ECU", name: "Ecuador", production: 480, reserves: 8273, exports: 380, region: "South America" },
  { iso3: "EGY", name: "Egypt", production: 600, reserves: 3300, region: "Africa" },
  { iso3: "MYS", name: "Malaysia", production: 580, reserves: 3600, region: "Asia-Pacific" },
  { iso3: "VEN", name: "Venezuela", production: 800, reserves: 303800, exports: 500, region: "South America" },
  { iso3: "COG", name: "Republic of Congo", production: 270, reserves: 1600, region: "Africa" },
  { iso3: "GAB", name: "Gabon", production: 200, reserves: 2000, region: "Africa" },
  { iso3: "GNQ", name: "Equatorial Guinea", production: 100, reserves: 1100, region: "Africa" },
  { iso3: "TCD", name: "Chad", production: 120, reserves: 1500, region: "Africa" },
  { iso3: "AUS", name: "Australia", production: 340, reserves: 2400, region: "Asia-Pacific" },
  { iso3: "TKM", name: "Turkmenistan", production: 250, reserves: 600, region: "Central Asia" },
  { iso3: "AZE", name: "Azerbaijan", production: 550, reserves: 7000, exports: 500, region: "Central Asia" },
  { iso3: "GHA", name: "Ghana", production: 150, reserves: 660, region: "Africa" },
  { iso3: "SDN", name: "Sudan", production: 60, reserves: 1500, region: "Africa" },
  { iso3: "SSD", name: "South Sudan", production: 150, reserves: 3500, region: "Africa" },
  { iso3: "TTO", name: "Trinidad & Tobago", production: 80, reserves: 220, region: "South America" },
  { iso3: "VNM", name: "Vietnam", production: 160, reserves: 4400, region: "Asia-Pacific" },
  { iso3: "PER", name: "Peru", production: 40, reserves: 430, region: "South America" },
  { iso3: "DNK", name: "Denmark", production: 65, reserves: 441, region: "Europe" },
  { iso3: "ITA", name: "Italy", production: 60, reserves: 500, region: "Europe" },
  { iso3: "ROU", name: "Romania", production: 65, reserves: 600, region: "Europe" },
  { iso3: "THA", name: "Thailand", production: 230, reserves: 252, region: "Asia-Pacific" },
  { iso3: "YEM", name: "Yemen", production: 15, reserves: 3000, region: "Middle East" },
  { iso3: "SYR", name: "Syria", production: 25, reserves: 2500, region: "Middle East" },
  { iso3: "BHR", name: "Bahrain", production: 190, reserves: 186, region: "Middle East" },
];

export type OilHub = {
  name: string;
  lat: number;
  lng: number;
  type: "storage" | "refining" | "trading" | "export";
  description: string;
};

export const OIL_HUBS: OilHub[] = [
  { name: "Cushing, OK", lat: 35.98, lng: -96.77, type: "storage", description: "WTI delivery point, 90M bbl capacity" },
  { name: "Rotterdam", lat: 51.92, lng: 4.48, type: "refining", description: "Europe's largest port & refining hub" },
  { name: "Fujairah", lat: 25.13, lng: 56.33, type: "storage", description: "Middle East trading hub, 14M bbl storage" },
  { name: "Singapore", lat: 1.35, lng: 103.82, type: "trading", description: "Asia-Pacific trading & bunkering hub" },
  { name: "Houston, TX", lat: 29.76, lng: -95.37, type: "refining", description: "U.S. Gulf Coast refining complex" },
  { name: "Ras Tanura", lat: 26.66, lng: 50.17, type: "export", description: "Saudi Aramco — world's largest export terminal" },
  { name: "Novorossiysk", lat: 44.72, lng: 37.77, type: "export", description: "Russia's Black Sea export terminal (CPC blend)" },
  { name: "Jamnagar", lat: 22.47, lng: 70.07, type: "refining", description: "Reliance — world's largest refinery (1.4M bbl/day)" },
  { name: "Sidi Kerir", lat: 31.10, lng: 29.68, type: "export", description: "SUMED pipeline Mediterranean terminal" },
  { name: "Ceyhan", lat: 36.88, lng: 35.81, type: "export", description: "BTC pipeline Mediterranean terminal" },
  { name: "Hardisty, AB", lat: 52.67, lng: -111.30, type: "storage", description: "WCS pricing point, Keystone origin" },
  { name: "Trieste", lat: 45.65, lng: 13.78, type: "export", description: "TAL pipeline terminal, Central European supply" },
  { name: "Yanbu", lat: 24.09, lng: 38.06, type: "export", description: "Saudi Red Sea export terminal" },
  { name: "Basra", lat: 30.51, lng: 47.78, type: "export", description: "Iraq's main export terminal (3.3M bbl/day)" },
  { name: "Bonny Island", lat: 4.43, lng: 7.16, type: "export", description: "Nigeria's main export terminal" },
];

export type GeopoliticalEvent = {
  name: string;
  lat: number;
  lng: number;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  oilImpact: string;
};

export const GEOPOLITICAL_EVENTS: GeopoliticalEvent[] = [
  {
    name: "Iran — Strait of Hormuz",
    lat: 26.56,
    lng: 56.25,
    severity: "critical",
    description: "Iran nuclear tensions & IRGC military activity. Repeated threats to close the strait.",
    oilImpact: "21M bbl/day transit risk. Closure would remove ~20% of global supply.",
  },
  {
    name: "Russia-Ukraine War",
    lat: 48.38,
    lng: 37.62,
    severity: "high",
    description: "Ongoing conflict disrupting Black Sea shipping and Druzhba pipeline flows to Europe.",
    oilImpact: "Urals discount to Brent ~$15. EU price cap at $60. Rerouting to India/China.",
  },
  {
    name: "Yemen — Houthi Red Sea Attacks",
    lat: 13.53,
    lng: 43.15,
    severity: "critical",
    description: "Houthi drone and missile attacks on commercial shipping in the Red Sea and Bab el-Mandeb.",
    oilImpact: "6.2M bbl/day transit. Tankers rerouting via Cape of Good Hope (+10 days, +$1-2M/voyage).",
  },
  {
    name: "Libya — Civil Instability",
    lat: 32.90,
    lng: 13.18,
    severity: "medium",
    description: "Recurring factional disputes shutting down oil fields and export terminals.",
    oilImpact: "1.2M bbl/day production at risk. Frequent 300-500K bbl/day outages.",
  },
  {
    name: "Venezuela — US Sanctions",
    lat: 10.49,
    lng: -66.88,
    severity: "medium",
    description: "US sanctions limiting Venezuelan crude exports. Chevron license renewals uncertain.",
    oilImpact: "800K bbl/day production. Heavy sour crude — affects Gulf Coast refiners.",
  },
  {
    name: "Iraq Kurdistan — Pipeline Dispute",
    lat: 36.19,
    lng: 44.01,
    severity: "high",
    description: "Iraq-Turkey pipeline shut since March 2023. Kurdish exports halted by arbitration ruling.",
    oilImpact: "~450K bbl/day offline. Tightens Mediterranean sour crude market.",
  },
  {
    name: "Niger — Sahel Instability",
    lat: 13.51,
    lng: 2.13,
    severity: "low",
    description: "Military coups across Sahel region. Niger-Benin pipeline project uncertain.",
    oilImpact: "Limited direct impact. Trans-Saharan pipeline plans delayed indefinitely.",
  },
  {
    name: "Guyana — Territorial Dispute",
    lat: 6.80,
    lng: -58.16,
    severity: "low",
    description: "Venezuela claims Essequibo region overlapping Guyana's offshore oil blocks.",
    oilImpact: "Guyana producing 600K+ bbl/day. Dispute creates investment uncertainty.",
  },
];

export type Chokepoint = {
  name: string;
  lat: number;
  lng: number;
  flowMbblDay: number;
  description: string;
  riskLevel: "critical" | "elevated" | "normal";
};

export const CHOKEPOINTS: Chokepoint[] = [
  {
    name: "Strait of Hormuz",
    lat: 26.56,
    lng: 56.25,
    flowMbblDay: 21,
    description: "Between Iran & Oman. ~21M bbl/day of crude + products. Single most critical chokepoint.",
    riskLevel: "critical",
  },
  {
    name: "Strait of Malacca",
    lat: 2.50,
    lng: 101.50,
    flowMbblDay: 16,
    description: "Between Malaysia & Indonesia. ~16M bbl/day. Key route for Asian crude imports.",
    riskLevel: "normal",
  },
  {
    name: "Suez Canal / SUMED",
    lat: 30.45,
    lng: 32.35,
    flowMbblDay: 5.5,
    description: "Egypt. ~5.5M bbl/day via canal + SUMED pipeline. Connects Mediterranean to Red Sea.",
    riskLevel: "elevated",
  },
  {
    name: "Bab el-Mandeb",
    lat: 12.58,
    lng: 43.33,
    flowMbblDay: 6.2,
    description: "Between Yemen & Djibouti. ~6.2M bbl/day. Under Houthi attack threat.",
    riskLevel: "critical",
  },
  {
    name: "Turkish Straits",
    lat: 41.12,
    lng: 29.05,
    flowMbblDay: 3.4,
    description: "Bosphorus & Dardanelles. ~3.4M bbl/day. Kazakh CPC + Russian crude to Mediterranean.",
    riskLevel: "normal",
  },
  {
    name: "Danish Straits",
    lat: 55.60,
    lng: 12.65,
    flowMbblDay: 3.2,
    description: "Between Denmark & Sweden. ~3.2M bbl/day. Russian Baltic exports route.",
    riskLevel: "normal",
  },
  {
    name: "Panama Canal",
    lat: 9.08,
    lng: -79.68,
    flowMbblDay: 1.0,
    description: "~1M bbl/day. US crude exports to Asia. Drought restrictions reducing transit capacity.",
    riskLevel: "elevated",
  },
  {
    name: "Cape of Good Hope",
    lat: -34.35,
    lng: 18.47,
    flowMbblDay: 9.0,
    description: "Reroute point when Red Sea is disrupted. Adds 10-14 days to Europe-Asia voyages.",
    riskLevel: "elevated",
  },
];

export type Pipeline = {
  name: string;
  from: { lat: number; lng: number; label: string };
  to: { lat: number; lng: number; label: string };
  capacityMbblDay: number;
  status: "active" | "disrupted" | "proposed";
  description: string;
};

export const MAJOR_PIPELINES: Pipeline[] = [
  {
    name: "Druzhba Pipeline",
    from: { lat: 52.26, lng: 40.41, label: "Samara, Russia" },
    to: { lat: 50.45, lng: 14.47, label: "Central Europe" },
    capacityMbblDay: 1.2,
    status: "active",
    description: "Russia → Poland/Germany/Hungary/Czech. Partially sanctioned since Ukraine war.",
  },
  {
    name: "East-West Pipeline",
    from: { lat: 25.38, lng: 49.52, label: "Abqaiq, Saudi Arabia" },
    to: { lat: 24.09, lng: 38.06, label: "Yanbu, Red Sea" },
    capacityMbblDay: 5.0,
    status: "active",
    description: "Saudi strategic bypass of Strait of Hormuz. 5M bbl/day capacity.",
  },
  {
    name: "Keystone Pipeline",
    from: { lat: 52.67, lng: -111.30, label: "Hardisty, Alberta" },
    to: { lat: 29.76, lng: -95.37, label: "Houston, Texas" },
    capacityMbblDay: 0.59,
    status: "active",
    description: "Canadian heavy crude to US Gulf Coast refiners. 590K bbl/day.",
  },
  {
    name: "BTC Pipeline",
    from: { lat: 40.41, lng: 49.87, label: "Baku, Azerbaijan" },
    to: { lat: 36.88, lng: 35.81, label: "Ceyhan, Turkey" },
    capacityMbblDay: 1.2,
    status: "active",
    description: "Caspian crude bypassing Russia. 1.2M bbl/day. Key for Azeri Light.",
  },
  {
    name: "CPC Pipeline",
    from: { lat: 47.10, lng: 51.92, label: "Tengiz, Kazakhstan" },
    to: { lat: 44.72, lng: 37.77, label: "Novorossiysk, Russia" },
    capacityMbblDay: 1.5,
    status: "active",
    description: "Kazakh crude to Black Sea. 1.5M bbl/day. Storm disruptions common in winter.",
  },
  {
    name: "Iraq-Turkey Pipeline",
    from: { lat: 35.47, lng: 44.39, label: "Kirkuk, Iraq" },
    to: { lat: 36.88, lng: 35.81, label: "Ceyhan, Turkey" },
    capacityMbblDay: 0.45,
    status: "disrupted",
    description: "Shut since March 2023 due to arbitration ruling. 450K bbl/day offline.",
  },
  {
    name: "SUMED Pipeline",
    from: { lat: 29.95, lng: 32.55, label: "Ain Sukhna, Red Sea" },
    to: { lat: 31.10, lng: 29.68, label: "Sidi Kerir, Mediterranean" },
    capacityMbblDay: 2.5,
    status: "active",
    description: "Bypasses Suez Canal for crude. 2.5M bbl/day. Egypt-owned.",
  },
];

export function getProductionColor(production: number): string {
  if (production >= 10000) return "#ff8f00";
  if (production >= 5000) return "#ffa726";
  if (production >= 2000) return "#ffb74d";
  if (production >= 1000) return "#ffcc80";
  if (production >= 500) return "#ffe0b2";
  if (production >= 200) return "#fff3e0";
  if (production > 0) return "#fff8ef";
  return "transparent";
}
