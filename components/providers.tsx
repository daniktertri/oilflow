"use client";

import { WalletProvider } from "@/components/wallet-provider";
import { TelegramAuthProvider } from "@/components/telegram-auth-provider";
import { FirstLoginTour } from "@/components/first-login-tour";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TelegramAuthProvider>
      <WalletProvider>
        {children}
        <FirstLoginTour />
      </WalletProvider>
    </TelegramAuthProvider>
  );
}
