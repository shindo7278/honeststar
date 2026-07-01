"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clinicId, setClinicId] = useState<string | null>(null);
  const [reviewLink, setReviewLink] = useState("");
  const [channel, setChannel] = useState("whatsapp_first");
  const [delayHours, setDelayHours] = useState("2");
  const [templateMale, setTemplateMale] = useState("");
  const [templateFemale, setTemplateFemale] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from("clinic_members")
        .select("clinic_id")
        .eq("auth_user_id", user.user?.id)
        .single();
      if (!member) return;

      const { data: clinic } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", member.clinic_id)
        .single();

      if (clinic) {
        setClinicId(clinic.id);
        setReviewLink(clinic.google_review_link || "");
        setChannel(clinic.default_channel);
        setDelayHours(String(clinic.default_delay_hours));
        setTemplateMale(clinic.message_template_male);
        setTemplateFemale(clinic.message_template_female);
      }
    }
    load();
  }, []);

  async function handleSave() {
    if (!clinicId) return;
    await supabase
      .from("clinics")
      .update({
        google_review_link: reviewLink,
        default_channel: channel,
        default_delay_hours: Number(delayHours),
        message_template_male: templateMale,
        message_template_female: templateFemale,
      })
      .eq("id", clinicId);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-gray-100">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-blue-pale flex items-center justify-center text-brand-deep text-lg">←</button>
        <div className="font-bold text-[16px]">Clinic Settings</div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="m-5 border border-gray-100 rounded-2xl p-4">
          <h3 className="font-bold text-[14.5px] mb-1">🔗 Google Review Link</h3>
          <p className="text-xs text-ink-soft mb-3 leading-relaxed">
            Paste your clinic's Google review page link — all patients will receive this exact link.
          </p>
          <input
            value={reviewLink}
            onChange={(e) => setReviewLink(e.target.value)}
            placeholder="https://g.page/r/..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm"
          />
        </div>

        <div className="m-5 border border-gray-100 rounded-2xl p-4">
          <h3 className="font-bold text-[14.5px] mb-1">📡 Default Send Channel</h3>
          <p className="text-xs text-ink-soft mb-3 leading-relaxed">
            All messages are sent from Honeststar's central account. Choose how to handle patients with both email and WhatsApp.
          </p>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm"
          >
            <option value="whatsapp_first">WhatsApp first — email if no number</option>
            <option value="email_only">Email only</option>
            <option value="both">Send on both channels</option>
          </select>
        </div>

        <div className="m-5 border border-gray-100 rounded-2xl p-4">
          <h3 className="font-bold text-[14.5px] mb-2">⏰ Default Send Timing</h3>
          <select
            value={delayHours}
            onChange={(e) => setDelayHours(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm"
          >
            <option value="0">Immediately</option>
            <option value="1">After 1 hour</option>
            <option value="2">After 2 hours</option>
            <option value="3">After 3 hours</option>
            <option value="6">After 6 hours</option>
            <option value="12">After 12 hours</option>
            <option value="24">After 1 day</option>
            <option value="48">After 2 days</option>
          </select>
        </div>

        <div className="m-5 border border-gray-100 rounded-2xl p-4">
          <h3 className="font-bold text-[14.5px] mb-3">📝 Message Templates</h3>
          <p className="text-xs text-ink-soft mb-1.5">For male patients:</p>
          <textarea
            value={templateMale}
            onChange={(e) => setTemplateMale(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm leading-relaxed min-h-[80px] mb-3"
          />
          <p className="text-xs text-ink-soft mb-1.5">For female patients:</p>
          <textarea
            value={templateFemale}
            onChange={(e) => setTemplateFemale(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm leading-relaxed min-h-[80px]"
          />
          <p className="text-xs text-ink-soft mt-2">Use <code>{"{clinic_name}"}</code> and <code>{"{review_link}"}</code> as placeholders.</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-brand-deep text-white font-bold text-[15.5px]"
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
