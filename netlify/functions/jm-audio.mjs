// Server-rendered MP3 fallback for browsers (including Kakao WebView) lacking Web Speech API.
const reply=(error,status=400)=>new Response(JSON.stringify({error}),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
export default async function(request){
 if(request.method!=="POST")return reply("METHOD_NOT_ALLOWED",405);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return reply("ORIGIN_NOT_ALLOWED",403);
 const key=process.env.JM_OPENAI_API_KEY||process.env.OPENAI_API_KEY;
 const base=(process.env.JM_OPENAI_API_KEY?"https://api.openai.com":process.env.OPENAI_BASE_URL||"https://api.openai.com").replace(/\/v1\/?$/,"").replace(/\/$/,"");
 if(!key)return reply("NOT_CONFIGURED",503);
 try{
  const {text}=await request.json();
  if(typeof text!=="string"||text.trim().length<2||text.length>650)return reply("INVALID_TEXT",400);
  // Keep outputs strictly bounded; do not log or persist personal text.
  const res=await fetch(base+"/v1/audio/speech",{
   method:"POST",headers:{"Authorization":"Bearer "+key,"content-type":"application/json"},
   body:JSON.stringify({model:"gpt-4o-mini-tts",voice:"alloy",input:text.trim(),response_format:"mp3"}),
   signal:AbortSignal.timeout(25000)
  });
  if(!res.ok)return reply("AUDIO_UNAVAILABLE",502);
  const bytes=await res.arrayBuffer();
  if(bytes.byteLength>3000000)return reply("AUDIO_TOO_LARGE",502);
  return new Response(bytes,{status:200,headers:{"content-type":"audio/mpeg","cache-control":"no-store","content-length":String(bytes.byteLength),"x-content-type-options":"nosniff"}});
 }catch(e){return reply("AUDIO_FAILED",502);}
}

// Per-IP API cost guard (Netlify deployment enforces this limit).
export const config={path:"/.netlify/functions/jm-audio",rateLimit:{windowLimit:30,windowSize:60,aggregateBy:["ip","domain"]}};
