"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-7 py-8">
      <div className="text-center mb-12">
        <span className="text-4xl block mb-2">✦</span>
        <h1 className="text-2xl font-extrabold text-brand-deep">Honeststar</h1>
        <p className="text-sm text-ink-soft mt-1.5">تذكير العملاء بتقييم جوجل بسهولة</p>
      </div>

      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="clinic@example.com"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-blue-pale/30 text-[15px] focus:outline-none focus:border-brand"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">
            كلمة المرور
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-blue-pale/30 text-[15px] focus:outline-none focus:border-brand"
          />
        </div>

        {error && <p className="text-sm text-pinkish-deep mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-brand-deep text-white font-bold text-[15.5px] mt-2 disabled:opacity-60"
        >
          {loading ? "جاري الدخول..." : "تسجيل الدخول"}
        </button>

        <p className="text-center text-[13px] text-ink-soft mt-5">
          عيادة جديدة؟{" "}
          <a href="/signup" className="text-brand-deep font-bold">
            إنشاء حساب
          </a>
        </p>
      </form>
    </div>
  );
}