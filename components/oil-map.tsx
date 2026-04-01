"use client";

import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from "react-simple-maps";
import { Tooltip } from "react-tooltip";
import {
  COUNTRY_OIL_DATA,
  OIL_HUBS,
  GEOPOLITICAL_EVENTS,
  CHOKEPOINTS,
  MAJOR_PIPELINES,
  getProductionColor,
  type CountryOilData,
} from "@/lib/oil-data";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const ISO_NUMERIC_TO_ISO3: Record<string, string> = {
  "004":"AFG","008":"ALB","012":"DZA","020":"AND","024":"AGO","028":"ATG","032":"ARG",
  "036":"AUS","040":"AUT","044":"BHS","048":"BHR","050":"BGD","051":"ARM","052":"BRB",
  "056":"BEL","064":"BTN","068":"BOL","070":"BIH","072":"BWA","076":"BRA","084":"BLZ",
  "090":"SLB","096":"BRN","100":"BGR","104":"MMR","108":"BDI","116":"KHM","120":"CMR",
  "124":"CAN","140":"CAF","144":"LKA","148":"TCD","152":"CHL","156":"CHN","170":"COL",
  "174":"COM","178":"COG","180":"COD","188":"CRI","191":"HRV","192":"CUB","196":"CYP",
  "203":"CZE","204":"BEN","208":"DNK","214":"DOM","218":"ECU","818":"EGY","222":"SLV",
  "226":"GNQ","232":"ERI","233":"EST","231":"ETH","242":"FJI","246":"FIN","250":"FRA",
  "262":"DJI","266":"GAB","268":"GEO","276":"DEU","288":"GHA","300":"GRC","320":"GTM",
  "324":"GIN","328":"GUY","332":"HTI","340":"HND","348":"HUN","352":"ISL","356":"IND",
  "360":"IDN","364":"IRN","368":"IRQ","372":"IRL","376":"ISR","380":"ITA","388":"JAM",
  "392":"JPN","400":"JOR","398":"KAZ","404":"KEN","410":"KOR","414":"KWT","417":"KGZ",
  "418":"LAO","422":"LBN","426":"LSO","428":"LVA","430":"LBR","434":"LBY","440":"LTU",
  "442":"LUX","450":"MDG","454":"MWI","458":"MYS","466":"MLI","478":"MRT","480":"MUS",
  "484":"MEX","496":"MNG","498":"MDA","504":"MAR","508":"MOZ","512":"OMN","516":"NAM",
  "524":"NPL","528":"NLD","540":"NCL","554":"NZL","558":"NIC","562":"NER","566":"NGA",
  "578":"NOR","586":"PAK","591":"PAN","598":"PNG","600":"PRY","604":"PER","608":"PHL",
  "616":"POL","620":"PRT","634":"QAT","642":"ROU","643":"RUS","646":"RWA","682":"SAU",
  "686":"SEN","688":"SRB","694":"SLE","702":"SGP","703":"SVK","705":"SVN","706":"SOM",
  "710":"ZAF","716":"ZWE","724":"ESP","728":"SSD","729":"SDN","740":"SUR","748":"SWZ",
  "752":"SWE","756":"CHE","760":"SYR","762":"TJK","764":"THA","768":"TGO","780":"TTO",
  "784":"ARE","788":"TUN","792":"TUR","795":"TKM","800":"UGA","804":"UKR","826":"GBR",
  "834":"TZA","840":"USA","858":"URY","860":"UZB","862":"VEN","704":"VNM","887":"YEM",
  "894":"ZMB",
};

const SEVERITY_CONFIG: Record<string, { size: number; color: string; pulse: string }> = {
  critical: { size: 14, color: "#ff1744", pulse: "animate-pulse" },
  high: { size: 11, color: "#ff5252", pulse: "animate-pulse" },
  medium: { size: 9, color: "#ff9800", pulse: "" },
  low: { size: 7, color: "#ffc107", pulse: "" },
};

const CHOKEPOINT_RISK: Record<string, { color: string }> = {
  critical: { color: "#ff1744" },
  elevated: { color: "#ff9800" },
  normal: { color: "#00e5ff" },
};

const PIPELINE_STATUS: Record<string, { color: string; dash: string }> = {
  active: { color: "#66bb6a", dash: "" },
  disrupted: { color: "#ff5252", dash: "4,4" },
  proposed: { color: "#5c6578", dash: "2,6" },
};

const HUB_COLORS: Record<string, string> = {
  storage: "#00e5ff",
  refining: "#e040fb",
  trading: "#ffc107",
  export: "#ff9800",
};

