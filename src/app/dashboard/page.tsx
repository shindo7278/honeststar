"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

type Clinic = {
  subscription_status: string;
  trial_messages_used: number;
  messages_used_this_cycle: number;
  plan_id: string;
};

type Patient = {
  id: string;
  name: string;
  gender: "male" | "female";
  reminder_status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  not_sent: { text: "في الانتظار", cls: "bg-amber-50 text-amber-700" },
  scheduled: { text: "مجدول ⏰", cls: "bg-amber-50 text-amber-700" },
  sent: { text: "مُرسل", cls: "bg-blue-pale text-brand-deep" },
  clicked: { text: "✓ تم الضغط", cls: "bg-green-50 text-green-700" },
  failed: { text: "فشل الإرسال", cls: "bg-red-50 text-red-700" },
};

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  async function loadPatients() {
    const { data: user } = await supabase.auth.getUser();
    const { data: member } = await supabase
      .from("clinic_members")
      .select("clinic_id")
      .eq("auth_user_id", user.user?.id)
      .single();

    if (member) {
      const { data: clinicData } = await supabase
        .from("clinics")
        .select("subscription_status, trial_messages_used, messages_used_this_cycle, plan_id")
        .eq("id", member.clinic_id)
        .single();
      setClinic(clinicData);
    }

    const { data } = await supabase
      .from("patients")
      .select("id, name, gender, reminder_status, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setPatients(data || []);
  }

  useEffect(() => {
    loadPatients();
  }, []);

  async function handleConfirmVisit(patientId: string) {
    setSendingId(patientId);
    const res = await fetch("/api/confirm-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId }),
    });
    const json = await res.json();
    setSendingId(null);

    if (json.ok) {
      setToast("تم الجدولة — هتتبعت الرسالة في وقتها تلقائيًا");
      loadPatients();
    } else {
      setToast(json.reason || "حصل خطأ");
    }
    setTimeout(() => setToast(""), 2500);
  }

  const sentToday = patients.filter((p) => p.reminder_status !== "not_sent").length;
  const clicked = patients.filter((p) => p.reminder_status === "clicked").length;
  const clickRate = sentToday ? Math.round((clicked / sentToday) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-gray-100">
        <div className="font-extrabold text-[19px] text-brand-deep">
          Honest<span className="text-ink">star</span>
        </div>
        <Link
          href="/admin"
          className="w-9 h-9 rounded-full bg-blue-pale flex items-center justify-center text-brand-deep"
        >
          ⚙
        </Link>
      </div>

      <div className="px-5 pt-5 pb-2">
        <div className="text-[13px] text-ink-soft font-semibold">صباح الخير 👋</div>
        <h2 className="text-[21px] font-extrabold mt-0.5">عيادتك</h2>
      </div>

      <div className="flex gap-2.5 px-5 mb-4">
        <div className="flex-1 bg-blue-pale rounded-2xl px-3.5 py-3">
          <div className="text-xl font-extrabold text-brand-deep">{sentToday}</div>
          <div className="text-[11.5px] text-ink-soft font-semibold mt-0.5">رسائل مُرسلة</div>
        </div>
        <div className="flex-1 bg-blue-pale rounded-2xl px-3.5 py-3">
          <div className="text-xl font-extrabold text-brand-deep">{clickRate}%</div>
          <div className="text-[11.5px] text-ink-soft font-semibold mt-0.5">نسبة الضغط</div>
        </div>
      </div>

      <button
        onClick={() => router.push("/add-patient")}
        className="mx-5 mb-4 py-4 rounded-2xl bg-brand-deep text-white text-center font-bold text-base shadow-lg shadow-brand-deep/20"
      >
        ＋ إضافة عميل جديد
      </button>

      {clinic?.subscription_status === "trialing" && (
        <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold text-amber-800">
              فترة التجربة المجانية
            </div>
            <div className="text-[12px] text-amber-700 mt-0.5">
              استخدمت {clinic.trial_messages_used} من 5 رسائل مجانية
            </div>
          </div>
          <Link
            href="/pricing"
            className="bg-amber-500 text-white text-[12px] font-bold px-3 py-1.5 rounded-xl"
          >
            اشترك الآن
          </Link>
        </div>
      )}

      <div className="px-5 text-[13px] font-bold text-ink-soft mb-2">عملاء اليوم</div>

      <div className="px-5 pb-24 flex-1 overflow-y-auto space-y-2.5">
        {patients.length === 0 && (
          <p className="text-sm text-ink-soft text-center py-10">
            لا يوجد عملاء بعد — دوس على "إضافة عميل جديد" للبدء
          </p>
        )}
        {patients.map((p) => {
          const status = STATUS_LABEL[p.reminder_status] || STATUS_LABEL.not_sent;
          const avatarCls =
            p.gender === "female"
              ? "bg-pinkish text-pinkish-deep"
              : "bg-blue-pale text-brand-deep";
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3.5"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base ${avatarCls}`}>
                {p.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[14.5px] truncate">{p.name}</div>
              </div>
              {p.reminder_status === "not_sent" ? (
                <button
                  onClick={() => handleConfirmVisit(p.id)}
                  disabled={sendingId === p.id}
                  className="bg-brand-deep text-white text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-60"
                >
                  {sendingId === p.id ? "..." : "تم — ابعت"}
                </button>
              ) : (
                <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap ${status.cls}`}>
                  {status.text}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-5 right-5 max-w-[390px] mx-auto bg-ink text-white px-4 py-3.5 rounded-2xl text-[13.5px] font-semibold text-center z-50">
          {toast}
        </div>
      )}
    </div>
  );
}