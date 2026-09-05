import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <nav className="flex items-center gap-4 border-b border-neutral-200 px-6 py-3 text-sm dark:border-neutral-800">
      <Link href="/journal" className="font-medium">
        Journal
      </Link>
      <Link href="/journal/new" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        New Trade
      </Link>
      <Link href="/markets" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        Markets
      </Link>
      <Link href="/strategy" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        Strategy
      </Link>
      <Link href="/game-plan" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        Game Plan
      </Link>
      <Link href="/settings" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        Settings
      </Link>
    </nav>
  );
}
