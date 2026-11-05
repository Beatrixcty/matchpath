const REMOTIVE_URL = "https://remotive.com/api/remote-jobs?category=software-dev&limit=100";
const GREENHOUSE_BOARDS = ["duolingo", "coursera", "swordhealth", "remotecom"];
const LEVER_SITES = ["masterborn-2", "jobgether"];

type NormalizedJob = {
  id: number; company: string; title: string; location: string; schedule: string;
  salary: string; contract: string; posted: string; score: number;
  focus: "AI" | "Frontend" | "UI"; logo: string; color: string;
  summary: string; matches: string[]; gaps: string[]; skills: string[];
  source: string; sourceUrl: string; isDemo: false; originalDescription: string;
};

function stripHtml(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"').replace(/&hellip;/g, "…").replace(/\s+/g, " ").trim();
}

function stableId(source: string, value: string) {
  let hash = 2166136261;
  for (const character of `${source}:${value}`) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return Math.abs(hash) || 1;
}

function focusFor(value: string): "AI" | "Frontend" | "UI" {
  if (/\b(ai|llm|generative|machine learning|artificial intelligence)\b/i.test(value)) return "AI";
  if (/\b(ui|ux|design system|product design)\b/i.test(value)) return "UI";
  return "Frontend";
}

function skillsFor(description: string) {
  const known = ["React", "JavaScript", "TypeScript", "HTML", "CSS", "REST", "Supabase", "Next.js", "Node.js", "Python", "AI", "LLM", "Git", "Figma", "Accessibility", "Vue", "Angular"];
  return known.filter((skill) => description.toLowerCase().includes(skill.toLowerCase())).slice(0, 7);
}

function isRelevant(title: string, description = "", roles:string[] = []) {
  const combined = `${title} ${description.slice(0, 1200)}`;
  const selected=roles.length?roles:["frontend","react","web developer","ui developer","full stack","software engineer","ai developer","ai product","llm"];
  const synonyms:Record<string,string[]>={frontend:["frontend","front-end","react"],backend:["backend","back-end"],"full-stack":["full-stack","full stack","fullstack"],web:["web developer"],ui:["ui developer","interface developer"],mobile:["mobile","react native","ios","android"],product:["product engineer"],ai:["ai ","artificial intelligence","llm","generative ai"],ml:["machine learning","ml engineer"],data:["data analyst","data engineer"],qa:["qa","quality assurance","test engineer"],devops:["devops","site reliability","platform engineer"],designer:["designer","ux design","product design"]};
  const role=selected.some(item=>{const lower=item.toLowerCase();const keys=Object.keys(synonyms).filter(key=>lower.includes(key));const terms=keys.length?keys.flatMap(key=>synonyms[key]):[lower.replace(/\b(developer|engineer|specialist)\b/g,"").trim()];return terms.some(term=>term&&title.toLowerCase().includes(term))});
  const juniorFriendly = !/(senior|sr\.?|staff|principal|lead|manager|director|head of|architect)/i.test(title);
  const usefulStack = /(react|javascript|typescript|frontend|front-end|web|ui|artificial intelligence|\bai\b|llm)/i.test(combined);
  return role && juniorFriendly && usefulStack;
}

function isWorldwide(location:string){return /(worldwide|anywhere|global|all countries|work from anywhere)/i.test(location)}
function locationCompatible(location:string,selected:string[]){
  if(!selected.length)return true;
  const value=location.toLowerCase();
  if(isWorldwide(value))return true;
  if(selected.includes("europe")&&/(europe|emea|eu\/eea|european union|portugal|spain|france|germany|italy|netherlands|ireland|united kingdom|\buk\b|switzerland|romania|poland|bulgaria|croatia|luxembourg|norway|czech|finland|hungary|estonia|austria|belgium|sweden|denmark|greece)/i.test(value))return true;
  if(selected.includes("eu/eea")&&/(eu\/eea|european union|\beu\b|eea|portugal|spain|france|germany|italy|netherlands|ireland|romania|poland|bulgaria|croatia|luxembourg|norway|czech|finland|hungary|estonia|austria|belgium|sweden|denmark|greece)/i.test(value))return true;
  if(selected.includes("portugal")&&/portugal/i.test(value))return true;
  if(selected.includes("uk")&&/(united kingdom|\buk\b|britain)/i.test(value))return true;
  if(selected.includes("north america")&&/(north america|united states|\busa\b|\bu\.s\.|canada|mexico)/i.test(value))return true;
  if(selected.includes("asia-pacific")&&/(asia|apac|asia-pacific|australia|new zealand|singapore|hong kong|japan|korea|india)/i.test(value))return true;
  return /^(remote|remote only|fully remote)$/i.test(value.trim());
}
function eligibilityPriority(location:string){return isWorldwide(location)?0:/^(remote|remote only|fully remote)$/i.test(location.trim())?2:1}
function jobicyGeos(selected:string[]){
  const geos:string[]=[];
  if(selected.includes("worldwide"))geos.push("anywhere");
  if(selected.some(value=>["europe","eu/eea","portugal","uk"].includes(value)))geos.push("europe");
  if(selected.includes("north america"))geos.push("usa","canada");
  if(selected.includes("asia-pacific"))geos.push("apac");
  return geos.length?[...new Set(geos)]:[""];
}

