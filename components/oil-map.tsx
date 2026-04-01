"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { Tooltip } from "react-tooltip";
import {
  COUNTRY_OIL_DATA,
  OIL_HUBS,
  getProductionColor,
  type CountryOilData,
} from "@/lib/oil-data";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const ISO_NUMERIC_TO_ISO3: Record<string, string> = {
  "840": "USA", "682": "SAU", "643": "RUS", "124": "CAN", "368": "IRQ",
  "156": "CHN", "784": "ARE", "076": "BRA", "364": "IRN", "414": "KWT",
  "578": "NOR", "484": "MEX", "398": "KAZ", "566": "NGA", "434": "LBY",
  "024": "AGO", "012": "DZA", "826": "GBR", "170": "COL", "862": "VEN",
  "512": "OMN", "634": "QAT", "218": "ECU", "328": "GUY", "818": "EGY",
  "360": "IDN", "458": "MYS", "356": "IND", "032": "ARG", "795": "TKM",
  "266": "GAB", "178": "COG",
};

const countryMap = new Map<string, CountryOilData>();
for (const c of COUNTRY_OIL_DATA) countryMap.set(c.iso3, c);

const HUB_COLORS: Record<string, string> = {
  storage: "#ffc107",
  refining: "#00e5ff",
  trading: "#00c853",
  export: "#ff5252",
};

function formatNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}M`;
  return `${n}K`;
}

export function OilMap() {
  const [selected, setSelected] = useState<CountryOilData | null>(null);
  const [showHubs, setShowHubs] = useState(true);
  const [tooltipContent, setTooltipContent] = useState("");

  const handleGeoClick = useCallback((geoId: string) => {
    const iso3 = ISO_NUMERIC_TO_ISO3[geoId];
    if (iso3) {
      const data = countryMap.get(iso3);
      setSelected(data ?? null);
    } else {
      setSelected(null);
    }
  }, []);

  const topProducers = useMemo(
    () => [...COUNTRY_OIL_DATA].sort((a, b) => b.production - a.production).slice(0, 10),
    []
  );

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative min-h-[400px] flex-1">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 140, center: [20, 20] }}
          className="h-full w-full"
          style={{ background: "#0c0e12" }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const geoId = geo.id as string;
                  const iso3 = ISO_NUMERIC_TO_ISO3[geoId];
                  const data = iso3 ? countryMap.get(iso3) : undefined;
                  const fill = data
                    ? getProductionColor(data.production)
                    : "#1e2430";

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      data-tooltip-id="map-tooltip"
                      data-tooltip-content={
                        data
                          ? `${data.name}: ${formatNum(data.production)} bbl/day`
                          : geo.properties.name
                      }
                      onMouseEnter={() => {
                        setTooltipContent(
                          data
                            ? `${data.name}: ${formatNum(data.production)} bbl/day`
                            : geo.properties.name ?? ""
                        );
                      }}
                      onMouseLeave={() => setTooltipContent("")}
                      onClick={() => handleGeoClick(geoId)}
                      style={{
                        default: {
                          fill,
                          stroke: "#0c0e12",
                          strokeWidth: 0.5,
                          outline: "none",
                          cursor: data ? "pointer" : "default",
                        },
                        hover: {
                          fill: data ? "#fff3e0" : "#2a3140",
                          stroke: "#ffc107",
                          strokeWidth: 1,
                          outline: "none",
                          cursor: data ? "pointer" : "default",
                        },
                        pressed: {
                          fill: "#ffc107",
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
            {showHubs &&
              OIL_HUBS.map((hub) => (
                <Marker key={hub.name} coordinates={[hub.lng, hub.lat]}>
                  <circle
                    r={3}
                    fill={HUB_COLORS[hub.type]}
                    stroke="#0c0e12"
                    strokeWidth={1}
                    data-tooltip-id="map-tooltip"
                    data-tooltip-content={`${hub.name} — ${hub.description}`}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setTooltipContent(`${hub.name} — ${hub.description}`)
                    }
                    onMouseLeave={() => setTooltipContent("")}
                  />
                </Marker>
              ))}
          </ZoomableGroup>
        </ComposableMap>
        <Tooltip
          id="map-tooltip"
          className="!bg-[#1e2430] !text-[12px] !text-[#c8d0e0]"
          content={tooltipContent}
        />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded border border-terminal-border bg-[#0c0e12]/90 p-2">
          <span className="text-[9px] uppercase tracking-wider text-terminal-muted">
            Production (bbl/day)
          </span>
          {[
            { color: "#ff6f00", label: ">10M" },
            { color: "#ffa000", label: "2-10M" },
            { color: "#ffc107", label: "500K-2M" },
            { color: "#ffe082", label: "<500K" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: l.color }}
              />
              <span className="text-[10px] text-terminal-muted">{l.label}</span>
            </div>
          ))}
          <div className="mt-1 border-t border-terminal-border pt-1">
            <button
              onClick={() => setShowHubs(!showHubs)}
              className="text-[10px] text-terminal-cyan hover:underline"
            >
              {showHubs ? "Hide" : "Show"} hubs
            </button>
          </div>
          {showHubs && (
            <div className="flex flex-col gap-0.5">
              {Object.entries(HUB_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="text-[10px] capitalize text-terminal-muted">
                    {type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-t border-terminal-border bg-terminal-panel lg:w-[360px] lg:border-l lg:border-t-0">
        {selected ? (
          <div className="p-4">
            <button
              onClick={() => setSelected(null)}
              className="mb-3 text-[11px] text-terminal-cyan hover:underline"
            >
              ← Back to rankings
            </button>
            <h2 className="text-lg text-terminal-amber">{selected.name}</h2>
            <span className="text-[11px] text-terminal-muted">{selected.region}</span>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border border-terminal-border bg-[#0c0e12] p-3">
                <div className="text-[10px] uppercase text-terminal-muted">
                  Production
                </div>
                <div className="mt-1 text-base text-terminal-amber">
                  {formatNum(selected.production)} bbl/d
                </div>
              </div>
              {selected.reserves && (
                <div className="border border-terminal-border bg-[#0c0e12] p-3">
                  <div className="text-[10px] uppercase text-terminal-muted">
                    Reserves
                  </div>
                  <div className="mt-1 text-base text-terminal-cyan">
                    {formatNum(selected.reserves)} Mbbls
                  </div>
                </div>
              )}
              {selected.exports != null && (
                <div className="border border-terminal-border bg-[#0c0e12] p-3">
                  <div className="text-[10px] uppercase text-terminal-muted">
                    Exports
                  </div>
                  <div className="mt-1 text-base text-terminal-green">
                    {formatNum(selected.exports)} bbl/d
                  </div>
                </div>
              )}
              <div className="border border-terminal-border bg-[#0c0e12] p-3">
                <div className="text-[10px] uppercase text-terminal-muted">
                  Region
                </div>
                <div className="mt-1 text-[13px] text-[#c8d0e0]">
                  {selected.region}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <h2 className="text-[11px] uppercase tracking-wider text-terminal-amber">
              Top Oil Producers
            </h2>
            <div className="mt-3 flex flex-col gap-1">
              {topProducers.map((c, i) => (
                <button
                  key={c.iso3}
                  onClick={() => setSelected(c)}
                  className="flex items-center gap-3 rounded px-2 py-1.5 text-left hover:bg-[#0c0e12]"
                >
                  <span className="w-5 text-right text-[11px] text-terminal-muted">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[12px] text-[#c8d0e0]">
                    {c.name}
                  </span>
                  <span className="text-[12px] text-terminal-amber">
                    {formatNum(c.production)}
                  </span>
                  <span className="text-[10px] text-terminal-muted">bbl/d</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
