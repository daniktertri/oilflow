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
 * Embeds the official Telegram Login Widget script.
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
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "oilflowTelegramAuth(user)");
    el.appendChild(script);

    return () => {
      el.replaceChildren();
    };
  }, [botUsername]);

  return <div ref={containerRef} className="min-h-[40px]" />;
}
