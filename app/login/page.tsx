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
  const { refresh, user } = useTelegramAuth();
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
      <div className="flex min-h-[calc(100dvh-3.25rem)] flex-col items-center justify-center px-4 py-10 font-mono text-[#c8d0e0]">
        <div className="w-full max-w-sm text-center">
          <p className="mb-2 text-[12px] uppercase tracking-wider text-[#5c6578]">
            Signed in
          </p>
          <p className="mb-8 text-sm">
            {user.firstName}
            {user.lastName ? ` ${user.lastName}` : ""}
            {user.username ? (
              <span className="text-[#5c6578]"> @{user.username}</span>
            ) : null}
          </p>
          <Link
            href="/"
            className="inline-block min-h-[2.75rem] border border-[#2a3140] px-5 py-2.5 text-[12px] uppercase text-[#00e5ff] hover:border-[#ffc107]"
          >
            Continue to app
          </Link>
        </div>
      </div>
    );
  }

  const hasOidc = CLIENT_ID.length > 0;
  const hasLegacy = BOT_USERNAME.length > 0;

  return (
    <div className="flex min-h-[calc(100dvh-3.25rem)] flex-col items-center justify-center px-4 py-10 font-mono text-[#c8d0e0]">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-8 text-sm font-normal text-[#ffc107]">Log in</h1>

        {!hasOidc && !hasLegacy ? (
          <p className="border border-[#ff5252]/40 bg-[#1f0d0d] px-4 py-3 text-left text-[12px] text-[#ff8a80]">
            Set{" "}
            <code className="text-[#ffc107]">NEXT_PUBLIC_TELEGRAM_CLIENT_ID</code>{" "}
            (recommended, from BotFather → Web Login) in{" "}
            <code className="text-[#ffc107]">.env.local</code>, or legacy{" "}
            <code className="text-[#ffc107]">
              NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
            </code>{" "}
            + <code className="text-[#ffc107]">TELEGRAM_BOT_TOKEN</code>. In
            BotFather, add Allowed URL: your exact login page (e.g.{" "}
            <code className="text-[#ffc107]">https://yoursite.com/login</code>
            ). Restart the dev server after changes.
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
              <p className="mt-4 text-[11px] text-[#5c6578]">Signing in…</p>
            )}
            {error && (
              <p className="mt-4 text-[12px] text-[#ff8a80]">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100dvh-3.25rem)] items-center justify-center px-4 font-mono text-[12px] text-[#5c6578]">
          Loading…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
