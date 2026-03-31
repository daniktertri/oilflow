import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  verifySession,
} from "@/lib/auth-session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw || !verifySession(raw)) {
    redirect("/login");
  }
  return <>{children}</>;
}
