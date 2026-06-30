"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clinicName, setClinicName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("كلمة المرور لازم تكون 8 أحرف على الأقل");
      return;
    }

    setLoading(true);

    // 1) Create the auth user
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpErr || !signUpData.user) {
      setError(
        signUpErr?.message === "User already registered"
          ? "البريد الإلكتروني ده مسجل بالفعل"
          : "حصل خطأ أثناء إنشاء الحساب، حاول تاني"
      );
      setLoading(false);
      return;
    }

    // 2) Create the clinic row
    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .insert({
        name: clinicName,
        doctor_name: doctorName,
        owner_email: email,
      })
      .select()
      .single();

    if (clinicErr || !clinic) {
      setError("حصل خطأ أثناء إنشاء العيادة، حاول تاني");
      setLoading(false);
      return;
    }

    // 3) Link the auth user to the clinic as its owner
    const { error: memberErr } = await supabase.from("clinic_members").insert({
      clinic_id: clinic.id,
      auth_user_id: signUpData.user.id,
      role: "owner",
    });

    setLoading(false);

    if (memberErr) {
      setError("حصل خطأ أثناء ربط الحساب بالعيادة، تواصل معانا");
      return;
    }

    router.push("/pricing");
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-7 py-8">
      <div className="text-center mb-9">
        <span className="text-4xl block mb-2">✦</span>
        <h1 className="text-2xl font-extrabold text-brand-deep">إنشاء حساب جديد</h1>
        <p className="text-sm text-ink-soft mt-1.5">ابدأ تجربتك المجانية مع Honeststar</p>
      </div>

      <form onSubmit={handleSignup}>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">اسم العيادة</label>
          <input
            required
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder="مثال: عيادة النور"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">اسم الدكتور</label>
          <input
            required
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="د. أحمد المصري"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">البريد الإلكتروني</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="clinic@example.com"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">كلمة المرور</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 أحرف على الأقل"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>

        {error && <p className="text-sm text-pinkish-deep mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-brand-deep text-white font-bold text-[15.5px] mt-2 disabled:opacity-60"
        >
          {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
        </button>

        <p className="text-center text-[13px] text-ink-soft mt-5">
          عندك حساب بالفعل؟{" "}
          <a href="/login" className="text-brand-deep font-bold">
            تسجيل الدخول
          </a>
        </p>
      </form>
    </div>
  );
}
