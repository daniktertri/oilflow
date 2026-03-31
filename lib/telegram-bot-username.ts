/** Bot username for `data-telegram-login` — must not include `@`. */
export function normalizeTelegramBotUsername(raw: string): string {
  return raw.trim().replace(/^@/, "");
}
