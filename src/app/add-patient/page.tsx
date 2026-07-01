"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AddPatientPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [delayOption, setDelayOption] = useState("2");
  const [customHours, setCustomHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email && !whatsapp) {
      setError("Please enter at least an email or a WhatsApp number.");
      return;
    }

    const finalDelayHours = delayOption === "custom" ? Number(customHours) : Number(delayOption);
    if (delayOption === "custom" && (!customHours || isNaN(finalDelayHours) || finalDelayHours < 0)) {
      setError("Please enter a valid number of hours.");
      return;
    }

    setSaving(true);

    const { data: clinicMember } = await supabase.auth.getUser();
    const { data: member } = await supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("auth_user_id", clinicMember.user?.id)
      .single();

    const { error: insertErr } = await supabase.from("patients").insert({
      clinic_id: member?.clinic_id,
      name,
      gender,
      email: email || null,
      whatsapp_number: whatsapp || null,
      visit_status: "pending",
      reminder_status: "not_sent",
      requested_delay_hours: finalDelayHours,
    });

    setSaving(false);

    if (insertErr) {
      setError("Something went wrong. Please try again.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-gray-100">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-blue-pale flex items-center justify-center text-brand-deep text-lg">←</button>
        <div className="font-bold text-[16px]">New Patient</div>
        <div className="w-9" />
      </div>

      <form onSubmit={handleSave} className="px-5 py-4 pb-24 flex-1 overflow-y-auto">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">Patient name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sarah Johnson"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>

        <label className="block text-sm font-semibold text-ink-soft mb-2">
          Gender — used to personalise the message
        </label>
        <div className="flex gap-2.5 mb-3">
          <button
            type="button"
            onClick={() => setGender("male")}
            className={`flex-1 py-4 rounded-2xl border-[1.5px] text-center transition-colors ${
              gender === "male" ? "border-brand bg-blue-pale" : "border-gray-200 bg-bg"
            }`}
          >
            <span className="text-2xl block mb-1.5">♂</span>
            <span className={`text-[13.5px] font-bold ${gender === "male" ? "text-brand-deep" : "text-ink-soft"}`}>Male</span>
          </button>
          <button
            type="button"
            onClick={() => setGender("female")}
            className={`flex-1 py-4 rounded-2xl border-[1.5px] text-center transition-colors ${
              gender === "female" ? "border-pinkish-deep bg-pinkish" : "border-gray-200 bg-bg"
            }`}
          >
            <span className="text-2xl block mb-1.5">♀</span>
            <span className={`text-[13.5px] font-bold ${gender === "female" ? "text-pinkish-deep" : "text-ink-soft"}`}>Female</span>
          </button>
        </div>
        <div className="bg-blue-pale rounded-xl px-3.5 py-2.5 text-[12px] text-brand-deep font-semibold leading-relaxed mb-4">
          💡 The reminder will be personalised based on the selected gender
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="patient@email.com"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">WhatsApp number</label>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+44 7xxx xxxxxx"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>
        <div className="mb-5">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">Send reminder</label>
          <select
            value={delayOption}
            onChange={(e) => setDelayOption(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px]"
          >
            <option value="2">Default — 2 hours after appointment</option>
            <option value="0">Immediately</option>
            <option value="1">After 1 hour</option>
            <option value="3">After 3 hours</option>
            <option value="6">After 6 hours</option>
            <option value="12">After 12 hours</option>
            <option value="24">After 1 day</option>
            <option value="48">After 2 days</option>
            <option value="custom">Custom (enter hours)</option>
          </select>
          {delayOption === "custom" && (
            <input
              type="number"
              min={0}
              placeholder="Number of hours (e.g. 5)"
              value={customHours}
              onChange={(e) => setCustomHours(e.target.value)}
              className="w-full mt-2.5 px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px]"
            />
          )}
        </div>

        {error && <p className="text-sm text-pinkish-deep mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-brand-deep text-white font-bold text-[15.5px] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Patient"}
        </button>
      </form>
    </div>
  );
}
