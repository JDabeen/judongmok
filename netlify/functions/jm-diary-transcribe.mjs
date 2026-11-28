// Korean diary speech -> Korean transcript. Audio is processed transiently, never stored.
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export default async function(request){
 if(request.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return reply({error:"ORIGIN_NOT_ALLOWED"},403);
 const key=process.env.JM_OPENAI_API_KEY||process.env.OPENAI_API_KEY;
 const base=(process.env.JM_OPENAI_API_KEY?"https://api.openai.com":process.env.OPENAI_BASE_URL||"https://api.openai.com").replace(/\/v1\/?$/,"").replace(/\/$/,"");
 
 if(!key)return reply({error:"NOT_CONFIGURED"},503);
 if(Number(request.headers.get("content-length")||0)>3500000)return reply({error:"TOO_LARGE"},413);
 try{
  const body=await request.formData();
  const file=body.get("audio");
  if(!file||typeof file.size!=="number"||file.size<300||file.size>3000000)return reply({error:"INVALID_AUDIO"},400);
  if(!/^(audio\/|video\/mp4)/.test(file.type||"audio/webm"))return reply({error:"INVALID_FORMAT"},400);
  const payload=new FormData();payload.append("model","gpt-transcribe");payload.append("file",file,file.name||"diary.webm");
  const res=await fetch(base+"/v1/audio/transcriptions",{
   method:"POST",headers:{Authorization:"Bearer "+key},body:payload,signal:AbortSignal.timeout(28000)
  });
  if(!res.ok)return reply({error:"TRANSCRIPTION_UNAVAILABLE"},502);
  const json=await res.json();
  const text=String(json.text||"").trim().slice(0,1800);
  if(!text)return reply({error:"NO_SPEECH"},422);
  return reply({text});
 }catch(e){return reply({error:"TRANSCRIPTION_FAILED"},502);}
}

// Per-IP API cost guard (Netlify deployment enforces this limit).
export const config={path:"/.netlify/functions/jm-diary-transcribe",rateLimit:{windowLimit:6,windowSize:60,aggregateBy:["ip","domain"]}};
