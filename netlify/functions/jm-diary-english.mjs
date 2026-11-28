// Small, bounded Korean -> natural English diary conversion. No diary text is logged or persisted.
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export default async function(request){
 if(request.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return reply({error:"ORIGIN_NOT_ALLOWED"},403);
 const key=process.env.JM_OPENAI_API_KEY||process.env.OPENAI_API_KEY;
 const base=(process.env.JM_OPENAI_API_KEY?"https://api.openai.com":process.env.OPENAI_BASE_URL||"https://api.openai.com").replace(/\/v1\/?$/,"").replace(/\/$/,"");
 if(!key)return reply({error:"NOT_CONFIGURED"},503);
 try{
  const {korean}=await request.json();
  if(typeof korean!=="string"||korean.trim().length<3||korean.length>1600)return reply({error:"INVALID_TEXT"},400);
  const res=await fetch(base+"/v1/chat/completions",{
   method:"POST",headers:{Authorization:"Bearer "+key,"content-type":"application/json"},
   body:JSON.stringify({model:process.env.JM_DIARY_MODEL||"gpt-4.1-mini",max_completion_tokens:600,messages:[
    {role:"developer",content:"Convert the user's short Korean personal diary into natural spoken English suitable for an A2 adult learner. Preserve all real events, people, and facts; do not invent details or embellish. Use short, easy sentences, usually 2–4. Write ONLY the English diary sentences, no bullet points, labels, explanations or quotation marks. If the input is inappropriate or unclear, translate only the understandable factual content."},
    {role:"user",content:korean.trim()}
   ]}),signal:AbortSignal.timeout(26000)
  });
  if(!res.ok){
   let code="";try{const e=await res.json();code=String(e.error?.code||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);}catch{}
   console.warn("diary_english_upstream",res.status,code);
   return reply({error:res.status===401||res.status===403?"AI_AUTH":res.status===429?"AI_LIMIT":res.status===404||code==="model_not_found"?"AI_MODEL":"AI_UPSTREAM",upstreamStatus:res.status},502);
  }
  const data=await res.json();
  const english=String(data.choices?.[0]?.message?.content||"").trim().slice(0,2000);
  if(!english)return reply({error:"EMPTY_RESULT"},502);
  return reply({english});
 }catch(e){console.warn("diary_english_failure",e?.name||"Error");return reply({error:e?.name==="TimeoutError"?"AI_TIMEOUT":"TRANSLATION_FAILED"},502);}
}

// Per-IP API cost guard (Netlify deployment enforces this limit).
export const config={path:"/.netlify/functions/jm-diary-english",rateLimit:{windowLimit:12,windowSize:60,aggregateBy:["ip","domain"]}};
