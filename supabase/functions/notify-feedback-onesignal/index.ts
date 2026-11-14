// 주동목 관리자 OneSignal 푸시 (피드백 INSERT 웹훅 전용; 초기 테스트: 모든 평가 알림)
// Secrets: FEEDBACK_WEBHOOK_TOKEN, ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY는 Supabase Edge Functions의 서버 환경에서만 사용.
// 반드시 verify_jwt=false + x-webhook-token 검증을 함께 사용하세요.
import { createClient } from "npm:@supabase/supabase-js@2";

type FeedbackRecord = {
  id?: number;
  category?: string | null;
  lesson_day?: number | null;
  rating?: string | null;
  message?: string | null;
};
type HookPayload = {
  type?: string;
  schema?: string;
  table?: string;
  record?: FeedbackRecord | null;
};

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const endpoint = "https://api.onesignal.com/notifications";
const reply = (body: string, code = 200) => new Response(body, { status: code });

async function feedbackIdempotencyKey(id: number): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode("judongmok-feedback:" + String(id))
  ));
  const b = digest.slice(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return reply("Method not allowed", 405);

  // 웹훅 서명 대신 관리자가 설정한 비밀 헤더로 접근을 제한합니다.
  const expected = Deno.env.get("FEEDBACK_WEBHOOK_TOKEN") || "";
  if (expected.length < 24 || request.headers.get("x-webhook-token") !== expected) {
    return reply("Unauthorized", 401);
  }

  let body: HookPayload;
  try { body = await request.json(); }
  catch { return reply("Invalid JSON", 400); }
  if (body.type !== "INSERT" || body.schema !== "public" || body.table !== "feedback" || !body.record) {
    return reply("Ignored: not a feedback INSERT");
  }
  const f = body.record;
  if (!Number.isSafeInteger(f.id) || (f.id || 0) <= 0) return reply("Missing feedback id", 400);

  const match = /^day([1-7]):(easy|good|hard)$/.exec(text(f.category));
  const day = Number(f.lesson_day ?? match?.[1] ?? 0);
  const rating = text(f.rating) || match?.[2] || "";
  const userComment = text(f.message);
  // 초기 사용자 테스트 기간에는 모든 난이도 평가와 작성 의견을 알립니다.

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const restKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!projectUrl || !serviceKey || !appId || !restKey) {
    return reply("Server secrets not configured", 503);
  }
  const db = createClient(projectUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const adminResponse = await db.from("admin_members").select("user_id").limit(50);
  if (adminResponse.error) {
    console.error("Admin lookup failed");
    return reply("Admin lookup failed", 500);
  }
  const adminIds = (adminResponse.data || []).map(x => x.user_id).filter(Boolean);
  if (!adminIds.length) return reply("No admins");

  const subsResponse = await db.from("admin_push_subscriptions")
    .select("subscription_id").eq("enabled", true)
    .in("user_id", adminIds).limit(2000);
  if (subsResponse.error) {
    console.error("Subscription lookup failed");
    return reply("Subscription lookup failed", 500);
  }
  const ids = [...new Set((subsResponse.data || []).map(x => x.subscription_id).filter(Boolean))];
  if (!ids.length) return reply("No registered admin devices");

  // 의견 본문/사용자 ID는 잠금 화면 푸시에서 보여주지 않습니다.
  const title = "주동목 · 새 피드백";
  const ratingLabel = rating === "hard" ? "어려웠어요" : rating === "good" ? "적당해요" : rating === "easy" ? "쉬웠어요" : "피드백";
  const summary = userComment ? `${ratingLabel} · 새 의견이 도착했어요.` : `${ratingLabel} 평가가 도착했어요.`;
  const description = `${day>=1&&day<=7?"Day "+day+" · ":""}${summary} 관리자 화면에서 확인하세요.`;
  const message = {
    app_id: appId,
    include_subscription_ids: ids,
    target_channel: "push",
    headings: { en: title, ko: title },
    contents: { en: description, ko: description },
    url: "https://splendorous-mochi-346e26.netlify.app/admin/",
    idempotency_key: await feedbackIdempotencyKey(f.id!)
  };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Key ${restKey}` },
      body: JSON.stringify(message)
    });
    if (!response.ok) {
      console.error("OneSignal HTTP status:", response.status);
      return reply("Notification provider rejected request", 502);
    }
    const result = await response.json();
    if (!result?.id) {
      console.error("OneSignal accepted request but created no message");
      return reply("No eligible subscription at provider", 502);
    }
    return reply("Notification queued");
  } catch {
    console.error("OneSignal network error");
    return reply("Notification request failed", 502);
  }
});
