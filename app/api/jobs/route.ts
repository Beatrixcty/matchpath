const REMOTIVE_URL = "https://remotive.com/api/remote-jobs?category=software-dev&limit=100";

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function focusFor(title: string): "AI" | "Frontend" | "UI" {
  if (/\b(ai|llm|generative|machine learning)\b/i.test(title)) return "AI";
  if (/\b(ui|design system)\b/i.test(title)) return "UI";
  return "Frontend";
}

function skillsFor(description: string) {
  const known = ["React", "JavaScript", "TypeScript", "HTML", "CSS", "REST", "Supabase", "Next.js", "Node.js", "Python", "AI", "LLM", "Git", "Figma", "Accessibility"];
  return known.filter((skill) => description.toLowerCase().includes(skill.toLowerCase())).slice(0, 6);
}

export async function GET() {
  try {
    const response = await fetch(REMOTIVE_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Remotive returned ${response.status}`);
    const payload = await response.json() as { jobs?: Array<Record<string, unknown>> };
    const jobs = (payload.jobs ?? [])
      .filter((job) => {
        const title = String(job.title ?? "");
        return /(frontend|front-end|react|web developer|ui developer|ai developer|ai product|llm|generative ai|full[ -]?stack developer|software engineer.*ai|ai coding|ai trainer)/i.test(title)
          && !/(senior|sr\.|staff|principal|lead|manager|director|head of)/i.test(title);
      })
      .slice(0, 30)
      .map((job) => {
        const title = String(job.title ?? "Developer");
        const description = stripHtml(String(job.description ?? ""));
        const company = String(job.company_name ?? "Company");
        const published = String(job.publication_date ?? "");
        return {
          id: Number(job.id), company, title,
          location: `${String(job.candidate_required_location ?? "Worldwide")} · Remote`,
          schedule: "Remote hours vary",
          salary: String(job.salary ?? "") || "Salary not listed",
          contract: String(job.job_type ?? "Remote role").replaceAll("_", " "),
          posted: published ? new Date(published).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Recently",
          score: 0, focus: focusFor(title), logo: company.charAt(0).toUpperCase(), color: "#315ee7",
          summary: description.slice(0, 220) + (description.length > 220 ? "…" : ""),
          matches: [], gaps: [], skills: skillsFor(description),
          source: "Remotive", sourceUrl: String(job.url ?? ""), isDemo: false,
          originalDescription: description,
        };
      });
    return Response.json({ jobs, source: "Remotive", fetchedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=900, s-maxage=21600" } });
  } catch (error) {
    return Response.json({ jobs: [], error: error instanceof Error ? error.message : "Live jobs unavailable" }, { status: 502 });
  }
}
