"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { TelegramOidcLogin } from "@/components/telegram-oidc-login";
import { useTelegramAuth } from "@/components/telegram-auth-provider";
import {
  TelegramLoginWidget,
  type TelegramWidgetUser,
} from "@/components/telegram-login-widget";
import { normalizeTelegramBotUsername } from "@/lib/telegram-bot-username";

const CLIENT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID?.trim() ?? "";
const BOT_USERNAME = normalizeTelegramBotUsername(
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ""
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const { refresh, user, logout } = useTelegramAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finishLogin = useCallback(async () => {
    await refresh();
    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  }, [refresh, router, next]);

  const onOidcToken = useCallback(
    async (idToken: string) => {
      setError(null);
      setBusy(true);
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: idToken }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Login failed");
          return;
        }
        await finishLogin();
      } catch {
        setError("Network error");
      } finally {
        setBusy(false);
      }
    },
    [finishLogin]
  );

  const onTelegramAuth = useCallback(
    async (tg: TelegramWidgetUser) => {
      setError(null);
      setBusy(true);
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tg),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Login failed");
          return;
        }
        await finishLogin();
      } catch {
        setError("Network error");
      } finally {
        setBusy(false);
      }
    },
    [finishLogin]
  );

  if (user) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <p className="mb-2 text-[12px] uppercase tracking-wider text-terminal-muted">
            Signed in
          </p>
          <p className="mb-2 text-sm text-[#c8d0e0]">
            {user.firstName}
            {user.lastName ? ` ${user.lastName}` : ""}
            {user.username ? (
              <span className="text-terminal-muted"> @{user.username}</span>
            ) : null}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="inline-block border border-terminal-border px-5 py-2.5 text-[12px] uppercase text-terminal-cyan hover:border-terminal-amber"
            >
              Go to Terminal
            </Link>
            <button
              onClick={() => void logout()}
              className="text-[11px] text-terminal-muted hover:text-terminal-red"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasOidc = CLIENT_ID.length > 0;
  const hasLegacy = BOT_USERNAME.length > 0;

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-lg text-terminal-amber">OilFlow Terminal</h1>
        <p className="mb-8 text-[12px] text-terminal-muted">
          Log in with Telegram to access alerts and personalized settings
        </p>

        {!hasOidc && !hasLegacy ? (
          <p className="border border-terminal-red/40 bg-[#1f0d0d] px-4 py-3 text-left text-[12px] text-[#ff8a80]">
            Set{" "}
            <code className="text-terminal-amber">NEXT_PUBLIC_TELEGRAM_CLIENT_ID</code>{" "}
            in <code className="text-terminal-amber">.env.local</code> to enable Telegram login.
          </p>
        ) : (
          <>
            <div
              className={`flex flex-col items-center ${busy ? "pointer-events-none opacity-50" : ""}`}
            >
              {hasOidc ? (
                <TelegramOidcLogin
                  clientId={CLIENT_ID}
                  onToken={onOidcToken}
                  onOidcError={(msg) =>
                    setError(msg === "popup_closed" ? "Login cancelled" : msg)
                  }
                />
              ) : (
                <TelegramLoginWidget
                  botUsername={BOT_USERNAME}
                  onAuth={onTelegramAuth}
                />
              )}
            </div>
            {busy && (
              <p className="mt-4 text-[11px] text-terminal-muted">Signing in...</p>
            )}
            {error && (
              <p className="mt-4 text-[12px] text-[#ff8a80]">{error}</p>
            )}
          </>
        )}

        <div className="mt-8 border-t border-terminal-border pt-4">
          <p className="text-[11px] text-terminal-muted">
            The terminal is fully accessible without login. Authentication is only needed for price alerts and notification preferences.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-[12px] text-terminal-muted">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
