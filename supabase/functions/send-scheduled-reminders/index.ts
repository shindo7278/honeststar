// supabase/functions/send-scheduled-reminders/index.ts
//
// Deploy: supabase functions deploy send-scheduled-reminders
// Schedule: supabase functions schedule send-scheduled-reminders --cron "* * * * *"
// (runs every minute; picks up any patient whose scheduled_send_at has passed)

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const resendFrom = Deno.env.get("RESEND_FROM_EMAIL")!;
const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM")!;
const appUrl = Deno.env.get("PUBLIC_APP_URL")!;

const PLAN_QUOTAS: Record<string, number> = { basic: 250, standard: 450, pro: 700 };

function buildMessage(
  template: string,
  clinicLabel: string,
  trackingUrl: string
) {
  return template
    .replace("{clinic_name}", clinicLabel)
    .replace("{review_link}", trackingUrl);
}

async function sendEmail(to: string, subject: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: resendFrom, to, subject, text }),
  });
  return res.ok;
}

async function sendWhatsapp(to: string, body: string) {
  const creds = btoa(`${twilioSid}:${twilioToken}`);
  const form = new URLSearchParams({
    From: twilioFrom,
    To: `whatsapp:${to}`,
    Body: body,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    }
  );
  return res.ok;
}

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: duePatients, error } = await supabase
    .from("patients")
    .select("*, clinics(*)")
    .eq("reminder_status", "scheduled")
    .lte("scheduled_send_at", new Date().toISOString())
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error }), { status: 500 });
  }

  let processed = 0;

  for (const patient of duePatients || []) {
    const clinic = patient.clinics;
    if (!clinic) continue;

    const quota = PLAN_QUOTAS[clinic.plan_id] ?? 250;
    if (clinic.messages_used_this_cycle >= quota) {
      await supabase
        .from("patients")
        .update({ reminder_status: "failed" })
        .eq("id", patient.id);
      continue;
    }

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
      channels = hasWhatsapp ? ["whatsapp"] : hasEmail ? ["email"] : [];
    }

    if (channels.length === 0) {
      await supabase
        .from("patients")
        .update({ reminder_status: "failed" })
        .eq("id", patient.id);
      continue;
    }

    let anySuccess = false;
    let successCount = 0;

    for (const channel of channels) {
      const { data: logRow } = await supabase
        .from("message_log")
        .insert({ patient_id: patient.id, clinic_id: clinic.id, channel, status: "sent" })
        .select()
        .single();

      const trackingUrl = `${appUrl}/r/${logRow.tracking_token}`;
      const template =
        patient.gender === "female"
          ? clinic.message_template_female
          : clinic.message_template_male;
      const text = buildMessage(template, clinic.doctor_name || clinic.name, trackingUrl);

      let ok = false;
      if (channel === "email" && patient.email) {
        ok = await sendEmail(patient.email, `شكرًا لزيارتك ${clinic.doctor_name || clinic.name}`, text);
      } else if (channel === "whatsapp" && patient.whatsapp_number) {
        ok = await sendWhatsapp(patient.whatsapp_number, text);
      }

      if (!ok) {
        await supabase.from("message_log").update({ status: "failed" }).eq("id", logRow.id);
      } else {
        successCount++;
        anySuccess = true;
      }
    }

    await supabase
      .from("patients")
      .update({
        reminder_status: anySuccess ? "sent" : "failed",
        sent_at: anySuccess ? new Date().toISOString() : null,
        channel_used: channels.length === 2 ? "both" : channels[0],
      })
      .eq("id", patient.id);

    if (successCount > 0) {
      await supabase
        .from("clinics")
        .update({ messages_used_this_cycle: clinic.messages_used_this_cycle + successCount })
        .eq("id", clinic.id);
    }

    processed++;
  }

  return new Response(JSON.stringify({ ok: true, processed }), { status: 200 });
});
