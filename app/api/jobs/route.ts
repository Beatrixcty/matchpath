const REMOTIVE_URL = "https://remotive.com/api/remote-jobs?category=software-dev&limit=100";
const JOBICY_URL = "https://jobicy.com/api/jobs?count=100&geo=europe&industry=engineering";
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

function isRelevant(title: string, description = "") {
  const combined = `${title} ${description.slice(0, 1200)}`;
  const role = /(frontend|front-end|react|web developer|ui developer|full[ -]?stack|software engineer|software developer|ai developer|ai product|llm|generative ai|ai coding|ai trainer)/i.test(title);
  const juniorFriendly = !/(senior|sr\.?|staff|principal|lead|manager|director|head of|architect)/i.test(title);
  const usefulStack = /(react|javascript|typescript|frontend|front-end|web|ui|artificial intelligence|\bai\b|llm)/i.test(combined);
  return role && juniorFriendly && usefulStack;
}

function isEuropeFriendly(location: string) {
  return /(europe|emea|worldwide|anywhere|portugal|spain|france|germany|italy|netherlands|ireland|united kingdom|\buk\b|switzerland|romania|poland|wrocław|bulgaria|croatia|luxembourg|norway|czech|finland|hungary|estonia|austria|belgium|sweden|denmark|greece)/i.test(location);
}

function leverDescription(job: Record<string, unknown>) {
  const lists = Array.isArray(job.lists) ? job.lists as Array<Record<string,unknown>> : [];
  return [job.descriptionPlain, job.openingPlain, job.description, job.opening, ...lists.map(item => item.content)].filter(Boolean).join(" ");
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

async function remotiveJobs() {
  const payload = await fetchJson(REMOTIVE_URL) as { jobs?: Array<Record<string, unknown>> };
  return (payload.jobs ?? []).filter(job => isRelevant(String(job.title ?? ""), String(job.description ?? ""))).map(job => normalize({
    source:"Remotive", sourceId:String(job.id), company:String(job.company_name ?? ""), title:String(job.title ?? "Developer"),
    location:String(job.candidate_required_location ?? "Worldwide"), salary:String(job.salary ?? ""),
    contract:String(job.job_type ?? "Remote role").replaceAll("_", " "), date:String(job.publication_date ?? ""),
    url:String(job.url ?? ""), description:String(job.description ?? ""), color:"#315ee7",
  }));
}

async function jobicyJobs() {
  const payload = await fetchJson(JOBICY_URL) as { jobs?: Array<Record<string, unknown>> };
  return (payload.jobs ?? []).filter(job => isRelevant(String(job.jobTitle ?? ""), String(job.jobDescription ?? ""))).map(job => normalize({
    source:"Jobicy", sourceId:String(job.id), company:String(job.companyName ?? ""), title:String(job.jobTitle ?? "Developer"),
    location:String(job.jobGeo ?? "Europe"), salary:String(job.annualSalaryMin ?? "") && String(job.annualSalaryMax ?? "") ? `${String(job.salaryCurrency ?? "")} ${String(job.annualSalaryMin)}–${String(job.annualSalaryMax)}` : "",
    contract:Array.isArray(job.jobType) ? job.jobType.join(", ") : String(job.jobType ?? "Remote role"), date:String(job.pubDate ?? ""),
    url:String(job.url ?? ""), description:String(job.jobDescription ?? job.jobExcerpt ?? ""), color:"#ef6c57",
  }));
}

async function greenhouseJobs(board: string) {
  const payload = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`) as { jobs?: Array<Record<string, unknown>> };
  return (payload.jobs ?? []).filter(job => {
    const location = String((job.location as Record<string,unknown>)?.name ?? "");
    return /remote|europe|emea|portugal|worldwide/i.test(location) && isRelevant(String(job.title ?? ""), String(job.content ?? ""));
  }).map(job => normalize({
    source:"Greenhouse", sourceId:`${board}-${String(job.id)}`, company:board === "remotecom" ? "Remote" : board === "swordhealth" ? "Sword Health" : board.charAt(0).toUpperCase()+board.slice(1),
    title:String(job.title ?? "Developer"), location:String((job.location as Record<string,unknown>)?.name ?? "Remote"),
    contract:"See original listing", date:String(job.updated_at ?? ""), url:String(job.absolute_url ?? ""),
    description:String(job.content ?? ""), color:"#258f73",
  }));
}

async function leverJobs(site: string) {
  const payload = await fetchJson(`https://api.lever.co/v0/postings/${site}?mode=json`) as Array<Record<string, unknown>>;
  return payload.filter(job => {
    const categories = job.categories as Record<string,unknown> | undefined;
    const location = String(categories?.location ?? "");
    return (String(job.workplaceType ?? "") === "remote" || /remote/i.test(String(categories?.location ?? "")))
      && isEuropeFriendly(location) && isRelevant(String(job.text ?? ""), leverDescription(job));
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

export async function GET() {
  const tasks = [remotiveJobs(), jobicyJobs(), ...GREENHOUSE_BOARDS.map(greenhouseJobs), ...LEVER_SITES.map(leverJobs)];
  const results = await Promise.allSettled(tasks);
  const jobs = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  const unique = [...new Map(jobs.map(job => [`${job.company.toLowerCase()}|${job.title.toLowerCase()}`, job])).values()].slice(0, 80);
  const sources = [...new Set(unique.map(job => job.source))];
  if (!unique.length) return Response.json({ jobs: [], sources: [], error: "No suitable live jobs were returned by the connected sources." }, { status: 503 });
  return Response.json({ jobs: unique, sources, fetchedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=900, s-maxage=21600" } });
}
