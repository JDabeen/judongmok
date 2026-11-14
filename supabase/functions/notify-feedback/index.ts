// 주동목: 새 피드백 알림 (Supabase Database Webhook → Telegram)
// 배포 전 필수: Edge Function의 JWT 검증을 OFF로 설정하고,
// Database Webhook에 x-webhook-token 헤더를 설정해야 합니다.
// TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID / FEEDBACK_WEBHOOK_TOKEN은
// Supabase Edge Functions Secrets에서만 보관합니다.

type Feedback = {
  id?: number;
  category?: string;
  lesson_day?: number | null;
  rating?: string | null;
  message?: string | null;
};

type InsertEvent = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Feedback | null;
};

const asText = (value: unknown) => typeof value === "string" ? value.trim() : "";
const displayRating = (r: string) =>
  ({ easy: "쉬웠어요", good: "적당해요", hard: "어려웠어요" } as Record<string,string>)[r] || "의견 접수";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const requiredToken = Deno.env.get("FEEDBACK_WEBHOOK_TOKEN");
  const receivedToken = request.headers.get("x-webhook-token");
  // 비밀 헤더가 없거나 일치하지 않으면 웹훅 요청을 처리하지 않습니다.
  if (!requiredToken || requiredToken.length < 24 || receivedToken !== requiredToken) {
    return new Response("Unauthorized", { status: 401 });
  }
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) return new Response("Notification service not configured", { status: 503 });

  let body: InsertEvent;
  try { body = await request.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }
  if (body.type !== "INSERT" || body.table !== "feedback" || body.schema !== "public" || !body.record) {
    return new Response("Ignored", { status: 200 });
  }

  const item = body.record;
  const fromCategory = /^day([1-7]):(easy|good|hard)$/.exec(asText(item.category));
  const day = Number(item.lesson_day ?? fromCategory?.[1] ?? 0);
  const rating = asText(item.rating) || fromCategory?.[2] || "";
  const message = asText(item.message).slice(0, 300);
  // 모든 평가에 즉시 알리지 않고, 글로 남긴 의견이나 '어려워요'를 우선 알립니다.
  if (rating !== "hard" && message.length === 0) {
    return new Response("Routine rating: no alert", { status: 200 });
  }

  const notice = [
    "📬 주동목 새 피드백",
    day >= 1 && day <= 7 ? `Day ${day}` : "학습 일차 미상",
    `평가: ${displayRating(rating)}`,
    message ? `의견: ${message}` : "의견 내용 없음",
    "관리자: https://splendorous-mochi-346e26.netlify.app/admin/"
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: notice, disable_web_page_preview: true })
  });
  if (!response.ok) {
    // API 실패 메시지를 그대로 노출하면 내부 정보가 새어 나갈 수 있어 상태만 기록합니다.
    console.error("Telegram delivery failed, status:", response.status);
    return new Response("Delivery failed", { status: 502 });
  }
  return new Response("Notified", { status: 200 });
});
