"use client";

import { useEffect, useState } from "react";
import { initializePaddle, Paddle } from "@paddle/paddle-js";
import { createClient } from "@/lib/supabase-browser";

const PLANS = [
  {
    id: "basic",
    name: "Starter",
    price: 19,
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_BASIC!,
    features: ["250 reminders/month", "1 doctor account", "Click tracking"],
  },
  {
    id: "standard",
    name: "Growth",
    price: 27,
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_STANDARD!,
    features: ["450 reminders/month", "2 doctor accounts", "Custom send timing", "Monthly report"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 35,
    priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO!,
    features: ["700 reminders/month", "5 doctor accounts", "Custom message templates", "Priority support"],
  },
];

export default function PricingPage() {
  const supabase = createClient();
  const [paddle, setPaddle] = useState<Paddle>();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!;
    const env = token?.startsWith("test_") ? "sandbox"
      : (process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production") || "sandbox";
    initializePaddle({ environment: env, token }).then((p) => setPaddle(p));
  }, []);

  async function handleSubscribe(plan: typeof PLANS[number]) {
    setLoadingPlan(plan.id);
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;

    paddle?.Checkout.open({
      items: [{ priceId: plan.priceId, quantity: 1 }],
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
        <span className="text-3xl block mb-2">✦</span>
        <h1 className="text-xl font-extrabold">Choose your plan</h1>
        <p className="text-sm text-ink-soft mt-1.5">Change or cancel anytime from settings</p>
      </div>

      <div className="space-y-4 flex-1">
        {PLANS.map((plan) => (
          <div key={plan.id} className="border border-gray-100 rounded-2xl p-5">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-bold text-base">{plan.name}</h3>
              <div>
                <span className="text-2xl font-extrabold text-brand-deep">£{plan.price}</span>
                <span className="text-xs text-ink-soft"> /month</span>
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
              {loadingPlan === plan.id ? "Loading..." : "Subscribe Now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
