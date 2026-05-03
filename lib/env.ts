export function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  return process.env[name];
}

function isRealSupabaseValue(value: string | undefined) {
  if (!value) return false;
  if (value.startsWith("your-")) return false;
  return true;
}

export function hasSupabaseEnv() {
  return Boolean(
    isRealSupabaseValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      isRealSupabaseValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
      isRealSupabaseValue(process.env.SUPABASE_SECRET_KEY),
  );
}
