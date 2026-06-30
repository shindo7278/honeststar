import { NextRequest, NextResponse } from "next/server";
import { Paddle, EventName } from "@paddle/paddle-node-sdk";
import { createServiceClient } from "@/lib/supabase-server";

const paddle = new Paddle(process.env.PADDLE_API_KEY!);

// Maps a Paddle price ID back to our internal plan id (basic/standard/pro)
async function resolvePlanId(priceId: string, supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase
    .from("plans")
    .select("id")
    .eq("paddle_price_id", priceId)
    .single();
  return data?.id || "basic";
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("paddle-signature") || "";
  const rawBody = await req.text();

  let event;
  try {
    event = await paddle.webhooks.unmarshal(
      rawBody,
      process.env.PADDLE_WEBHOOK_SECRET!,
      signature
    );
  } catch (err) {
    return NextResponse.json({ ok: false, reason: "توقيع غير صالح" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionActivated: {
      const sub = event.data;
      const customData = sub.customData as Record<string, unknown> | null;
const clinicUserId = customData?.clinic_user_id as string | undefined;
      const priceId = sub.items?.[0]?.price?.id;
      const planId = priceId ? await resolvePlanId(priceId, supabase) : "basic";

      // Find the clinic via clinic_members -> auth_user_id
      const { data: member } = await supabase
        .from("clinic_members")
        .select("clinic_id")
        .eq("auth_user_id", clinicUserId)
        .single();

      if (member) {
        await supabase
          .from("clinics")
          .update({
            plan_id: planId,
            paddle_subscription_id: sub.id,
            paddle_customer_id: sub.customerId,
            subscription_status: "active",
          })
          .eq("id", member.clinic_id);
      }
      break;
    }

    case EventName.SubscriptionUpdated: {
      const sub = event.data;
      const priceId = sub.items?.[0]?.price?.id;
      const planId = priceId ? await resolvePlanId(priceId, supabase) : undefined;

      await supabase
        .from("clinics")
        .update({
          ...(planId ? { plan_id: planId } : {}),
          subscription_status: sub.status === "active" ? "active" : "past_due",
        })
        .eq("paddle_subscription_id", sub.id);
      break;
    }

    case EventName.SubscriptionCanceled: {
      const sub = event.data;
      await supabase
        .from("clinics")
        .update({ subscription_status: "canceled" })
        .eq("paddle_subscription_id", sub.id);
      break;
    }

    // Fires on every successful renewal — reset the monthly message quota
    case EventName.TransactionCompleted: {
      const txn = event.data;
      const subscriptionId = txn.subscriptionId;
      if (subscriptionId) {
        await supabase
          .from("clinics")
          .update({
            messages_used_this_cycle: 0,
            billing_cycle_start: new Date().toISOString().slice(0, 10),
            subscription_status: "active",
          })
          .eq("paddle_subscription_id", subscriptionId);
      }
      break;
    }

    case EventName.SubscriptionPastDue: {
      const sub = event.data;
      await supabase
        .from("clinics")
        .update({ subscription_status: "past_due" })
        .eq("paddle_subscription_id", sub.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
