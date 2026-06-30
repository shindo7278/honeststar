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
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-blue-pale flex items-center justify-center text-brand-deep">
          →
        </button>
        <div className="font-bold text-[16px]">إعدادات العيادة</div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="m-5 border border-gray-100 rounded-2xl p-4">
          <h3 className="font-bold text-[14.5px] mb-1">🔗 لينك تقييم جوجل</h3>
          <p className="text-xs text-ink-soft mb-3 leading-relaxed">
            حط رابط صفحة التقييم بتاعة عيادتك — كل العملاء هياخدوا هذا اللينك بالضبط.
          </p>
          <input
            value={reviewLink}
            onChange={(e) => setReviewLink(e.target.value)}
            placeholder="https://g.page/r/..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm"
          />
        </div>

        <div className="m-5 border border-gray-100 rounded-2xl p-4">
          <h3 className="font-bold text-[14.5px] mb-1">📡 القناة الافتراضية للإرسال</h3>
          <p className="text-xs text-ink-soft mb-3 leading-relaxed">
            النظام بيبعت من حساب Honeststar الموحّد. اختار إزاي يتصرف لو العميل عنده إيميل وواتساب الاتنين.
          </p>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm"
          >
            <option value="whatsapp_first">واتساب أولًا — وإيميل لو مفيش رقم</option>
            <option value="email_only">إيميل فقط (الأرخص)</option>
            <option value="both">إرسال على الاتنين معًا</option>
          </select>
        </div>

        <div className="m-5 border border-gray-100 rounded-2xl p-4">
          <h3 className="font-bold text-[14.5px] mb-2">⏰ التوقيت الافتراضي</h3>
          <select
            value={delayHours}
            onChange={(e) => setDelayHours(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm"
          >
            <option value="0">فورًا</option>
            <option value="1">بعد ساعة</option>
            <option value="2">بعد ساعتين</option>
            <option value="3">بعد 3 ساعات</option>
            <option value="6">بعد 6 ساعات</option>
            <option value="12">بعد 12 ساعة</option>
            <option value="24">بعد يوم</option>
            <option value="48">بعد يومين</option>
          </select>
        </div>

        <div className="m-5 border border-gray-100 rounded-2xl p-4">
          <h3 className="font-bold text-[14.5px] mb-3">📝 نص الرسالة</h3>
          <p className="text-xs text-ink-soft mb-1.5">للرجال:</p>
          <textarea
            value={templateMale}
            onChange={(e) => setTemplateMale(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm leading-relaxed min-h-[80px] mb-3"
          />
          <p className="text-xs text-ink-soft mb-1.5">للسيدات:</p>
          <textarea
            value={templateFemale}
            onChange={(e) => setTemplateFemale(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-bg text-sm leading-relaxed min-h-[80px]"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-brand-deep text-white font-bold text-[15.5px]"
        >
          {saved ? "✓ تم الحفظ" : "حفظ التغييرات"}
        </button>
      </div>
    </div>
  );
}