type Layer = "production" | "conflicts" | "chokepoints" | "pipelines" | "hubs";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.5;

export default function OilMap() {
  const [selected, setSelected] = useState<CountryOilData | null>(null);
  const [tooltipContent, setTooltipContent] = useState("");
  const [layers, setLayers] = useState<Set<Layer>>(
    new Set(["production", "conflicts", "chokepoints", "hubs"])
  );
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [20, 20],
    zoom: 1,
  });

  const handleZoomIn = () => {
    setPosition((pos) => ({ ...pos, zoom: Math.min(pos.zoom + ZOOM_STEP, MAX_ZOOM) }));
  };

  const handleZoomOut = () => {
    setPosition((pos) => ({ ...pos, zoom: Math.max(pos.zoom - ZOOM_STEP, MIN_ZOOM) }));
  };

  const handleMoveEnd = (pos: { coordinates: [number, number]; zoom: number }) => {
    setPosition(pos);
  };

  const countryMap = useMemo(() => {
    const m = new Map<string, CountryOilData>();
    for (const c of COUNTRY_OIL_DATA) m.set(c.iso3, c);
    return m;
  }, []);

  const topProducers = useMemo(
    () => [...COUNTRY_OIL_DATA].sort((a, b) => b.production - a.production).slice(0, 15),
    []
  );

  const toggleLayer = (l: Layer) => {
    setLayers((prev) => {
      const s = new Set(prev);
      if (s.has(l)) s.delete(l);
      else s.add(l);
      return s;
    });
  };

  const handleGeoClick = (geo: { id: string }) => {
    const iso3 = ISO_NUMERIC_TO_ISO3[geo.id];
    if (iso3) {
      const c = countryMap.get(iso3);
      if (c) setSelected(c);
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative min-h-[400px] flex-1 bg-[#0c0e12]">
        {/* Layer toggles */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1">
          {(["production", "conflicts", "chokepoints", "pipelines", "hubs"] as Layer[]).map((l) => (
            <button
              key={l}
              onClick={() => toggleLayer(l)}
              className={`px-2 py-1 text-[10px] uppercase transition-colors ${
                layers.has(l)
                  ? l === "conflicts"
                    ? "border border-red-500/50 bg-red-500/20 text-red-300"
                    : l === "chokepoints"
                      ? "border border-cyan-500/50 bg-cyan-500/20 text-cyan-300"
                      : l === "pipelines"
                        ? "border border-green-500/50 bg-green-500/20 text-green-300"
                        : "border border-terminal-amber/50 bg-terminal-amber/20 text-terminal-amber"
                  : "border border-terminal-border bg-[#0a0c10]/80 text-terminal-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 160 }}
          className="h-full w-full"
          data-tooltip-id="map-tooltip"
        >
          <ZoomableGroup
            center={position.coordinates}
            zoom={position.zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onMoveEnd={handleMoveEnd}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const iso3 = ISO_NUMERIC_TO_ISO3[geo.id];
                  const country = iso3 ? countryMap.get(iso3) : null;
                  const fillColor =
                    layers.has("production") && country
                      ? getProductionColor(country.production)
                      : "#1e2430";

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => handleGeoClick(geo)}
                      onMouseEnter={() => {
                        if (country) {
                          setTooltipContent(`${country.name}: ${(country.production / 1000).toFixed(1)}M bbl/day`);
                        }
                      }}
                      onMouseLeave={() => setTooltipContent("")}
                      data-tooltip-id="map-tooltip"
                      data-tooltip-content={country ? `${country.name}: ${(country.production / 1000).toFixed(1)}M bbl/day` : ""}
                      style={{
                        default: { fill: fillColor, stroke: "#0c0e12", strokeWidth: 0.5, outline: "none" },
                        hover: { fill: country ? "#ffc107" : "#2a3040", stroke: "#0c0e12", strokeWidth: 0.5, outline: "none" },
                        pressed: { fill: "#ffc107", outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Pipelines layer */}
            {layers.has("pipelines") &&
              MAJOR_PIPELINES.map((p) => {
                const style = PIPELINE_STATUS[p.status] ?? PIPELINE_STATUS.active;
                return (
                  <Line
                    key={p.name}
                    from={[p.from.lng, p.from.lat]}
                    to={[p.to.lng, p.to.lat]}
                    stroke={style.color}
                    strokeWidth={1.5}
                    strokeDasharray={style.dash}
                    strokeLinecap="round"
                  />
                );
              })}

            {/* Hub markers */}
            {layers.has("hubs") &&
              OIL_HUBS.map((h) => (
                <Marker
                  key={h.name}
                  coordinates={[h.lng, h.lat]}
                  onMouseEnter={() => setTooltipContent(`${h.name}: ${h.description}`)}
                  onMouseLeave={() => setTooltipContent("")}
                >
                  <circle
                    r={3.5}
                    fill={HUB_COLORS[h.type] ?? "#ffc107"}
                    stroke="#0c0e12"
                    strokeWidth={0.5}
                    opacity={0.85}
                    data-tooltip-id="map-tooltip"
                    data-tooltip-content={`${h.name}: ${h.description}`}
                  />
                </Marker>
              ))}

            {/* Chokepoint markers */}
            {layers.has("chokepoints") &&
              CHOKEPOINTS.map((cp) => {
                const risk = CHOKEPOINT_RISK[cp.riskLevel] ?? CHOKEPOINT_RISK.normal;
                return (
                  <Marker
                    key={cp.name}
                    coordinates={[cp.lng, cp.lat]}
                    onMouseEnter={() =>
                      setTooltipContent(`${cp.name}: ${cp.flowMbblDay}M bbl/day — ${cp.description}`)
                    }
                    onMouseLeave={() => setTooltipContent("")}
                  >
                    <g transform="rotate(45)">
                      <rect
                        x={-5}
                        y={-5}
                        width={10}
                        height={10}
                        fill={risk.color}
                        stroke="#0c0e12"
                        strokeWidth={0.8}
                        opacity={0.9}
                        data-tooltip-id="map-tooltip"
                        data-tooltip-content={`${cp.name}: ${cp.flowMbblDay}M bbl/day`}
                      />
                    </g>
                    <text
                      textAnchor="middle"
                      y={-10}
                      className="fill-[#c8d0e0] text-[7px]"
                      style={{ fontFamily: "var(--font-jetbrains), monospace", pointerEvents: "none" }}
                    >
                      {cp.flowMbblDay}M
                    </text>
                  </Marker>
                );
              })}

            {/* Conflict markers */}
            {layers.has("conflicts") &&
              GEOPOLITICAL_EVENTS.map((ev) => {
                const sev = SEVERITY_CONFIG[ev.severity] ?? SEVERITY_CONFIG.low;
                return (
                  <Marker
                    key={ev.name}
                    coordinates={[ev.lng, ev.lat]}
                    onMouseEnter={() =>
                      setTooltipContent(`${ev.name}\n${ev.oilImpact}`)
                    }
                    onMouseLeave={() => setTooltipContent("")}
                  >
                    <circle
                      r={sev.size}
                      fill={sev.color}
                      opacity={0.2}
                      className={sev.pulse}
                      data-tooltip-id="map-tooltip"
                      data-tooltip-content={`${ev.name}: ${ev.oilImpact}`}
                    />
                    <circle
                      r={sev.size / 2.5}
                      fill={sev.color}
                      opacity={0.7}
                    />
                  </Marker>
                );
              })}
          </ZoomableGroup>
        </ComposableMap>

        <Tooltip
          id="map-tooltip"
          content={tooltipContent}
          className="!bg-[#1a1d28] !text-[11px] !text-[#c8d0e0] !border-terminal-border !rounded !px-3 !py-2 !max-w-[300px]"
          style={{ zIndex: 50 }}
        />

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-px">
          <button
            onClick={handleZoomIn}
            disabled={position.zoom >= MAX_ZOOM}
            className="flex h-8 w-8 items-center justify-center border border-terminal-border bg-[#0a0c10]/90 text-[16px] text-terminal-muted transition-colors hover:border-terminal-cyan hover:text-terminal-cyan disabled:opacity-30 disabled:hover:border-terminal-border disabled:hover:text-terminal-muted"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            disabled={position.zoom <= MIN_ZOOM}
            className="flex h-8 w-8 items-center justify-center border border-terminal-border bg-[#0a0c10]/90 text-[16px] text-terminal-muted transition-colors hover:border-terminal-cyan hover:text-terminal-cyan disabled:opacity-30 disabled:hover:border-terminal-border disabled:hover:text-terminal-muted"
          >
            −
          </button>
          <div className="mt-0.5 text-center text-[8px] text-terminal-muted">
            {position.zoom.toFixed(1)}×
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 rounded border border-terminal-border bg-[#0a0c10]/90 p-2">
          <div className="mb-1 text-[9px] uppercase tracking-wider text-terminal-muted">Legend</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px]">
            {layers.has("conflicts") && (
              <>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#ff1744]" />Critical</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#ff5252]" />High</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#ff9800]" />Medium</span>
              </>
            )}
            {layers.has("chokepoints") && (
              <>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rotate-45 bg-[#ff1744]" />Critical route</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rotate-45 bg-[#00e5ff]" />Normal route</span>
              </>
            )}
            {layers.has("pipelines") && (
              <>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 bg-[#66bb6a]" />Active pipe</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 border-t border-dashed border-[#ff5252]" />Disrupted</span>
              </>
            )}
            {layers.has("hubs") && (
              <>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#00e5ff]" />Storage</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#e040fb]" />Refining</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#ff9800]" />Export</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Side panel */}
      <aside className="w-full shrink-0 overflow-y-auto border-t border-terminal-border bg-terminal-panel lg:w-[300px] lg:border-l lg:border-t-0">
        {selected ? (
          <div className="p-3">
            <button
              onClick={() => setSelected(null)}
              className="mb-2 text-[10px] text-terminal-cyan hover:underline"
            >
              ← Back to rankings
            </button>
            <h2 className="text-[14px] font-medium text-terminal-amber">
              {selected.name}
            </h2>
            <div className="mt-2 space-y-1 text-[12px]">
              <div className="flex justify-between">
                <span className="text-terminal-muted">Production</span>
                <span className="text-[#e0e0e0]">
                  {(selected.production / 1000).toFixed(1)}M bbl/day
                </span>
              </div>
              {selected.reserves && (
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Reserves</span>
                  <span className="text-[#e0e0e0]">
                    {(selected.reserves / 1000).toFixed(1)}B bbl
                  </span>
                </div>
              )}
              {selected.exports && (
                <div className="flex justify-between">
                  <span className="text-terminal-muted">Exports</span>
                  <span className="text-[#e0e0e0]">
                    {(selected.exports / 1000).toFixed(1)}M bbl/day
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-terminal-muted">Region</span>
                <span className="text-[#e0e0e0]">{selected.region}</span>
              </div>
            </div>

            {/* Related conflicts */}
            {GEOPOLITICAL_EVENTS.filter(
              (ev) =>
                ev.name.toLowerCase().includes(selected.name.toLowerCase()) ||
                ev.name.toLowerCase().includes(selected.iso3.toLowerCase())
            ).map((ev) => (
              <div
                key={ev.name}
                className="mt-3 rounded border border-red-500/30 bg-red-500/5 p-2"
              >
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#ff1744]" />
                  <span className="text-[11px] font-medium text-red-400">
                    {ev.name}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-[#9ca3af]">
                  {ev.oilImpact}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3">
            <h2 className="text-[11px] uppercase tracking-wider text-terminal-amber">
              Top Oil Producers
            </h2>
            <div className="mt-2 space-y-1">
              {topProducers.map((c, i) => (
                <button
                  key={c.iso3}
                  onClick={() => setSelected(c)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[#0c0e12]"
                >
                  <span className="w-4 text-right text-[10px] text-terminal-muted">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-[12px] text-[#c8d0e0]">
                    {c.name}
                  </span>
                  <span className="text-[11px] text-terminal-amber">
                    {(c.production / 1000).toFixed(1)}M
                  </span>
                </button>
              ))}
            </div>

            {/* Conflict summary */}
            <h3 className="mt-4 text-[11px] uppercase tracking-wider text-red-400">
              Active Conflicts
            </h3>
            <div className="mt-2 space-y-1.5">
              {GEOPOLITICAL_EVENTS.filter((e) =>
                e.severity === "critical" || e.severity === "high"
              ).map((ev) => (
                <div
                  key={ev.name}
                  className="rounded border border-red-500/20 bg-red-500/5 px-2 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        ev.severity === "critical" ? "bg-[#ff1744] animate-pulse" : "bg-[#ff5252]"
                      }`}
                    />
                    <span className="text-[10px] font-medium text-red-300">
                      {ev.name}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[9px] text-[#9ca3af]">
                    {ev.oilImpact}
                  </p>
                </div>
              ))}
            </div>

            {/* Chokepoint summary */}
            <h3 className="mt-4 text-[11px] uppercase tracking-wider text-cyan-400">
              Key Chokepoints
            </h3>
            <div className="mt-2 space-y-1">
              {CHOKEPOINTS.filter((c) => c.riskLevel !== "normal").map((cp) => (
                <div
                  key={cp.name}
                  className="flex items-center justify-between rounded px-2 py-1 text-[10px]"
                >
                  <span className="text-[#c8d0e0]">{cp.name}</span>
                  <span
                    className={
                      cp.riskLevel === "critical"
                        ? "text-red-400"
                        : "text-amber-400"
                    }
                  >
                    {cp.flowMbblDay}M bbl/day
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
