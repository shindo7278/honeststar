import { Resend } from "resend";
import twilio from "twilio";
import { createServiceClient } from "./supabase-server";

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

type Clinic = {
  id: string;
  name: string;
  doctor_name: string | null;
  google_review_link: string | null;
  default_channel: "whatsapp_first" | "email_only" | "both";
  message_template_male: string;
  message_template_female: string;
  plan_id: string;
  messages_used_this_cycle: number;
};

type Patient = {
  id: string;
  clinic_id: string;
  name: string;
  gender: "male" | "female";
  email: string | null;
  whatsapp_number: string | null;
};

const PLAN_QUOTAS: Record<string, number> = {
  basic: 250,
  standard: 450,
  pro: 700,
};

function buildMessage(clinic: Clinic, patient: Patient, trackingUrl: string) {
  const template =
    patient.gender === "female"
      ? clinic.message_template_female
      : clinic.message_template_male;

  return template
    .replace("{clinic_name}", clinic.doctor_name || clinic.name)
    .replace("{review_link}", trackingUrl);
}

export async function sendReminder(patientId: string) {
  const supabase = createServiceClient();

  const { data: patient, error: patientErr } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();

  if (patientErr || !patient) {
    return { ok: false, reason: "العميل غير موجود" };
  }

  const { data: clinic, error: clinicErr } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", patient.clinic_id)
    .single();

  if (clinicErr || !clinic) {
    return { ok: false, reason: "العيادة غير موجودة" };
  }

  // ---- Quota enforcement (subscription plans) ----
  const quota = PLAN_QUOTAS[clinic.plan_id] ?? 250;
  if (clinic.messages_used_this_cycle >= quota) {
    return {
      ok: false,
      reason: "تم الوصول لسقف الرسايل المسموح به في الباقة هذا الشهر",
    };
  }

  // ---- Decide which channel(s) to use ----
  const hasWhatsapp = !!patient.whatsapp_number;
  const hasEmail = !!patient.email;
  let channels: ("email" | "whatsapp")[] = [];

  if (clinic.default_channel === "email_only") {
    channels = hasEmail ? ["email"] : [];
  } else if (clinic.default_channel === "both") {
    channels = [
      ...(hasWhatsapp ? (["whatsapp"] as const) : []),
      ...(hasEmail ? (["email"] as const) : []),
    ];
  } else {
    // whatsapp_first (default): whatsapp if available, else email
    channels = hasWhatsapp ? ["whatsapp"] : hasEmail ? ["email"] : [];
  }

  if (channels.length === 0) {
    return { ok: false, reason: "لا يوجد بريد إلكتروني أو واتساب لهذا العميل" };
  }

  const results: { channel: string; ok: boolean }[] = [];

  for (const channel of channels) {
    // Create a log row first to get a tracking token for the click-redirect link
    const { data: logRow } = await supabase
      .from("message_log")
      .insert({ patient_id: patient.id, clinic_id: clinic.id, channel, status: "sent" })
      .select()
      .single();

    const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${logRow.tracking_token}`;
    const text = buildMessage(clinic as Clinic, patient as Patient, trackingUrl);

    try {
      if (channel === "email" && patient.email) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: patient.email,
          subject: `شكرًا لزيارتك ${clinic.doctor_name || clinic.name}`,
          text,
        });
      }
      if (channel === "whatsapp" && patient.whatsapp_number) {
        await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM,
          to: `whatsapp:${patient.whatsapp_number}`,
          body: text,
        });
      }
      results.push({ channel, ok: true });
    } catch (err) {
      await supabase
        .from("message_log")
        .update({ status: "failed" })
        .eq("id", logRow.id);
      results.push({ channel, ok: false });
    }
  }

  const anySuccess = results.some((r) => r.ok);

  await supabase
    .from("patients")
    .update({
      reminder_status: anySuccess ? "sent" : "failed",
      sent_at: anySuccess ? new Date().toISOString() : null,
      channel_used: channels.length === 2 ? "both" : channels[0],
    })
    .eq("id", patient.id);

  if (anySuccess) {
    await supabase
      .from("clinics")
      .update({ messages_used_this_cycle: clinic.messages_used_this_cycle + results.filter(r => r.ok).length })
      .eq("id", clinic.id);
  }

  return { ok: anySuccess, results };
}
