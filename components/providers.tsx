"use client";

import { WalletProvider } from "@/components/wallet-provider";
import { TelegramAuthProvider } from "@/components/telegram-auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TelegramAuthProvider>
      <WalletProvider>{children}</WalletProvider>
    </TelegramAuthProvider>
  );
}
