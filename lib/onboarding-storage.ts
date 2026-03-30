const PREFIX = "oilflow-onboarding-done:";

export function hasCompletedOnboarding(telegramId: number): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(`${PREFIX}${telegramId}`) === "1";
  } catch {
    return true;
  }
}

export function setOnboardingCompleted(telegramId: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${PREFIX}${telegramId}`, "1");
  } catch {
    /* ignore quota / private mode */
  }
}