function leverDescription(job: Record<string, unknown>) {
  const lists = Array.isArray(job.lists) ? job.lists as Array<Record<string,unknown>> : [];
  if (job.descriptionPlain) return String(job.descriptionPlain);
  const structured = [job.openingPlain ?? job.opening, ...lists.map(item => item.content), job.additionalPlain ?? job.additional].filter(Boolean).join(" ");
  return structured || String(job.description ?? "");
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Recently" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function normalize(input: { source:string; sourceId:string; company:string; title:string; location:string; schedule?:string; salary?:string; contract?:string; date?:string; url:string; description:string; color:string }): NormalizedJob {
  const description = stripHtml(input.description);
  return {
    id: stableId(input.source, input.sourceId), company: input.company || "Company", title: input.title,
    location: input.location.toLowerCase().includes("remote") ? input.location : `${input.location} · Remote`,
    schedule: input.schedule || "Remote hours vary", salary: input.salary || "Salary not listed",
    contract: input.contract || "Remote role", posted: dateLabel(input.date || ""), score: 0,
    focus: focusFor(`${input.title} ${description}`), logo: (input.company || "C").charAt(0).toUpperCase(), color: input.color,
    summary: description.slice(0, 240) + (description.length > 240 ? "…" : ""), matches: [], gaps: [], skills: skillsFor(description),
    source: input.source, sourceUrl: input.url, isDemo: false, originalDescription: description,
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json", "User-Agent": "MatchPath/1.0 job discovery tool" } });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return response.json();
}

async function remotiveJobs(roles:string[],locations:string[]) {
  const payload = await fetchJson(REMOTIVE_URL) as { jobs?: Array<Record<string, unknown>> };
  return (payload.jobs ?? []).filter(job => locationCompatible(String(job.candidate_required_location ?? "Remote"),locations)&&isRelevant(String(job.title ?? ""), String(job.description ?? ""),roles)).map(job => normalize({
    source:"Remotive", sourceId:String(job.id), company:String(job.company_name ?? ""), title:String(job.title ?? "Developer"),
    location:String(job.candidate_required_location ?? "Worldwide"), salary:String(job.salary ?? ""),
    contract:String(job.job_type ?? "Remote role").replaceAll("_", " "), date:String(job.publication_date ?? ""),
    url:String(job.url ?? ""), description:String(job.description ?? ""), color:"#315ee7",
  }));
}

async function jobicyJobs(roles:string[],locations:string[],geo:string) {
  const geoQuery=geo?`&geo=${encodeURIComponent(geo)}`:"";
  const payload = await fetchJson(`https://jobicy.com/api/jobs?count=100${geoQuery}&industry=engineering`) as { jobs?: Array<Record<string, unknown>> };
  return (payload.jobs ?? []).filter(job => locationCompatible(String(job.jobGeo ?? "Remote"),locations)&&isRelevant(String(job.jobTitle ?? ""), String(job.jobDescription ?? ""),roles)).map(job => normalize({
    source:"Jobicy", sourceId:String(job.id), company:String(job.companyName ?? ""), title:String(job.jobTitle ?? "Developer"),
    location:String(job.jobGeo ?? "Europe"), salary:String(job.annualSalaryMin ?? "") && String(job.annualSalaryMax ?? "") ? `${String(job.salaryCurrency ?? "")} ${String(job.annualSalaryMin)}–${String(job.annualSalaryMax)}` : "",
    contract:Array.isArray(job.jobType) ? job.jobType.join(", ") : String(job.jobType ?? "Remote role"), date:String(job.pubDate ?? ""),
    url:String(job.url ?? ""), description:String(job.jobDescription ?? job.jobExcerpt ?? ""), color:"#ef6c57",
  }));
}

async function greenhouseJobs(board: string,roles:string[],locations:string[]) {
  const payload = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`) as { jobs?: Array<Record<string, unknown>> };
  return (payload.jobs ?? []).filter(job => {
    const location = String((job.location as Record<string,unknown>)?.name ?? "");
    return /remote/i.test(location) && locationCompatible(location,locations) && isRelevant(String(job.title ?? ""), String(job.content ?? ""),roles);
  }).map(job => normalize({
    source:"Greenhouse", sourceId:`${board}-${String(job.id)}`, company:board === "remotecom" ? "Remote" : board === "swordhealth" ? "Sword Health" : board.charAt(0).toUpperCase()+board.slice(1),
    title:String(job.title ?? "Developer"), location:String((job.location as Record<string,unknown>)?.name ?? "Remote"),
    contract:"See original listing", date:String(job.updated_at ?? ""), url:String(job.absolute_url ?? ""),
    description:String(job.content ?? ""), color:"#258f73",
  }));
}

async function leverJobs(site: string,roles:string[],locations:string[]) {
  const payload = await fetchJson(`https://api.lever.co/v0/postings/${site}?mode=json`) as Array<Record<string, unknown>>;
  return payload.filter(job => {
    const categories = job.categories as Record<string,unknown> | undefined;
    const location = String(categories?.location ?? "");
    return (String(job.workplaceType ?? "") === "remote" || /remote/i.test(String(categories?.location ?? "")))
      && locationCompatible(location,locations) && isRelevant(String(job.text ?? ""), leverDescription(job),roles);
  }).map(job => {
    const categories = job.categories as Record<string,unknown> | undefined;
    const salary = job.salaryRange as Record<string,unknown> | undefined;
    return normalize({ source:"Lever", sourceId:`${site}-${String(job.id)}`, company:site === "masterborn-2" ? "MasterBorn" : "Jobgether",
      title:String(job.text ?? "Developer"), location:String(categories?.location ?? "Remote"), schedule:"Remote — check regional eligibility",
      salary:salary ? `${String(salary.currency ?? "")} ${String(salary.min ?? "")}–${String(salary.max ?? "")} ${String(salary.interval ?? "")}` : String(job.salaryDescriptionPlain ?? ""),
      contract:String(categories?.commitment ?? "Remote role"), date:String(job.createdAt ?? ""), url:String(job.hostedUrl ?? ""),
      description:leverDescription(job), color:"#7a62c9" });
  });
}

export async function GET(request:Request) {
  const params=new URL(request.url).searchParams;
  const forceRefresh=params.has("refresh");
  const roles=(params.get("roles")||"").split(",").map(value=>value.trim()).filter(Boolean);
  const locations=(params.get("locations")||"").split(",").map(value=>value.trim().toLowerCase()).filter(Boolean);
  const tasks = [remotiveJobs(roles,locations), ...jobicyGeos(locations).map(geo=>jobicyJobs(roles,locations,geo)), ...GREENHOUSE_BOARDS.map(board=>greenhouseJobs(board,roles,locations)), ...LEVER_SITES.map(site=>leverJobs(site,roles,locations))];
  const results = await Promise.allSettled(tasks);
  const jobs = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  const unique = [...new Map(jobs.map(job => [`${job.company.toLowerCase()}|${job.title.toLowerCase()}`, job])).values()].sort((a,b)=>eligibilityPriority(a.location)-eligibilityPriority(b.location)).slice(0, 80);
  const sources = [...new Set(unique.map(job => job.source))];
  if (!unique.length) return Response.json({ jobs: [], sources: [], error: "No suitable live jobs were returned by the connected sources." }, { status: 503 });
  return Response.json({ jobs: unique, sources, fetchedAt: new Date().toISOString() }, { headers: { "Cache-Control": forceRefresh?"no-store":"public, max-age=900, s-maxage=21600" } });
}
