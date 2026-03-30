"use client";

import { useEffect, useRef } from "react";

export type TelegramWidgetUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    oilflowTelegramAuth?: (user: TelegramWidgetUser) => void;
  }
}

type Props = {
  botUsername: string;
  onAuth: (user: TelegramWidgetUser) => void | Promise<void>;
};

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M21.944 4.708c.208-.83-.528-1.515-1.33-1.32L2.56 8.77c-.85.22-.893 1.492-.062 1.78l4.797 1.65 1.85 5.993c.118.384.51.55.826.318l2.687-1.96 5.69 4.146c.66.48 1.58.05 1.752-.79l3.84-18.06z" />
    </svg>
  );
}

/**
 * Official Telegram Login Widget (invisible iframe stretched over a custom button).
 * @see https://core.telegram.org/widgets/login
 */
export function TelegramLoginWidget({ botUsername, onAuth }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    window.oilflowTelegramAuth = (user) => {
      void onAuthRef.current(user);
    };
    return () => {
      delete window.oilflowTelegramAuth;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !botUsername) return;

    el.replaceChildren();
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "oilflowTelegramAuth(user)");
    el.appendChild(script);

    const stretchIframe = () => {
      const iframe = el.querySelector("iframe");
      if (!iframe) return;
      iframe.setAttribute("title", "Login with Telegram");
      iframe.setAttribute(
        "style",
        "position:absolute!important;left:0;top:0;width:100%!important;height:100%!important;opacity:0!important;border:0!important;cursor:pointer!important"
      );
    };

    stretchIframe();
    const observer = new MutationObserver(stretchIframe);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      el.replaceChildren();
    };
  }, [botUsername]);

  return (
    <div
      className="relative mx-auto h-14 w-full max-w-[320px]"
      role="group"
      aria-label="Login with Telegram"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center gap-3 rounded-lg border border-white/10 bg-[#229ED9] px-5 font-mono text-[13px] font-medium tracking-wide text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
        aria-hidden
      >
        <TelegramGlyph className="h-5 w-5 shrink-0" />
        <span>Login with Telegram</span>
      </div>
      <div
        ref={containerRef}
        className="relative z-10 h-full min-h-[56px] w-full overflow-hidden rounded-lg"
      />
    </div>
  );
}
