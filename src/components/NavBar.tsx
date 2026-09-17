"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/outfit", label: "Outfit" },
  { href: "/wardrobe", label: "Wardrobe" },
];

/**
 * Persistent bottom nav so every page (including "Add an item", which has no
 * other way back) can jump to Home / Outfit / Wardrobe without editing the
 * URL by hand. Fixed to the bottom since this app is meant to be used
 * one-handed on a phone. Hidden on the login page, and includes sign out
 * since there's no other settings/account area yet.
 */
export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="sticky bottom-0 z-10 border-t border-black/10 bg-white">
      <div className="mx-auto flex max-w-2xl">
        {LINKS.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 py-3 text-center text-sm font-medium ${
                active ? "text-black" : "text-black/40"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <button
          onClick={signOut}
          className="flex-1 py-3 text-center text-sm font-medium text-black/40"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
