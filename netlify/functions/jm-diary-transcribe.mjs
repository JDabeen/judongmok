import {diaryAI,ensureKey,transcribe,aiFailure} from "../lib/diary-ai.mjs";
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export default async function(request){
 if(request.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return reply({error:"ORIGIN_NOT_ALLOWED"},403);
 try{
  const config=diaryAI();ensureKey(config);
  if(config.practiceOnly)return reply({error:"PRACTICE_TEXT_ONLY"},403);
  if(Number(request.headers.get("content-length")||0)>3500000)return reply({error:"TOO_LARGE"},413);
  const file=(await request.formData()).get("audio");
  if(!file||typeof file.size!=="number"||file.size<300||file.size>3000000)return reply({error:"INVALID_AUDIO"},400);
  if(!/^(audio\/|video\/mp4)/.test(file.type||"audio/webm"))return reply({error:"INVALID_FORMAT"},400);
  return reply({text:await transcribe(config,file)});
 }catch(e){const f=aiFailure(e);return reply({error:f.code},f.status);}
}
export const config={path:"/.netlify/functions/jm-diary-transcribe",rateLimit:{windowLimit:6,windowSize:60,aggregateBy:["ip","domain"]}};
