import type { User } from "firebase/auth";

export function isAdmin(user: User | null): boolean {
  return user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}
