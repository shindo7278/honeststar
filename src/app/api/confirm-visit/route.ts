import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { patientId } = await req.json();
  if (!patientId) {
    return NextResponse.json({ ok: false, reason: "patientId مطلوب" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*, clinics(default_delay_hours)")
    .eq("id", patientId)
    .single();

  if (!patient) {
    return NextResponse.json({ ok: false, reason: "العميل غير موجود" }, { status: 404 });
  }

  const delayHours =
    patient.requested_delay_hours ?? patient.clinics?.default_delay_hours ?? 2;

  const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

  // delay = 0 means "send immediately" — still goes through the same scheduled
  // path so the cron job picks it up within the next minute, keeping one code path.
  await supabase
    .from("patients")
    .update({
      visit_status: "completed",
      reminder_status: "scheduled",
      scheduled_send_at: scheduledAt,
    })
    .eq("id", patientId);

  return NextResponse.json({ ok: true, scheduledAt });
}
