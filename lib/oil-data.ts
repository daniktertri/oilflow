/**
 * Static oil production data for the world map choropleth.
 * Source: EIA International Energy Statistics, approximate 2024 figures (thousand bbl/day).
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
  { iso3: "USA", name: "United States", production: 13200, reserves: 44400, exports: 4200, region: "North America" },
  { iso3: "SAU", name: "Saudi Arabia", production: 10500, reserves: 258600, exports: 7400, region: "Middle East" },
  { iso3: "RUS", name: "Russia", production: 10300, reserves: 80000, exports: 5100, region: "Europe & CIS" },
  { iso3: "CAN", name: "Canada", production: 5800, reserves: 168100, exports: 4000, region: "North America" },
  { iso3: "IRQ", name: "Iraq", production: 4500, reserves: 145019, exports: 3500, region: "Middle East" },
  { iso3: "CHN", name: "China", production: 4200, reserves: 26022, exports: 0, region: "Asia Pacific" },
  { iso3: "ARE", name: "UAE", production: 4000, reserves: 97800, exports: 2800, region: "Middle East" },
  { iso3: "BRA", name: "Brazil", production: 3700, reserves: 11891, exports: 1200, region: "South America" },
  { iso3: "IRN", name: "Iran", production: 3600, reserves: 208600, exports: 1200, region: "Middle East" },
  { iso3: "KWT", name: "Kuwait", production: 2800, reserves: 101500, exports: 2100, region: "Middle East" },
  { iso3: "NOR", name: "Norway", production: 2000, reserves: 7124, exports: 1700, region: "Europe" },
  { iso3: "MEX", name: "Mexico", production: 1900, reserves: 5786, exports: 900, region: "North America" },
  { iso3: "KAZ", name: "Kazakhstan", production: 1800, reserves: 30000, exports: 1400, region: "Central Asia" },
  { iso3: "NGA", name: "Nigeria", production: 1500, reserves: 36910, exports: 1100, region: "Africa" },
  { iso3: "LBY", name: "Libya", production: 1200, reserves: 48363, exports: 1000, region: "Africa" },
  { iso3: "AGO", name: "Angola", production: 1100, reserves: 7783, exports: 1000, region: "Africa" },
  { iso3: "DZA", name: "Algeria", production: 1000, reserves: 12200, exports: 500, region: "Africa" },
  { iso3: "GBR", name: "United Kingdom", production: 700, reserves: 2754, exports: 400, region: "Europe" },
  { iso3: "COL", name: "Colombia", production: 750, reserves: 2036, exports: 500, region: "South America" },
  { iso3: "VEN", name: "Venezuela", production: 700, reserves: 303806, exports: 300, region: "South America" },
  { iso3: "OMN", name: "Oman", production: 1050, reserves: 5373, exports: 800, region: "Middle East" },
  { iso3: "QAT", name: "Qatar", production: 1800, reserves: 25244, exports: 1300, region: "Middle East" },
  { iso3: "ECU", name: "Ecuador", production: 480, reserves: 8273, exports: 350, region: "South America" },
  { iso3: "GUY", name: "Guyana", production: 640, reserves: 11000, exports: 600, region: "South America" },
  { iso3: "EGY", name: "Egypt", production: 550, reserves: 3300, exports: 100, region: "Africa" },
  { iso3: "IDN", name: "Indonesia", production: 640, reserves: 2481, exports: 200, region: "Asia Pacific" },
  { iso3: "MYS", name: "Malaysia", production: 550, reserves: 3600, exports: 250, region: "Asia Pacific" },
  { iso3: "IND", name: "India", production: 760, reserves: 4662, exports: 0, region: "Asia Pacific" },
  { iso3: "ARG", name: "Argentina", production: 700, reserves: 2482, exports: 150, region: "South America" },
  { iso3: "TKM", name: "Turkmenistan", production: 220, reserves: 600, exports: 100, region: "Central Asia" },
  { iso3: "GAB", name: "Gabon", production: 200, reserves: 2000, exports: 180, region: "Africa" },
  { iso3: "COG", name: "Congo", production: 260, reserves: 2882, exports: 230, region: "Africa" },
];

export const OIL_HUBS = [
  { name: "Cushing, OK", lat: 35.98, lng: -96.77, type: "storage" as const, description: "WTI delivery point, U.S. pipeline hub" },
  { name: "Rotterdam", lat: 51.92, lng: 4.48, type: "refining" as const, description: "Europe's largest port, ARA refining hub" },
  { name: "Fujairah", lat: 25.12, lng: 56.33, type: "storage" as const, description: "Middle East oil storage & bunkering hub" },
  { name: "Singapore", lat: 1.35, lng: 103.82, type: "trading" as const, description: "Asia-Pacific trading & refining center" },
  { name: "Houston, TX", lat: 29.76, lng: -95.37, type: "refining" as const, description: "U.S. Gulf Coast refining capital" },
  { name: "Ras Tanura", lat: 26.63, lng: 50.07, type: "export" as const, description: "Saudi Aramco's main export terminal" },
  { name: "Novorossiysk", lat: 44.72, lng: 37.77, type: "export" as const, description: "Russia's key Black Sea oil export port" },
  { name: "Jamnagar", lat: 22.47, lng: 70.07, type: "refining" as const, description: "World's largest oil refinery (Reliance)" },
];

export function getProductionColor(production: number): string {
  if (production >= 10000) return "#ff6f00";
  if (production >= 5000) return "#ff8f00";
  if (production >= 2000) return "#ffa000";
  if (production >= 1000) return "#ffb300";
  if (production >= 500) return "#ffc107";
  if (production >= 200) return "#ffd54f";
  if (production > 0) return "#ffe082";
  return "transparent";
}
