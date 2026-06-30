import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: log } = await supabase
    .from("message_log")
    .select("*, clinics(google_review_link), patients(id)")
    .eq("tracking_token", token)
    .single();

  if (!log) {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL!);
  }

  if (!log.clicked) {
    await supabase
      .from("message_log")
      .update({ clicked: true, clicked_at: new Date().toISOString() })
      .eq("tracking_token", token);

    await supabase
      .from("patients")
      .update({ reminder_status: "clicked", clicked_at: new Date().toISOString() })
      .eq("id", log.patients.id);
  }

  const destination = log.clinics?.google_review_link || process.env.NEXT_PUBLIC_APP_URL!;
  return NextResponse.redirect(destination);
}