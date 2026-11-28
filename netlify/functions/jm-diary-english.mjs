import {diaryAI,ensureKey,translate,aiFailure} from "../lib/diary-ai.mjs";
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export default async function(request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return reply({error:"ORIGIN_NOT_ALLOWED"},403);
 try{
  const config=diaryAI();
  if(request.method==="GET")return reply({provider:config.provider,practiceOnly:config.practiceOnly,configured:!!config.key});
  if(request.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405);
  ensureKey(config);
  const {korean,practiceOnly}=await request.json();
  if(typeof korean!=="string"||korean.trim().length<3||korean.length>1600)return reply({error:"INVALID_TEXT"},400);
  if(config.practiceOnly&&practiceOnly!==true)return reply({error:"PRACTICE_ONLY"},403);
  return reply({english:await translate(config,korean.trim())});
 }catch(e){const f=aiFailure(e);return reply({error:f.code},f.status);}
}
export const config={path:"/.netlify/functions/jm-diary-english",rateLimit:{windowLimit:12,windowSize:60,aggregateBy:["ip","domain"]}};
