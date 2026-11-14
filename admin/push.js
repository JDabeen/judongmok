/* 주동목 관리자: OneSignal Web Push opt-in only.
 * OneSignal SDK is loaded ONLY after the authenticated admin dashboard is shown.
 * This file contains no secret keys.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
let client=null, currentUserId=null, sdkPromise=null, oneSignal=null;
const setStatus=(message)=>{if($("push-status"))$("push-status").textContent=message;};
const appId=(window.JUDONGMOK_PUSH_APP_ID||"").trim();
const enabled= /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(appId);
const showButtons=()=>{if($("push-enable"))$("push-enable").disabled=!enabled;};
async function verifyAdmin(){
  if(!client)throw new Error("관리자 로그인이 필요합니다.");
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)throw new Error("로그인이 만료됐습니다.");
  const {data,error:e}=await client.from("admin_members").select("user_id").eq("user_id",user.id).maybeSingle();
  if(e||!data)throw new Error("관리자 권한이 없습니다.");
  currentUserId=user.id;
}
function loadSdk(){
  if(sdkPromise)return sdkPromise;
  sdkPromise=new Promise((resolve,reject)=>{
    window.OneSignalDeferred=window.OneSignalDeferred||[];
    window.OneSignalDeferred.push(async (os)=>{
      try{
        await os.init({
          appId,
          serviceWorkerPath:"push/onesignal/OneSignalSDKWorker.js",
          serviceWorkerParam:{scope:"/push/onesignal/"},
          notifyButton:{enable:false}
        });
        oneSignal=os;
        // 푸시 토큰이 나중에 발급되거나 변경돼도 현재 기기의 정보를 동기화합니다.
        os.User.PushSubscription.addEventListener("change",()=>{void syncSubscription().catch(()=>{});});
        resolve(os);
      }catch(e){reject(e);}
    });
    const tag=document.createElement("script");
    tag.src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    tag.onerror=()=>reject(new Error("알림 SDK를 불러오지 못했습니다."));
    document.head.appendChild(tag);
  });
  return sdkPromise;
}
async function syncSubscription(){
  if(!client||!oneSignal||!currentUserId)return;
  const s=oneSignal.User.PushSubscription;
  if(!s?.id||!s.optedIn||!oneSignal.Notifications.permission)return;
  const {error}=await client.from("admin_push_subscriptions").upsert({
    subscription_id:s.id,user_id:currentUserId,enabled:true,last_seen_at:new Date().toISOString()
  },{onConflict:"subscription_id"});
  if(error)throw new Error("구독 저장 실패: "+error.message);
  setStatus("이 기기의 알림이 켜졌습니다. 중요한 피드백만 알려드려요.");
  if($("push-enable"))$("push-enable").textContent="알림 다시 확인";
}
async function enablePush(){
  const btn=$("push-enable");
  btn.disabled=true;
  try{
    await verifyAdmin();
    if(!enabled)throw new Error("OneSignal 앱 연결을 먼저 완료해야 합니다.");
    const os=await loadSdk();
    if(!os.Notifications.isPushSupported())throw new Error("이 브라우저에서는 웹 푸시를 지원하지 않습니다.");
    // 화면에서 직접 누른 버튼을 통해 권한을 요청합니다.
    await os.Notifications.requestPermission();
    if(!os.Notifications.permission)throw new Error("브라우저 알림 권한이 허용되지 않았습니다.");
    await os.User.PushSubscription.optIn();
    if(os.User.PushSubscription.id) await syncSubscription();
    else setStatus("알림 승인됨. 기기 등록 처리 중입니다. 잠시 후 이 화면을 새로고침하세요.");
  }catch(e){setStatus("알림을 켜지 못했어요: "+(e?.message||String(e)));}
  finally{btn.disabled=!enabled;}
}
async function activate(adminClient){
  client=adminClient;
  const section=$("admin-push");
  if(section)section.hidden=false;
  if(!enabled){
    setStatus("알림 기능은 준비됐습니다. OneSignal 앱 ID를 연결하면 켤 수 있어요.");
    showButtons();
    return;
  }
  setStatus("휴대폰에서 '이 기기 알림 켜기'를 누르면 중요한 피드백을 알려드려요.");
  showButtons();
  try{
    await verifyAdmin();
    await loadSdk();
    await syncSubscription();
  }catch(e){
    setStatus("알림 준비 중: "+(e?.message||String(e)));
  }
}
function clear(){
  client=null;currentUserId=null;
  if($("admin-push"))$("admin-push").hidden=true;
}
$("push-enable")?.addEventListener("click",()=>{void enablePush();});
window.JudongmokPush={activate,clear};
})();
