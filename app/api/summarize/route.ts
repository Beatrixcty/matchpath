import { z } from "zod";

const requestSchema=z.object({id:z.number(),company:z.string().min(1),title:z.string().min(1),description:z.string().min(40)});
const summarySchema=z.object({companyDoes:z.string().min(1),jobPurpose:z.string().min(1),dailyWork:z.array(z.string().min(1)).min(1).max(5),requirements:z.array(z.string().min(1)).min(1).max(5)});
const outputFormat={type:"object",properties:{companyDoes:{type:"string"},jobPurpose:{type:"string"},dailyWork:{type:"array",items:{type:"string"},minItems:1,maxItems:5},requirements:{type:"array",items:{type:"string"},minItems:1,maxItems:5}},required:["companyDoes","jobPurpose","dailyWork","requirements"]};

export async function POST(request:Request){
  const parsed=requestSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Invalid job data"},{status:400});
  const job=parsed.data;
  const prompt=`Summarize this job posting for someone who wants to understand it in a few seconds.

Rules:
- Rewrite in plain, direct English. Do not copy sentences from the post.
- companyDoes: one short sentence explaining the product, service, or business. If unclear, say so.
- jobPurpose: one short sentence explaining why this role exists and its main outcome.
- dailyWork: 2 to 5 concrete actions the person will actually perform. Start each item with a verb.
- requirements: only the 2 to 5 most important skills, experience, or eligibility requirements.
- Exclude culture, marketing claims, equal-opportunity text, benefits, and application instructions.
- Do not invent facts. Say when something is unclear.
- Every point must be complete and understandable without the original post.

Company: ${job.company}
Role: ${job.title}
Job posting:
${job.description.slice(0,8000)}`;

  const geminiKey=process.env.GEMINI_API_KEY;
  if(geminiKey){
    try{
      const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-goog-api-key":geminiKey},
        body:JSON.stringify({
          contents:[{parts:[{text:prompt}]}],
          generationConfig:{temperature:0.1,maxOutputTokens:700,responseMimeType:"application/json",responseJsonSchema:outputFormat},
        }),
        signal:AbortSignal.timeout(60000),
      });
      if(!response.ok)throw new Error(`Gemini returned ${response.status}`);
      const result=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
      const content=result.candidates?.[0]?.content?.parts?.map(part=>part.text||"").join("")||"";
      const summary=summarySchema.parse(JSON.parse(content));
      return Response.json({summary,model:"gemini-3.5-flash-lite",provider:"gemini"});
    }catch(error){
      console.warn("Gemini summarization failed; trying local fallback",error instanceof Error?error.message:error);
    }
  }

  try{
    const response=await fetch("http://127.0.0.1:11434/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"gemma3:4b",stream:false,format:outputFormat,options:{temperature:0.1},messages:[{role:"user",content:prompt}]}),signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw new Error(`Ollama returned ${response.status}`);
    const result=await response.json() as {message?:{content?:string}};
    const summary=summarySchema.parse(JSON.parse(result.message?.content||""));
    return Response.json({summary,model:"gemma3:4b",provider:"ollama"});
  }catch(error){
    return Response.json({error:geminiKey?"Gemini quota unavailable and local fallback could not run":"GEMINI_API_KEY is not configured and local fallback could not run",details:error instanceof Error?error.message:undefined},{status:503});
  }
}
