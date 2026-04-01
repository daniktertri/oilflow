"use client";

import { TelegramAuthProvider } from "@/components/telegram-auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <TelegramAuthProvider>{children}</TelegramAuthProvider>;
}
