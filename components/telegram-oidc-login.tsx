"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type OidcResult = {
  id_token?: string;
  user?: Record<string, unknown>;
  error?: string;
};

declare global {
  interface Window {
    Telegram?: {
      Login: {
        init: (
          opts: {
            client_id: number;
            request_access?: string[];
            lang?: string;
          },
          cb?: (r: OidcResult) => void
        ) => void;
        open: (cb?: (r: OidcResult) => void) => void;
        auth: (
          opts: {
            client_id: number;
            request_access?: string[];
            lang?: string;
          },
          cb?: (r: OidcResult) => void
        ) => void;
      };
    };
  }
}

const SCRIPT_PREFIX = "https://oauth.telegram.org/js/telegram-login.js";

type Props = {
  clientId: string;
  onToken: (idToken: string) => void | Promise<void>;
  /** Popup or Telegram-side error (e.g. popup_closed). */
  onOidcError?: (message: string) => void;
};

/**
 * Telegram Login (OIDC) — official script from oauth.telegram.org.
 * Popup uses postMessage; register `location.origin + location.pathname` in BotFather Allowed URLs.
 * @see https://oauth.telegram.org
 */
export function TelegramOidcLogin({
  clientId,
  onToken,
  onOidcError,
}: Props) {
  const [ready, setReady] = useState(false);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const onOidcErrorRef = useRef(onOidcError);
  onOidcErrorRef.current = onOidcError;

  useEffect(() => {
    const idNum = Number(clientId);
    if (!clientId || !Number.isFinite(idNum) || idNum <= 0) return;

    if (window.Telegram?.Login) {
      setReady(true);
      return;
    }

    let cancelled = false;
    const scripts = document.querySelectorAll("script[src]");
    let script: HTMLScriptElement | null = null;
    for (const s of scripts) {
      const el = s as HTMLScriptElement;
      if (el.src.startsWith(SCRIPT_PREFIX)) {
        script = el;
        break;
      }
    }

    const markReady = () => {
      if (!cancelled && window.Telegram?.Login) setReady(true);
    };

    if (script?.dataset.loaded === "1") {
      markReady();
      return () => {
        cancelled = true;
      };
    }

    const el = script ?? document.createElement("script");
    if (!script) {
      el.src = `${SCRIPT_PREFIX}?3`;
      el.async = true;
      document.body.appendChild(el);
    }

    el.addEventListener("load", () => {
      el.dataset.loaded = "1";
      markReady();
    });
    el.addEventListener("error", () => {
      if (!cancelled) setReady(false);
    });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const handleClick = useCallback(() => {
    const idNum = Number(clientId);
    if (!Number.isFinite(idNum) || idNum <= 0 || !window.Telegram?.Login) return;

    window.Telegram.Login.auth(
      { client_id: idNum, request_access: ["write"] },
      (result) => {
        if (result?.error) {
          onOidcErrorRef.current?.(result.error);
          return;
        }
        const token = result?.id_token;
        if (typeof token === "string" && token.length > 0) {
          void onTokenRef.current(token);
        }
      }
    );
  }, [clientId]);

  return (
    <div className="mx-auto flex w-full max-w-[320px] flex-col items-center gap-2">
      <button
        type="button"
        disabled={!ready}
        onClick={handleClick}
        className="rounded-[22px] bg-[#119AF5] px-7 py-2.5 text-[16px] font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:bg-[#1090E5] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Log in with Telegram"
      >
        Log in with Telegram
      </button>
      {!ready && (
        <p className="text-[11px] text-[#5c6578]">Loading Telegram…</p>
      )}
    </div>
  );
}
