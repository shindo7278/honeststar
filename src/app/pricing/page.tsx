"use client";

import { useEffect, useState } from "react";
import { initializePaddle, Paddle } from "@paddle/paddle-js";
import { createClient } from "@/lib/supabase-browser";

const PLANS = [
  {
    id: "basic",
    name: "الأساسية",
    price: 19,
    quota: 250,
    doctors: 1,
    priceIdEnv: "NEXT_PUBLIC_PADDLE_PRICE_BASIC",
    features: ["250 رسالة شهريًا", "حساب دكتور واحد", "تتبع الضغط على اللينك"],
  },
  {
    id: "standard",
    name: "المتوسطة",
    price: 27,
    quota: 450,
    doctors: 2,
    priceIdEnv: "NEXT_PUBLIC_PADDLE_PRICE_STANDARD",
    features: ["450 رسالة شهريًا", "حسابين دكتور", "تخصيص توقيت الإرسال", "تقرير شهري"],
  },
  {
    id: "pro",
    name: "الاحترافية",
    price: 35,
    quota: 700,
    doctors: 5,
    priceIdEnv: "NEXT_PUBLIC_PADDLE_PRICE_PRO",
    features: ["700 رسالة شهريًا", "5 حسابات دكاترة", "تخصيص نص الرسالة", "دعم بالأولوية"],
  },
];

export default function PricingPage() {
  const supabase = createClient();
  const [paddle, setPaddle] = useState<Paddle>();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production") || "sandbox",
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    }).then((p) => setPaddle(p));
  }, []);

  async function handleSubscribe(plan: typeof PLANS[number]) {
    setLoadingPlan(plan.id);

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;

    const priceId = process.env[plan.priceIdEnv as keyof typeof process.env] as string;

    paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: email ? { email } : undefined,
      customData: { clinic_user_id: userData.user?.id, plan_id: plan.id },
      settings: {
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscribed=1`,
      },
    });

    setLoadingPlan(null);
  }

  return (
    <div className="min-h-screen flex flex-col px-5 py-7">
      <div className="text-center mb-7">
        <h1 className="text-xl font-extrabold">اختار باقتك</h1>
        <p className="text-sm text-ink-soft mt-1.5">تقدر تغيّرها في أي وقت من الإعدادات</p>
      </div>

      <div className="space-y-4 flex-1">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="border border-gray-100 rounded-2xl p-5 relative"
          >
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-bold text-base">{plan.name}</h3>
              <div>
                <span className="text-2xl font-extrabold text-brand-deep">£{plan.price}</span>
                <span className="text-xs text-ink-soft"> /شهريًا</span>
              </div>
            </div>
            <ul className="text-[13px] text-ink-soft space-y-1.5 mt-3 mb-4">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan)}
              disabled={loadingPlan === plan.id}
              className="w-full py-3 rounded-xl bg-brand-deep text-white font-bold text-sm disabled:opacity-60"
            >
              {loadingPlan === plan.id ? "جاري التحميل..." : "اشترك الآن"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
