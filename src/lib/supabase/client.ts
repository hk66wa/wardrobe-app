import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Safe to use in client components.
// Reads the public URL + anon key from env vars set in .env.local
// (copy .env.local.example -> .env.local and fill in your Supabase project details).
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Copy .env.local.example to .env.local and fill in " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from your Supabase project settings."
    );
  }

  return createBrowserClient(url, anonKey);
}
