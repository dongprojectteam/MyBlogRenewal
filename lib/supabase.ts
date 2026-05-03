import { createClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";

export function getSupabaseAdminClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}

export function getSupabasePublicClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}
