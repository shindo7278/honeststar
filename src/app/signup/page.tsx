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
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });

    if (signUpErr || !signUpData.user) {
      setError(
        signUpErr?.message === "User already registered"
          ? "This email is already registered."
          : "Something went wrong. Please try again."
      );
      setLoading(false);
      return;
    }

    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .insert({ name: clinicName, doctor_name: doctorName, owner_email: email })
      .select()
      .single();

    if (clinicErr || !clinic) {
      setError("Could not create clinic. Please try again.");
      setLoading(false);
      return;
    }

    const { error: memberErr } = await supabase.from("clinic_members").insert({
      clinic_id: clinic.id,
      auth_user_id: signUpData.user.id,
      role: "owner",
    });

    setLoading(false);

    if (memberErr) {
      setError("Account created but linking failed. Please contact support.");
      return;
    }

    router.push("/pricing");
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-7 py-8">
      <div className="text-center mb-9">
        <span className="text-4xl block mb-2">✦</span>
        <h1 className="text-2xl font-extrabold text-brand-deep">Create your account</h1>
        <p className="text-sm text-ink-soft mt-1.5">Start your free trial with Honeststar</p>
      </div>

      <form onSubmit={handleSignup}>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">Clinic name</label>
          <input
            required
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
            placeholder="e.g. Bright Smile Dental"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">Doctor name</label>
          <input
            required
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="Dr. Sarah Johnson"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">Email address</label>
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
          <label className="block text-sm font-semibold text-ink-soft mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-bg text-[15px] focus:outline-none focus:border-brand"
          />
        </div>

        {error && <p className="text-sm text-pinkish-deep mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-brand-deep text-white font-bold text-[15.5px] mt-2 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-center text-[13px] text-ink-soft mt-5">
          Already have an account?{" "}
          <a href="/login" className="text-brand-deep font-bold">Sign in</a>
        </p>
      </form>
    </div>
  );
}
