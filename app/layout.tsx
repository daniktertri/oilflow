import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { AppNav } from "@/components/app-nav";
import { Providers } from "@/components/providers";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "OilFlow — AI WTI oil trading",
  description:
    "Automated WTI crude oil trading with AI on Hyperliquid (USDC margin)",
  icons: {
    icon: "/favicon.svg",
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
          <AppNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
