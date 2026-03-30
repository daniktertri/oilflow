export type SessionUser = {
  /** Neon `users.id` — present after login once DB is configured */
  id?: string;
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
};
