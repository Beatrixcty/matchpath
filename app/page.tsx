"use client";

import {
  ArrowUpRight, Bell, BriefcaseBusiness, Check, ChevronDown,
  CircleUserRound, Clock3, Compass, Filter, Heart, LayoutDashboard,
  MapPin, Search, Sparkles, Target, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

type Job = {
  id: number; company: string; title: string; location: string; schedule: string;
  salary: string; contract: string; posted: string; score: number;
  focus: "AI" | "Frontend" | "UI"; logo: string; color: string;
  summary: string; matches: string[]; gaps: string[]; skills: string[];
  source?: string; sourceUrl?: string; isDemo?: boolean; originalDescription?: string;
};

type Preferences = { roles:string; seniority:string; industries:string; lowPriorityIndustries:string; avoidedIndustries:string; location:string; arrangements:string; hours:string; salary:string; contract:string; exclusions:string };
const defaultPreferences: Preferences = { roles:"AI Product Developer, Frontend Developer, Junior Web Developer, UI Developer", seniority:"Internship, Graduate, Entry-level, Junior", industries:"AI products, Language tech, Health & fitness, Travel, Education", lowPriorityIndustries:"Finance, Cryptocurrency", avoidedIndustries:"", location:"Worldwide, Europe, EU/EEA, Portugal", arrangements:"Remote", hours:"European hours, Asynchronous, US East overlap, Asia overlap", salary:"€26,000 target · €20,000 soft minimum", contract:"Permanent, Contract, Freelance", exclusions:"Senior, Staff, Principal, Lead, Manager, Director, Commission-only, Unpaid" };
const preferenceOptions={roles:["Frontend Developer","Backend Developer","Full-stack Developer","Web Developer","UI Developer","Mobile Developer","Product Engineer","AI Engineer","AI Product Developer","ML Engineer","Data Analyst","Data Engineer","QA Engineer","DevOps Engineer","Product Designer","UX Designer"],seniority:["Internship","Graduate","Entry-level","Junior","Mid-level","Senior","Lead"],industries:["AI products","Health & fitness","Education","Language tech","Travel","SaaS","E-commerce","Finance","Cryptocurrency","Climate tech","Media","Gaming","Productivity","Cybersecurity","Developer tools"],location:["Worldwide","Europe","EU/EEA","Portugal","UK","North America","Asia-Pacific"],arrangements:["Remote","Hybrid","On-site"],hours:["European hours","Asynchronous","US East overlap","US West overlap","Asia overlap"],contract:["Permanent","Contract","Freelance","Internship","Part-time","Temporary"],exclusions:["Senior","Staff","Principal","Lead","Manager","Director","Commission-only","Unpaid","Relocation required"]};
const mergePreferences=(value:Partial<Preferences>)=>({...defaultPreferences,...value});
type CandidateProfile = { title:string; summary:string; skills:string; projects:string; languages:string };
const defaultCandidateProfile: CandidateProfile = { title:"Junior Frontend and AI Product Developer", summary:"Frontend developer building responsive React applications with APIs, cloud data and AI-assisted features. Former translator with a strong interest in multilingual user experiences.", skills:"React, JavaScript, HTML, CSS, responsive design, REST APIs, Supabase, Git, GitHub", projects:"HoneyGlow Fitness Platform, Honey Decode, Travel Portfolio", languages:"English (fluent), Cantonese (native), Mandarin (fluent)" };
type DigestSettings = { enabled:boolean; frequency:"Daily"|"Weekly"; time:string; timezone:string; minScore:number; maxJobs:number; newOnly:boolean; email:string };
const defaultDigestSettings: DigestSettings = { enabled:true,frequency:"Daily",time:"08:00",timezone:"Europe/Athens",minScore:80,maxJobs:5,newOnly:true,email:"" };
type CloudStatus = "checking" | "signed-out" | "synced" | "saving" | "error";
function scoreJob(job:Job,preferences:Preferences,profile:CandidateProfile){
  const roles=preferences.roles.toLowerCase();
  const industries=preferences.industries.toLowerCase();
  const lowPriority=preferences.lowPriorityIndustries.toLowerCase();
  const avoided=preferences.avoidedIndustries.toLowerCase();
  const skills=profile.skills.toLowerCase();
  let score=20;
  if(job.focus==="AI"&&roles.includes("ai"))score+=18;
  if(job.title.toLowerCase().includes("frontend")&&roles.includes("frontend"))score+=15;
  if(job.focus==="UI"&&roles.includes("ui"))score+=15;
  if(job.title.toLowerCase().includes("junior"))score+=5;
  const industryText=`${job.title} ${job.summary} ${job.originalDescription||""}`.toLowerCase();
  if(industryText.split(/\W+/).some(word=>word.length>3&&industries.includes(word)))score+=12;
  if(industryText.split(/\W+/).some(word=>word.length>3&&lowPriority.includes(word)))score-=6;
  if(industryText.split(/\W+/).some(word=>word.length>3&&avoided.includes(word)))score-=20;
  if(preferences.location.toLowerCase().includes("remote")&&job.location.toLowerCase().includes("remote"))score+=10;
  if(job.schedule.toLowerCase().includes("european")&&preferences.hours.toLowerCase().includes("european"))score+=8; else if(job.schedule.toLowerCase().includes("overlap"))score+=4;
  if(parseInt(job.salary.replace(/\D/g,""),10)>=20)score+=5;
  if(preferences.contract.toLowerCase().includes(job.contract.toLowerCase()))score+=5;
  score+=Math.min(15,job.skills.filter(skill=>skills.includes(skill.toLowerCase())).length*3);
  return Math.max(1,Math.min(99,score));
}

function passesHardFilters(job:Job,preferences:Preferences){
  const text=`${job.title} ${job.location} ${job.contract}`.toLowerCase();
  const exclusions=preferences.exclusions.split(",").map(value=>value.trim().toLowerCase()).filter(Boolean);
  if(exclusions.some(term=>text.includes(term)))return false;
  if(preferences.arrangements.toLowerCase().includes("remote")&&!preferences.arrangements.toLowerCase().includes("hybrid")&&!job.location.toLowerCase().includes("remote"))return false;
  return true;
}

function cleanSentence(value:string,max=190){
  const clean=value.replace(/\s+/g," ").trim();
  if(clean.length<=max)return clean;
  const shortened=clean.slice(0,max);
  return `${shortened.slice(0,Math.max(shortened.lastIndexOf(" "),120))}…`;
}

function analyseJob(job:Job,preferences:Preferences,profile:CandidateProfile){
  const description=job.originalDescription||job.summary;
  const profileSkills=profile.skills.toLowerCase();
  const preferenceText=`${preferences.roles} ${preferences.industries}`.toLowerCase();
  const matchingSkills=job.skills.filter(skill=>profileSkills.includes(skill.toLowerCase()));
  const missingSkills=job.skills.filter(skill=>!profileSkills.includes(skill.toLowerCase()));
  const matches:string[]=[];
  if(matchingSkills.length)matches.push(`Your ${matchingSkills.slice(0,3).join(", ")} experience matches the advertised stack.`);
  if(job.location.toLowerCase().includes("remote"))matches.push("The role is remote, matching your preferred working arrangement.");
  if((job.focus==="AI"&&preferenceText.includes("ai"))||(job.focus==="Frontend"&&preferenceText.includes("frontend"))||(job.focus==="UI"&&preferenceText.includes("ui")))matches.push(`The ${job.focus} focus aligns with your target roles.`);
  const interests=preferences.industries.split(",").map(value=>value.trim()).filter(value=>value.length>2);
  const matchedInterest=interests.find(interest=>description.toLowerCase().includes(interest.toLowerCase()));
  if(matchedInterest)matches.push(`It connects with your interest in ${matchedInterest}.`);
  if(matches.length<2)matches.push("Your API-based portfolio projects provide relevant product-development evidence.");

  const gaps:string[]=[];
  const years=[...description.matchAll(/(\d+)\+?\s*(?:to\s*\d+\s*)?years? (?:of )?(?:professional |commercial |relevant )?experience/gi)].map(match=>Number(match[1])).filter(Boolean);
  const requestedYears=years.length?Math.min(...years):0;
  if(requestedYears>=2)gaps.push(`The listing asks for about ${requestedYears}+ years of experience, so your projects must clearly demonstrate equivalent practical ability.`);
  if(missingSkills.length)gaps.push(`You do not currently list ${missingSkills.slice(0,3).join(", ")} on your profile.`);
  if(!/(worldwide|anywhere|europe|emea|portugal)/i.test(job.location))gaps.push(`Remote work appears region-limited to ${job.location.replace(/·\s*Remote/i,"").trim()}; eligibility needs checking.`);
  const language=description.match(/(?:fluen(?:t|cy)|proficien(?:t|cy)|native|c1|c2)[^.!?]{0,45}\b(French|German|Polish|Spanish|Italian|Portuguese)\b/i);
  if(language)gaps.push(`The description appears to require ${language[1]}, which is not listed in your current profile.`);
  if(job.salary==="Salary not listed")gaps.push("The employer does not publish a salary, so compensation needs confirming early.");
  if(!gaps.length)gaps.push("The listing does not reveal an obvious blocker, but confirm location eligibility and expected seniority before applying.");

  const sentences=[...new Map(description.split(/(?<=[.!?])\s+/).map(sentence=>sentence.replace(/\s+/g," ").trim()).filter(sentence=>sentence.length>35).map(sentence=>[sentence.toLowerCase().replace(/[^a-z0-9]+/g," ").trim(),sentence])).values()];
  const requirementSentences=sentences.filter(sentence=>/(required|requirements|must|\d+\+? years?|proficien|familiar|strong (?:knowledge|skills)|experience (?:with|in)|ability to|comfortable (?:with|working)|you (?:have|bring|are))|we value/i.test(sentence));
  const needs=[...new Set(requirementSentences.map(sentence=>cleanSentence(sentence)))].slice(0,4);
  if(!needs.length){
    if(job.skills.length)needs.push(`Technical skills mentioned: ${job.skills.join(", ")}.`);
    needs.push(`${job.contract}; ${job.schedule.toLowerCase()}.`);
  }
  const about=cleanSentence(sentences.slice(0,2).join(" ")||job.summary,430);
  return {matches:matches.slice(0,4),gaps:gaps.slice(0,4),needs:needs.slice(0,4),about};
}

function coverLetterFor(job:Job,profile:CandidateProfile,analysis:ReturnType<typeof analyseJob>){
  const strongest=analysis.matches[0]?.replace(/^Your /,"My ").replace(/\.$/,"")||"My frontend development experience is relevant to this position";
  return `Dear ${job.company} hiring team,\n\nI am applying for the ${job.title} position. ${strongest}. I am a ${profile.title.toLowerCase()} with practical experience building responsive applications, connecting REST APIs and delivering AI-assisted product features.\n\nThrough ${profile.projects}, I have worked across interface development, structured data and user-focused workflows. I am particularly interested in this opportunity because ${analysis.matches[1]?.toLowerCase()||"it aligns with the kind of product-focused development work I want to grow in"}\n\nI am early in my professional development, but I bring strong curiosity, careful communication and a willingness to learn quickly. I would welcome the chance to discuss how my portfolio and transferable experience could contribute to ${job.company}.\n\nKind regards,\nBeatrix Cheung`;
}

async function extractCandidateProfile(file:File,current:CandidateProfile){
  let text="";
  if(file.name.toLowerCase().endsWith(".docx")){
    const mammoth=await import("mammoth");
    const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
    text=result.value;
  }else if(file.name.toLowerCase().endsWith(".pdf")){
    const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
    const document=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const pages:string[]=[];
    for(let pageNumber=1;pageNumber<=document.numPages;pageNumber++){
      const page=await document.getPage(pageNumber);
      const content=await page.getTextContent();
      pages.push(content.items.map(item=>("str" in item?item.str:"")).join(" "));
    }
    text=pages.join("\n");
  }else{text=await file.text();}
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const upper=lines.map(line=>line.toUpperCase());
  const section=(start:string,end:string)=>{const a=upper.indexOf(start);const b=upper.indexOf(end);return a>=0?lines.slice(a+1,b>a?b:Math.min(lines.length,a+6)).join(" "):""};
  const title=lines.find(line=>/^(JUNIOR |AI )?(FRONT[ -]?END|UI|WEB|SOFTWARE).*(DEVELOPER|ENGINEER)/i.test(line))||current.title;
  const summary=section("PROFILE","PROJECTS")||current.summary;
  const knownSkills=["React","JavaScript","TypeScript","HTML","CSS","Responsive design","REST APIs","Supabase","Git","GitHub","Vite","Express","Leaflet","Framer Motion","Groq","Next.js","Node.js","Python"];
  const extractedSkills=knownSkills.filter(skill=>text.toLowerCase().includes(skill.toLowerCase()));
  const projectLines=lines.filter(line=>/\|\s*20\d{2}/.test(line)&&!/Codecademy|University/i.test(line)).map(line=>line.split("|")[0].trim());
  const languageNames=["English","Cantonese","Mandarin","Portuguese"].filter(language=>text.toLowerCase().includes(language.toLowerCase()));
  if(!text.trim())throw new Error("No readable text was found in this file.");
  return {title,summary,skills:extractedSkills.length?extractedSkills.join(", "):current.skills,projects:projectLines.length?projectLines.join(", "):current.projects,languages:languageNames.length?languageNames.join(", "):current.languages};
}

const nav = [["Overview",LayoutDashboard],["Job matches",Compass],["Applications",BriefcaseBusiness],["Profile",CircleUserRound]] as const;

export default function Home() {
  const [active,setActive] = useState("Job matches");
  const [selected,setSelected] = useState<Job|null>(null);
  const [query,setQuery] = useState("");
  const [focus,setFocus] = useState("All roles");
  const [saved,setSaved] = useState<number[]>([]);
  const [statuses,setStatuses] = useState<Record<number,string>>({});
  const [preferences,setPreferences] = useState<Preferences>(defaultPreferences);
  const [candidateProfile,setCandidateProfile] = useState<CandidateProfile>(defaultCandidateProfile);
  const [digestSettings,setDigestSettings] = useState<DigestSettings>(defaultDigestSettings);
  const [liveJobs,setLiveJobs] = useState<Job[]>([]);
  const [liveSources,setLiveSources] = useState<string[]>([]);
  const [searching,setSearching] = useState(false);
  const [lastLiveSearch,setLastLiveSearch] = useState("");
  const [cloudStatus,setCloudStatus] = useState<CloudStatus>("checking");
  const [cloudReady,setCloudReady] = useState(false);
  const [prepJob,setPrepJob] = useState<Job|null>(null);
  const [toast,setToast] = useState("");
  const [mobileNav,setMobileNav] = useState(false);

  useEffect(()=>{
    const stored=window.localStorage.getItem("matchpath-statuses"); if(stored) setStatuses(JSON.parse(stored));
    const storedSaved=window.localStorage.getItem("matchpath-saved"); setSaved(storedSaved?JSON.parse(storedSaved):[2]);
    const storedPreferences=window.localStorage.getItem("matchpath-preferences"); if(storedPreferences) setPreferences(mergePreferences(JSON.parse(storedPreferences)));
    const storedProfile=window.localStorage.getItem("matchpath-candidate-profile"); if(storedProfile) setCandidateProfile(JSON.parse(storedProfile));
    const storedDigest=window.localStorage.getItem("matchpath-digest-settings"); if(storedDigest) setDigestSettings(JSON.parse(storedDigest));
    void refreshLiveJobs(false);
    void loadCloudState();
  },[]);
  useEffect(()=>{
    if(!cloudReady)return;
    const timer=window.setTimeout(()=>void saveCloudState(),900);
    return()=>window.clearTimeout(timer);
  },[preferences,candidateProfile,digestSettings,saved,statuses,cloudReady]);
  const rankedJobs=useMemo(()=>liveJobs.filter(job=>passesHardFilters(job,preferences)).map(job=>{const analysis=analyseJob(job,preferences,candidateProfile);return {...job,score:scoreJob(job,preferences,candidateProfile),matches:analysis.matches,gaps:analysis.gaps}}).sort((a,b)=>b.score-a.score),[preferences,candidateProfile,liveJobs]);
  const filtered=useMemo(()=>rankedJobs.filter(job=>`${job.title} ${job.company} ${job.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase())&&(focus==="All roles"||job.focus===focus)),[query,focus,rankedJobs]);
  useEffect(()=>{setSelected(current=>current?(rankedJobs.find(job=>job.id===current.id)||current):current)},[rankedJobs]);
  useEffect(()=>{if(liveJobs.length&&!selected)setSelected(rankedJobs[0])},[liveJobs]);
  function updateStatus(id:number,status:string){ const next={...statuses,[id]:status}; setStatuses(next); window.localStorage.setItem("matchpath-statuses",JSON.stringify(next)); if(!saved.includes(id)){const nextSaved=[...saved,id];setSaved(nextSaved);window.localStorage.setItem("matchpath-saved",JSON.stringify(nextSaved));} }
  function moveJob(id:number,status:string){ const next={...statuses}; if(status==="Saved") delete next[id]; else next[id]=status; setStatuses(next); window.localStorage.setItem("matchpath-statuses",JSON.stringify(next)); if(!saved.includes(id)){const nextSaved=[...saved,id];setSaved(nextSaved);window.localStorage.setItem("matchpath-saved",JSON.stringify(nextSaved));} }
  function toggleSaved(id:number){ const isRemoving=saved.includes(id); const next=isRemoving?saved.filter(savedId=>savedId!==id):[...saved,id]; setSaved(next); window.localStorage.setItem("matchpath-saved",JSON.stringify(next)); if(isRemoving){const nextStatuses={...statuses};delete nextStatuses[id];setStatuses(nextStatuses);window.localStorage.setItem("matchpath-statuses",JSON.stringify(nextStatuses));} setToast(isRemoving?"Job removed from Applications":"Job saved to Applications"); }
  function savePreferences(next:Preferences){ setPreferences(next); window.localStorage.setItem("matchpath-preferences",JSON.stringify(next)); setToast("Preferences saved — refreshing live matches"); void refreshLiveJobs(true,next); }
  function saveProfile(next:CandidateProfile){ setCandidateProfile(next); window.localStorage.setItem("matchpath-candidate-profile",JSON.stringify(next)); setToast("Profile and preferences saved"); }
  function saveDigest(next:DigestSettings){ setDigestSettings(next); window.localStorage.setItem("matchpath-digest-settings",JSON.stringify(next)); setToast("Daily Digest settings saved locally"); }
  async function extractCv(file:File){const extracted=await extractCandidateProfile(file,candidateProfile);setToast("CV extracted — review the fields and save your profile");return extracted;}
  async function refreshLiveJobs(force:boolean,searchPreferences=preferences){
    const cacheKey=`matchpath-live-jobs-v3-${searchPreferences.roles.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,80)}`;
    if(!force){const cached=window.localStorage.getItem(cacheKey);if(cached){try{const parsed=JSON.parse(cached);if(Date.now()-parsed.savedAt<6*60*60*1000&&parsed.jobs?.length){setLiveJobs(parsed.jobs);setLiveSources(parsed.sources||[]);setLastLiveSearch(parsed.fetchedAt);return}}catch{}}}
    setSearching(true);
    try{const roleQuery=encodeURIComponent(searchPreferences.roles);const response=await fetch(`/api/jobs?roles=${roleQuery}`);if(!response.ok)throw new Error("Live search is temporarily unavailable");const data=await response.json();if(data.jobs?.length){setLiveJobs(data.jobs);setLiveSources(data.sources||[]);setLastLiveSearch(data.fetchedAt);window.localStorage.setItem(cacheKey,JSON.stringify({jobs:data.jobs,sources:data.sources||[],fetchedAt:data.fetchedAt,savedAt:Date.now()}));setToast(`${data.jobs.length} real jobs loaded from ${(data.sources||[]).join(", ")}`)}else{setLiveJobs([]);setLiveSources([]);setToast("No suitable live jobs found right now")}}
    catch{setLiveJobs([]);setLiveSources([]);setToast("Live job sources are temporarily unavailable — please try again")}
    finally{setSearching(false)}
  }
  async function loadCloudState(){
    try{const response=await fetch("/api/state");if(response.status===401){setCloudStatus("signed-out");return}if(!response.ok)throw new Error();const data=await response.json();if(data.state){const state=data.state;if(state.preferences){const merged=mergePreferences(state.preferences);setPreferences(merged);window.localStorage.setItem("matchpath-preferences",JSON.stringify(merged))}if(state.candidateProfile){setCandidateProfile(state.candidateProfile);window.localStorage.setItem("matchpath-candidate-profile",JSON.stringify(state.candidateProfile))}if(state.digestSettings){setDigestSettings(state.digestSettings);window.localStorage.setItem("matchpath-digest-settings",JSON.stringify(state.digestSettings))}if(state.saved){setSaved(state.saved);window.localStorage.setItem("matchpath-saved",JSON.stringify(state.saved))}if(state.statuses){setStatuses(state.statuses);window.localStorage.setItem("matchpath-statuses",JSON.stringify(state.statuses))}}setCloudStatus("synced");setCloudReady(true)}
    catch{setCloudStatus("error")}
  }
  async function saveCloudState(){
    setCloudStatus("saving");
    try{const response=await fetch("/api/state",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({preferences,candidateProfile,digestSettings,saved,statuses})});if(response.status===401){setCloudStatus("signed-out");return}if(!response.ok)throw new Error();setCloudStatus("synced")}
    catch{setCloudStatus("error")}
  }
  const selectedAnalysis=selected?analyseJob(selected,preferences,candidateProfile):null;

  return <main className="app-shell">
    <aside className={`sidebar ${mobileNav?"open":""}`}>
      <div className="brand"><span className="brand-mark">M</span><span>MatchPath</span></div>
      <button className="close-nav" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X size={20}/></button>
      <nav><p className="nav-label">Workspace</p>{nav.map(([label,Icon])=><button key={label} className={active===label?"nav-item active":"nav-item"} onClick={()=>{setActive(label);setMobileNav(false)}}><Icon size={18}/>{label}{label==="Job matches"&&<span className="count">{rankedJobs.length}</span>}</button>)}
        <p className="nav-label second">Manage</p><button className={active==="Daily digest"?"nav-item active":"nav-item"} onClick={()=>setActive("Daily digest")}><Bell size={18}/>Daily digest</button>
      </nav>
      <div className="sidebar-foot"><div className="profile-mini"><span>BC</span><div><strong>Beatrix</strong><small>Private workspace</small></div></div><div className="demo-note"><Sparkles size={16}/><p><strong>Live jobs only</strong><br/>Every listing links to its original source.</p></div></div>
    </aside>
    <section className="main-panel">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open menu"><span/><span/><span/></button><div className="mobile-brand">MatchPath</div><div className="top-actions">{cloudStatus==="signed-out"?<a className="cloud-pill sign-in" href="/signin-with-chatgpt?return_to=%2F" target="_top">Enable cloud sync</a>:<span className={`cloud-pill ${cloudStatus}`}><i/>{cloudStatus==="checking"?"Checking cloud":cloudStatus==="saving"?"Saving…":cloudStatus==="synced"?"Cloud synced":"Cloud unavailable"}</span>}<button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button><button className="avatar">BC</button></div></header>
      {active==="Job matches"?<div className="content">
        <section className="page-heading"><div><p className="eyebrow">YOUR OPPORTUNITIES</p><h1>Job matches</h1><p>Remote roles ranked against your experience, goals and working preferences.</p></div><button className="primary-button" disabled={searching} onClick={()=>void refreshLiveJobs(true)}><Sparkles size={17}/>{searching?"Searching…":"Find new matches"}</button></section>
        <section className="summary-strip"><div><span className="summary-icon lavender"><Target size={20}/></span><p><strong>{rankedJobs.length}</strong><small>Live matches</small></p></div><div><span className="summary-icon green"><Sparkles size={20}/></span><p><strong>{rankedJobs.filter(job=>job.score>=80).length}</strong><small>Strong matches</small></p></div><div><span className="summary-icon amber"><Clock3 size={20}/></span><p><strong>{lastLiveSearch?"Today":"Not yet"}</strong><small>Last search</small></p></div><p className="digest"><Check size={15}/> {liveSources.length?`Sources: ${liveSources.join(", ")}`:"Searching verified sources"}</p></section>
        <section className="toolbar"><label className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search roles, companies or skills"/></label><div className="filter-wrap"><Filter size={17}/><select value={focus} onChange={e=>setFocus(e.target.value)}><option>All roles</option><option>AI</option><option>Frontend</option><option>UI</option></select><ChevronDown size={15}/></div><button className="filter-button">Remote only <X size={14}/></button></section>
        <section className={`results-layout ${selected?"detail-open":""}`}><div className="job-list"><div className="list-heading"><span>{filtered.length} live matches</span><span>Sorted by best match</span></div>{filtered.map(job=><article key={job.id} className={`job-card ${selected?.id===job.id?"selected":""}`} onClick={()=>setSelected(job)}><div className="company-logo" style={{background:job.color}}>{job.logo}</div><div className="job-main"><div className="job-title-row"><div><h2>{job.title}</h2><p>{job.company}</p></div><button className={`heart ${saved.includes(job.id)?"saved":""}`} onClick={e=>{e.stopPropagation();toggleSaved(job.id)}} aria-label={saved.includes(job.id)?"Unsave job":"Save job"}><Heart size={18}/></button></div><div className="job-meta"><span><MapPin size={14}/>{job.location}</span><span>{job.contract}</span><span>{job.salary}</span></div><div className="job-bottom"><div><span className={`score score-${job.score>=90?"high":job.score>=80?"medium":"low"}`}>{job.score}% match</span><span className="tag">{job.focus}</span><span className="tag source-tag">{job.source}</span>{statuses[job.id]&&<span className="tag status-tag">{statuses[job.id]}</span>}</div><small>{job.posted}</small></div></div></article>)}{!filtered.length&&<div className="empty"><Search size={24}/><strong>{searching?"Searching live job sources…":"No suitable live roles found"}</strong><p>{searching?"This can take a few seconds.":"Try a different filter or run a new search later."}</p></div>}</div>
          {selected&&<aside className="job-detail"><div className="detail-top"><div className="company-logo large" style={{background:selected.color}}>{selected.logo}</div><button className="detail-close" onClick={()=>setSelected(null)}><X size={18}/></button></div><p className="detail-company">{selected.company}</p><h2>{selected.title}</h2><div className="detail-meta"><span><MapPin size={14}/>{selected.location}</span><span><Clock3 size={14}/>{selected.schedule}</span></div><div className="listing-actions"><a className="original-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">Open original post <ArrowUpRight size={14}/></a></div><section className="role-summary"><h3>What this job is about</h3><p>{selectedAnalysis?.about}</p><h3>What they need</h3><ul>{selectedAnalysis?.needs.map(item=><li key={item}>{item}</li>)}</ul></section><div className="match-hero"><div className="score-ring" style={{"--score":`${selected.score*3.6}deg`} as React.CSSProperties}><span>{selected.score}<small>%</small></span></div><div><strong>{selected.score>=90?"Strong match":selected.score>=80?"Good match":"Possible match"}</strong><p>Based on your saved profile and preferences</p></div></div>{selected.matches.length>0&&<section className="reason-section"><h3>Why it fits</h3>{selected.matches.map(item=><p className="reason good" key={item}><Check size={15}/>{item}</p>)}</section>}{selected.gaps.length>0&&<section className="reason-section"><h3>Limitations to consider</h3>{selected.gaps.map(item=><p className="reason warn" key={item}><span>!</span>{item}</p>)}</section>}<div className="skill-row">{selected.skills.map(skill=><span key={skill}>{skill}</span>)}</div><div className="detail-actions"><button className="primary-button" onClick={()=>{updateStatus(selected.id,"Preparing");setPrepJob(selected);setActive("Application prep")}}>Prepare application <ArrowUpRight size={16}/></button><button className="secondary-button" onClick={()=>{updateStatus(selected.id,"Maybe");setToast("Moved to Maybe in Applications")}}>Maybe</button></div></aside>}
        </section>
      </div>:active==="Application prep"&&prepJob?<ApplicationPrep job={prepJob} profile={candidateProfile} preferences={preferences} onBack={()=>setActive("Job matches")} onApplied={()=>{updateStatus(prepJob.id,"Applied");setToast("Application marked as applied");setActive("Applications")}}/>:<PlaceholderPage active={active} statuses={statuses} saved={saved} toggleSaved={toggleSaved} moveJob={moveJob} preferences={preferences} savePreferences={savePreferences} candidateProfile={candidateProfile} saveProfile={saveProfile} extractCv={extractCv} digestSettings={digestSettings} saveDigest={saveDigest} matchingJobs={rankedJobs} navigate={setActive} reviewJob={job=>{setSelected(job);setActive("Job matches")}} findMatches={()=>void refreshLiveJobs(true)}/>} 
      {toast&&<button className="toast" onClick={()=>setToast("")} aria-live="polite"><Check size={16}/>{toast}<X size={14}/></button>}
    </section>
  </main>;
}

function ApplicationPrep({job,profile,preferences,onBack,onApplied}:{job:Job;profile:CandidateProfile;preferences:Preferences;onBack:()=>void;onApplied:()=>void}){
  const analysis=analyseJob(job,preferences,profile);
  const storageKey=`matchpath-application-draft-${job.id}`;
  const [letter,setLetter]=useState(()=>coverLetterFor(job,profile,analysis));
  const [message,setMessage]=useState("");
  useEffect(()=>{const stored=window.localStorage.getItem(storageKey);if(stored)setLetter(stored)},[storageKey]);
  useEffect(()=>{const timer=window.setTimeout(()=>window.localStorage.setItem(storageKey,letter),500);return()=>window.clearTimeout(timer)},[letter,storageKey]);
  const cvActions=[
    `Change your CV headline to “${job.title} | React, APIs and AI-assisted products” for this application.`,
    `Move your most relevant project to the top and describe the user problem, your technical contribution and the result.`,
    job.skills.length?`Use truthful keywords from the listing where they apply: ${job.skills.join(", ")}.`:"Mirror the employer’s terminology where it accurately describes your experience.",
    analysis.gaps[0]?`Address this concern with evidence rather than hiding it: ${analysis.gaps[0]}`:"Confirm regional eligibility and expected experience before submitting.",
  ];
  async function copyLetter(){try{await navigator.clipboard.writeText(letter);setMessage("Cover letter copied")}catch{setMessage("Select the text and copy it manually")}}
  return <div className="content application-prep"><section className="prep-heading"><button className="back-link" onClick={onBack}>← Back to job</button><p className="eyebrow">APPLICATION WORKSPACE</p><div><div><h1>{job.title}</h1><p>{job.company} · {job.location}</p></div><span className={`score score-${job.score>=90?"high":job.score>=80?"medium":"low"}`}>{job.score}% match</span></div></section><section className="prep-steps"><span className="active"><b>1</b>Tailor CV</span><span className="active"><b>2</b>Draft cover letter</span><span><b>3</b>Review and apply</span></section><div className="prep-grid"><section className="prep-card"><p className="eyebrow">STEP 1</p><h2>Tailor your CV</h2><p className="prep-intro">Make these changes in your CV before submitting. Keep every claim accurate.</p><ol className="cv-actions">{cvActions.map(action=><li key={action}>{action}</li>)}</ol><div className="keyword-box"><strong>Evidence to emphasise</strong>{analysis.matches.map(item=><p key={item}><Check size={14}/>{item}</p>)}</div></section><section className="prep-card cover-card"><div className="prep-card-title"><div><p className="eyebrow">STEP 2</p><h2>Cover-letter draft</h2></div><button className="secondary-button" onClick={()=>void copyLetter()}>Copy draft</button></div><p className="prep-intro">This is a starting point generated from your saved profile and the job. Review every sentence before using it.</p><textarea value={letter} onChange={event=>setLetter(event.target.value)} aria-label="Cover letter draft"/>{message&&<small className="copy-message">{message}</small>}</section></div><section className="review-bar"><div><strong>Ready for the employer’s application?</strong><p>Check the original requirements, attach the tailored CV and review your answers before submitting.</p></div><div><a className="secondary-button" href={job.sourceUrl} target="_blank" rel="noreferrer">Open application <ArrowUpRight size={15}/></a><button className="primary-button" onClick={onApplied}><Check size={15}/>Mark as applied</button></div></section></div>;
}

function ChipField({label,help,value,options,onChange,tone="default"}:{label:string;help:string;value:string;options:string[];onChange:(value:string)=>void;tone?:"default"|"low"|"avoid"}){
  const [custom,setCustom]=useState("");
  const selected=value.split(",").map(item=>item.trim()).filter(Boolean);
  const toggle=(option:string)=>onChange(selected.some(item=>item.toLowerCase()===option.toLowerCase())?selected.filter(item=>item.toLowerCase()!==option.toLowerCase()).join(", "):[...selected,option].join(", "));
  const addCustom=()=>{const next=custom.trim();if(next&&!selected.some(item=>item.toLowerCase()===next.toLowerCase()))onChange([...selected,next].join(", "));setCustom("")};
  return <div className={`preference-field ${tone}`}><div><strong>{label}</strong><p>{help}</p></div><div className="chip-options">{options.map(option=><button type="button" key={option} className={selected.some(item=>item.toLowerCase()===option.toLowerCase())?"selected":""} onClick={()=>toggle(option)}>{selected.some(item=>item.toLowerCase()===option.toLowerCase())&&<Check size={12}/>} {option}</button>)}</div><div className="custom-option"><input value={custom} onChange={event=>setCustom(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();addCustom()}}} placeholder="Add a custom option"/><button type="button" onClick={addCustom}>Add</button></div>{selected.filter(item=>!options.some(option=>option.toLowerCase()===item.toLowerCase())).length>0&&<div className="custom-chips">{selected.filter(item=>!options.some(option=>option.toLowerCase()===item.toLowerCase())).map(item=><button type="button" key={item} onClick={()=>toggle(item)}>{item} <X size={11}/></button>)}</div>}</div>;
}

function PreferenceBuilder({draft,setDraft}:{draft:Preferences;setDraft:(next:Preferences)=>void}){
  return <section className="preference-builder-card"><div className="form-section-heading"><div><p className="eyebrow">MATCHING RULES</p><h2>Job-search preferences</h2><p>Select options or add your own. Hard exclusions remove jobs; other choices change search and ranking.</p></div></div><div className="preference-builder"><ChipField label="Target roles" help="Used to request jobs and calculate role fit." value={draft.roles} options={preferenceOptions.roles} onChange={roles=>setDraft({...draft,roles})}/><ChipField label="Seniority" help="Choose every level you will consider." value={draft.seniority} options={preferenceOptions.seniority} onChange={seniority=>setDraft({...draft,seniority})}/><ChipField label="Preferred industries" help="Matching industries rank higher." value={draft.industries} options={preferenceOptions.industries} onChange={industries=>setDraft({...draft,industries})}/><ChipField label="Low-priority industries" help="These remain visible but rank lower." value={draft.lowPriorityIndustries} options={preferenceOptions.industries} tone="low" onChange={lowPriorityIndustries=>setDraft({...draft,lowPriorityIndustries})}/><ChipField label="Avoid industries" help="These receive a large ranking penalty." value={draft.avoidedIndustries} options={preferenceOptions.industries} tone="avoid" onChange={avoidedIndustries=>setDraft({...draft,avoidedIndustries})}/><ChipField label="Eligible locations" help="Select broad regions and add countries." value={draft.location} options={preferenceOptions.location} onChange={location=>setDraft({...draft,location})}/><ChipField label="Work arrangement" help="Remote-only acts as a hard filter." value={draft.arrangements} options={preferenceOptions.arrangements} onChange={arrangements=>setDraft({...draft,arrangements})}/><ChipField label="Working hours" help="Used for time-zone compatibility." value={draft.hours} options={preferenceOptions.hours} onChange={hours=>setDraft({...draft,hours})}/><ChipField label="Employment type" help="Select all contract types you will consider." value={draft.contract} options={preferenceOptions.contract} onChange={contract=>setDraft({...draft,contract})}/><ChipField label="Hard exclusions" help="Jobs containing these terms are removed." value={draft.exclusions} options={preferenceOptions.exclusions} tone="avoid" onChange={exclusions=>setDraft({...draft,exclusions})}/><label className="salary-field"><span>Salary preference</span><input value={draft.salary} onChange={event=>setDraft({...draft,salary:event.target.value})}/><small>Flexible text supports currencies and hourly or annual rates.</small></label></div></section>;
}

function PlaceholderPage({active,statuses,saved,toggleSaved,moveJob,preferences,savePreferences,candidateProfile,saveProfile,extractCv,digestSettings,saveDigest,matchingJobs,navigate,reviewJob,findMatches}:{active:string;statuses:Record<number,string>;saved:number[];toggleSaved:(id:number)=>void;moveJob:(id:number,status:string)=>void;preferences:Preferences;savePreferences:(next:Preferences)=>void;candidateProfile:CandidateProfile;saveProfile:(next:CandidateProfile)=>void;extractCv:(file:File)=>Promise<CandidateProfile>;digestSettings:DigestSettings;saveDigest:(next:DigestSettings)=>void;matchingJobs:Job[];navigate:(page:string)=>void;reviewJob:(job:Job)=>void;findMatches:()=>void}){
  const [draft,setDraft]=useState(preferences);
  const [profileDraft,setProfileDraft]=useState(candidateProfile);
  const [dragging,setDragging]=useState<number|null>(null);
  const [cvName,setCvName]=useState("Beatrix_Cheung_Developer_CV.docx");
  const [extracting,setExtracting]=useState(false);
  const [extractMessage,setExtractMessage]=useState("");
  const [digestDraft,setDigestDraft]=useState(digestSettings);
  useEffect(()=>setDraft(preferences),[preferences]);
  useEffect(()=>setProfileDraft(candidateProfile),[candidateProfile]);
  useEffect(()=>setDigestDraft(digestSettings),[digestSettings]);
  const descriptions:Record<string,string>={Overview:"A focused snapshot of your search progress and strongest opportunities.",Applications:"Track every role from first look to application, interview and offer.",Profile:"The experience MatchPath uses to explain every score.",Preferences:"Control which jobs MatchPath prioritises and how it evaluates them.","Daily digest":"Choose how MatchPath should summarize new opportunities."};
  return <div className="content placeholder-page"><section className="page-heading"><div><p className="eyebrow">MATCHPATH</p><h1>{active}</h1><p>{descriptions[active]}</p></div></section>{active==="Profile"&&<PreferenceBuilder draft={draft} setDraft={setDraft}/>} 
    {active==="Profile"?<form className="combined-profile-form" onSubmit={e=>{e.preventDefault();savePreferences(draft);saveProfile(profileDraft)}}><section><div className="form-section-heading"><div><p className="eyebrow">FROM YOUR CV</p><h2>Candidate profile</h2><p>Upload a PDF, DOCX or TXT CV. Extraction happens locally in your browser.</p></div><div className="cv-controls"><span className="cv-source">{cvName}</span><label className={`upload-cv ${extracting?"disabled":""}`}><input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" disabled={extracting} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setExtracting(true);setExtractMessage("");try{setProfileDraft(await extractCv(file));setCvName(file.name);setExtractMessage("Information extracted. Review the fields, then save your profile.")}catch(error){setExtractMessage(error instanceof Error?error.message:"The CV could not be read. Scanned PDFs without selectable text are not supported yet.")}finally{setExtracting(false);e.target.value=""}}}/><span>{extracting?"Extracting…":"Upload updated CV"}</span></label></div></div>{extractMessage&&<p className="extract-message">{extractMessage}</p>}<div className="form-grid"><label><span>Professional title</span><input value={profileDraft.title} onChange={e=>setProfileDraft({...profileDraft,title:e.target.value})}/></label><label className="wide"><span>Professional summary</span><textarea value={profileDraft.summary} onChange={e=>setProfileDraft({...profileDraft,summary:e.target.value})}/></label><label className="wide"><span>Skills</span><textarea value={profileDraft.skills} onChange={e=>setProfileDraft({...profileDraft,skills:e.target.value})}/></label><label><span>Projects</span><textarea value={profileDraft.projects} onChange={e=>setProfileDraft({...profileDraft,projects:e.target.value})}/></label><label><span>Languages</span><textarea value={profileDraft.languages} onChange={e=>setProfileDraft({...profileDraft,languages:e.target.value})}/></label></div></section><section><div className="form-section-heading"><div><p className="eyebrow">MATCHING RULES</p><h2>Job-search preferences</h2><p>Saving these values immediately recalculates and reorders your matches.</p></div></div><div className="form-grid">{([ ["roles","Target roles"],["industries","Preferred industries"],["location","Location and remote rules"],["hours","Working hours"],["salary","Salary preference"],["contract","Contract preference"] ] as [keyof Preferences,string][]).map(([key,label])=><label key={key}><span>{label}</span><textarea value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}</div></section><div className="profile-save-bar"><p>Save to apply the updated profile and recalculate every match.</p><div><button type="button" className="secondary-button" onClick={()=>{setProfileDraft(candidateProfile);setDraft(preferences)}}>Cancel changes</button><button className="primary-button" type="submit"><Check size={16}/>Save and update matches</button></div></div></form>
    :active==="Applications"?<><p className="board-help">Drag jobs between columns, or use the stage menu on each card. Unclick the heart to remove a job from Applications.</p><div className="kanban">{["Saved","Maybe","Preparing","Applied","Interview"].map(column=>{const columnJobs=matchingJobs.filter(job=>column==="Saved"?saved.includes(job.id)&&!statuses[job.id]:saved.includes(job.id)&&statuses[job.id]===column);return <div className={`kanban-col ${dragging!==null?"drag-active":""}`} key={column} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragging!==null)moveJob(dragging,column);setDragging(null)}}><h3>{column}<span>{columnJobs.length}</span></h3>{columnJobs.map(job=><article key={job.id} draggable onDragStart={()=>setDragging(job.id)} onDragEnd={()=>setDragging(null)} className={dragging===job.id?"dragging":""}><div className="application-card-title"><strong>{job.title}</strong><button onClick={()=>toggleSaved(job.id)} aria-label="Unsave job" title="Remove from Applications"><Heart size={15} fill="currentColor"/></button></div><p>{job.company}</p><div className="application-card-bottom"><span>{job.score}% match</span><select aria-label={`Move ${job.title}`} value={column} onChange={e=>moveJob(job.id,e.target.value)}>{["Saved","Maybe","Preparing","Applied","Interview"].map(stage=><option key={stage}>{stage}</option>)}</select></div></article>)}{!columnJobs.length&&<p className="column-empty">Drop a job here</p>}</div>})}</div></>
    :active==="Daily digest"?<form className="digest-settings-form" onSubmit={e=>{e.preventDefault();saveDigest(digestDraft)}}><section className="digest-status"><div className="digest-status-copy"><span className="summary-icon lavender"><Bell size={20}/></span><div><h2>Job match digest</h2><p>Choose when and which matches should appear in your email summary.</p></div></div><label className="toggle-row"><input type="checkbox" checked={digestDraft.enabled} onChange={e=>setDigestDraft({...digestDraft,enabled:e.target.checked})}/><span className="toggle-track"><i/></span><b>{digestDraft.enabled?"Enabled":"Disabled"}</b></label></section><section className="digest-form-grid"><label><span>Frequency</span><select value={digestDraft.frequency} onChange={e=>setDigestDraft({...digestDraft,frequency:e.target.value as "Daily"|"Weekly"})}><option>Daily</option><option>Weekly</option></select></label><label><span>Delivery time</span><input type="time" value={digestDraft.time} onChange={e=>setDigestDraft({...digestDraft,time:e.target.value})}/></label><label><span>Timezone</span><select value={digestDraft.timezone} onChange={e=>setDigestDraft({...digestDraft,timezone:e.target.value})}><option>Europe/Athens</option><option>Europe/Lisbon</option><option>Europe/London</option><option>Asia/Hong_Kong</option></select></label><label><span>Minimum match score</span><div className="range-field"><input type="range" min="50" max="95" step="5" value={digestDraft.minScore} onChange={e=>setDigestDraft({...digestDraft,minScore:Number(e.target.value)})}/><b>{digestDraft.minScore}%+</b></div></label><label><span>Maximum jobs per digest</span><select value={digestDraft.maxJobs} onChange={e=>setDigestDraft({...digestDraft,maxJobs:Number(e.target.value)})}><option value="3">3 jobs</option><option value="5">5 jobs</option><option value="10">10 jobs</option></select></label><label><span>Delivery email</span><input type="email" placeholder="you@example.com" value={digestDraft.email} onChange={e=>setDigestDraft({...digestDraft,email:e.target.value})}/></label><label className="check-field wide"><input type="checkbox" checked={digestDraft.newOnly} onChange={e=>setDigestDraft({...digestDraft,newOnly:e.target.checked})}/><span>Include only newly discovered jobs</span></label></section><section className="digest-not-connected"><div><strong>Email delivery is not connected yet</strong><p>Your choices are saved locally. Live scheduled delivery will be activated after real job sources and private cloud storage are connected.</p></div><span>Settings only</span></section><div className="digest-actions"><button type="button" className="secondary-button" onClick={()=>setDigestDraft(digestSettings)}>Cancel changes</button><button type="submit" className="primary-button"><Check size={16}/>Save digest settings</button></div></form>
    :<div className="overview-job-search"><section className="search-status-card"><div><span className="summary-icon green"><Check size={20}/></span><div><p className="eyebrow">SEARCH STATUS</p><h2>{matchingJobs.length?"Live search complete":"No suitable live jobs yet"}</h2><p>{matchingJobs.length?`${matchingJobs.length} verified listings ranked against your profile`:"Run another search later — no fictional jobs will be shown"}</p></div></div><button className="secondary-button" onClick={findMatches}><Sparkles size={15}/>Find new matches</button></section><section className="strong-matches"><div className="section-heading"><div><p className="eyebrow">80% MATCH OR HIGHER</p><h2>Strong matches</h2><p>The three most relevant recent opportunities for your saved profile.</p></div><button onClick={()=>navigate("Job matches")}>View all matches <ArrowUpRight size={14}/></button></div><div className="overview-match-list">{matchingJobs.filter(job=>job.score>=80).slice(0,3).map(job=><article key={job.id}><div className="company-logo" style={{background:job.color}}>{job.logo}</div><div className="overview-match-copy"><p>{job.company}</p><h3>{job.title}</h3><div><span><MapPin size={13}/>{job.location}</span><span>{job.salary}</span><span>{job.contract}</span></div></div><span className="score score-high">{job.score}% match</span><button className="secondary-button" onClick={()=>reviewJob(job)}>Review match <ArrowUpRight size={14}/></button></article>)}</div></section></div>}
  </div>;
}
