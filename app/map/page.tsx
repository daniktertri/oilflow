"use client";

import dynamic from "next/dynamic";

const OilMap = dynamic(() => import("@/components/oil-map").then((m) => m.OilMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[12px] text-terminal-muted">
      Loading map...
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="h-full">
      <OilMap />
    </div>
  );
}
