import { NextRequest, NextResponse } from "next/server";
import { sendReminder } from "@/lib/send-reminder";

export async function POST(req: NextRequest) {
  const { patientId } = await req.json();

  if (!patientId) {
    return NextResponse.json({ ok: false, reason: "patientId مطلوب" }, { status: 400 });
  }

  const result = await sendReminder(patientId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
