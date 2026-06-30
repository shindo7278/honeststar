import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — used only in server-side API routes
// (sending reminders, updating message_log). Never expose to the browser.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
