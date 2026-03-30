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

/**
 * Official Telegram Login Widget — default Telegram button (no custom overlay).
 * @see https://core.telegram.org/widgets/login
 */
export function TelegramLoginWidget({ botUsername, onAuth }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  onAuthRef.current = onAuth;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !botUsername) return;

    el.replaceChildren();

    window.oilflowTelegramAuth = (user) => {
      void onAuthRef.current(user);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "oilflowTelegramAuth(user)");
    el.appendChild(script);

    return () => {
      el.replaceChildren();
      delete window.oilflowTelegramAuth;
    };
  }, [botUsername]);

  return (
    <div
      ref={containerRef}
      className="mx-auto flex w-full max-w-[320px] justify-center [&_iframe]:max-w-full"
    />
  );
}
