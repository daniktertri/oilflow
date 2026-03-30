"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { useTelegramAuth } from "@/components/telegram-auth-provider";
import {
  TelegramLoginWidget,
  type TelegramWidgetUser,
} from "@/components/telegram-login-widget";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const { refresh, user } = useTelegramAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        await refresh();
        router.push(next.startsWith("/") ? next : "/");
        router.refresh();
      } catch {
        setError("Network error");
      } finally {
        setBusy(false);
      }
    },
    [refresh, router, next]
  );

  if (user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 font-mono text-[#c8d0e0]">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-[#5c6578]">
          Signed in
        </p>
        <p className="mb-6 text-sm">
          {user.firstName}
          {user.lastName ? ` ${user.lastName}` : ""}
          {user.username ? (
            <span className="text-[#5c6578]"> @{user.username}</span>
          ) : null}
        </p>
        <Link
          href="/"
          className="inline-block border border-[#2a3140] px-4 py-2 text-[11px] uppercase text-[#00e5ff] hover:border-[#ffc107]"
        >
          Continue to app
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 font-mono text-[#c8d0e0]">
      <h1 className="mb-2 text-sm font-normal text-[#ffc107]">Log in</h1>
      <p className="mb-6 text-[11px] leading-relaxed text-[#5c6578]">
        Use your Telegram account. The button loads Telegram&apos;s official
        widget; your password never touches this site.
      </p>

      {!BOT_USERNAME ? (
        <p className="border border-[#ff5252]/40 bg-[#1f0d0d] px-3 py-2 text-[11px] text-[#ff8a80]">
          Set{" "}
          <code className="text-[#ffc107]">
            NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
          </code>{" "}
          and{" "}
          <code className="text-[#ffc107]">TELEGRAM_BOT_TOKEN</code> in{" "}
          <code className="text-[#ffc107]">.env.local</code>, then restart the
          dev server.
        </p>
      ) : (
        <>
          <div className={busy ? "pointer-events-none opacity-50" : ""}>
            <TelegramLoginWidget
              botUsername={BOT_USERNAME}
              onAuth={onTelegramAuth}
            />
          </div>
          {busy && (
            <p className="mt-3 text-[10px] text-[#5c6578]">Signing in…</p>
          )}
          {error && (
            <p className="mt-3 text-[11px] text-[#ff8a80]">{error}</p>
          )}
        </>
      )}

      <p className="mt-10 text-[10px] leading-relaxed text-[#5c6578]">
        Bot setup: create a bot with{" "}
        <a
          href="https://t.me/BotFather"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00e5ff] hover:underline"
        >
          @BotFather
        </a>
        , run{" "}
        <code className="text-[#c8d0e0]">/setdomain</code> and set your site
        origin (e.g. <code className="text-[#c8d0e0]">localhost</code> for dev
        or your production host). Use the bot username (no @) in{" "}
        <code className="text-[#c8d0e0]">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>
        .
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-16 font-mono text-[11px] text-[#5c6578]">
          Loading…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
