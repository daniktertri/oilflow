import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SideNav } from "@/components/side-nav";
import { TickerBar } from "@/components/ticker-bar";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "OilFlow Terminal — Oil Market Intelligence",
  description:
    "Real-time oil market monitoring terminal. Track WTI, Brent, OPEC prices, global production, news, and AI-powered market analysis.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "OilFlow Terminal",
    description: "Bloomberg-style oil market intelligence dashboard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrains.variable}>
      <body className="antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <SideNav />
            <div className="flex min-w-0 flex-1 flex-col">
              <TickerBar />
              <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
