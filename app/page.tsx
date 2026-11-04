"use client";

import {
  ArrowUpRight, Bell, BriefcaseBusiness, Check, ChevronDown,
  CircleUserRound, Clock3, Compass, Filter, Heart, LayoutDashboard,
  MapPin, MoreHorizontal, Search, Settings2, Sparkles, Target, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Job = {
  id: number; company: string; title: string; location: string; schedule: string;
  salary: string; contract: string; posted: string; score: number;
  focus: "AI" | "Frontend" | "UI"; logo: string; color: string;
  summary: string; matches: string[]; gaps: string[]; skills: string[];
};

const jobs: Job[] = [
  { id:1, company:"LinguaFlow", title:"Junior AI Product Developer", location:"Europe · Remote", schedule:"European hours", salary:"€30k–€38k", contract:"Permanent", posted:"2h ago", score:94, focus:"AI", logo:"L", color:"#805ad5", summary:"Build multilingual learning experiences powered by language models, working closely with product and design.", matches:["React interface work","AI API integration","Language and localisation background","English-first remote team"], gaps:["TypeScript is preferred","Automated testing experience"], skills:["React","AI APIs","REST","TypeScript","EdTech"] },
  { id:2, company:"VitaTrack", title:"Frontend Developer — AI Health", location:"Portugal · Remote", schedule:"European hours", salary:"€26k–€34k", contract:"Permanent", posted:"5h ago", score:91, focus:"AI", logo:"V", color:"#16806a", summary:"Create accessible React experiences for an AI-assisted wellness and nutrition platform.", matches:["Health and fitness domain","React and responsive UI","Nutrition logging project","Portugal remote eligibility"], gaps:["Next.js can be learned on the job"], skills:["React","Next.js","AI products","CSS","APIs"] },
  { id:3, company:"Roamly", title:"Junior React Developer", location:"Worldwide · Remote", schedule:"Async + EU overlap", salary:"€28k–€35k", contract:"Contract", posted:"1d ago", score:86, focus:"Frontend", logo:"R", color:"#d97736", summary:"Help ship interactive travel planning tools for a distributed, asynchronous product team.", matches:["Travel product interest","React and dynamic routes","Interactive map experience","Contractor-friendly"], gaps:["Two years of commercial experience requested"], skills:["React","Leaflet","JavaScript","REST","Git"] },
  { id:4, company:"CanvasLearn", title:"UI Developer", location:"EU · Remote", schedule:"European hours", salary:"€24k–€30k", contract:"Permanent", posted:"1d ago", score:81, focus:"UI", logo:"C", color:"#286ca8", summary:"Turn product designs into responsive, accessible interfaces for an online learning platform.", matches:["Responsive UI implementation","Education sector preference","HTML and CSS","Reusable React components"], gaps:["Figma handoff workflow","Accessibility testing"], skills:["HTML","CSS","React","Figma","Accessibility"] },
  { id:5, company:"LedgerFox", title:"Junior Frontend Engineer", location:"Europe · Remote", schedule:"EU + US overlap", salary:"€32k–€40k", contract:"Permanent", posted:"2d ago", score:68, focus:"Frontend", logo:"F", color:"#4b6074", summary:"Develop dashboards for a financial automation product serving small businesses.", matches:["React dashboard experience","REST API integration","Strong salary range"], gaps:["Finance is a lower-priority industry","Four hours of US overlap","TypeScript required"], skills:["React","TypeScript","Charts","REST","FinTech"] },
];

const nav = [["Overview",LayoutDashboard],["Job matches",Compass],["Applications",BriefcaseBusiness],["Profile",CircleUserRound]] as const;

export default function Home() {
  const [active,setActive] = useState("Job matches");
  const [selected,setSelected] = useState<Job|null>(jobs[0]);
  const [query,setQuery] = useState("");
  const [focus,setFocus] = useState("All roles");
  const [saved,setSaved] = useState<number[]>([2]);
  const [statuses,setStatuses] = useState<Record<number,string>>({});
  const [mobileNav,setMobileNav] = useState(false);

  useEffect(()=>{ const stored=window.localStorage.getItem("matchpath-statuses"); if(stored) setStatuses(JSON.parse(stored)); },[]);
  const filtered=useMemo(()=>jobs.filter(job=>`${job.title} ${job.company} ${job.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase())&&(focus==="All roles"||job.focus===focus)),[query,focus]);
  function updateStatus(id:number,status:string){ const next={...statuses,[id]:status}; setStatuses(next); window.localStorage.setItem("matchpath-statuses",JSON.stringify(next)); }

  return <main className="app-shell">
    <aside className={`sidebar ${mobileNav?"open":""}`}>
      <div className="brand"><span className="brand-mark">M</span><span>MatchPath</span></div>
      <button className="close-nav" onClick={()=>setMobileNav(false)} aria-label="Close menu"><X size={20}/></button>
      <nav><p className="nav-label">Workspace</p>{nav.map(([label,Icon])=><button key={label} className={active===label?"nav-item active":"nav-item"} onClick={()=>{setActive(label);setMobileNav(false)}}><Icon size={18}/>{label}{label==="Job matches"&&<span className="count">12</span>}</button>)}
        <p className="nav-label second">Manage</p><button className="nav-item"><Bell size={18}/>Daily digest</button><button className="nav-item"><Settings2 size={18}/>Preferences</button>
      </nav>
      <div className="sidebar-foot"><div className="profile-mini"><span>BC</span><div><strong>Beatrix</strong><small>Private workspace</small></div><MoreHorizontal size={18}/></div><div className="demo-note"><Sparkles size={16}/><p><strong>Portfolio demo</strong><br/>All jobs and companies shown are fictional.</p></div></div>
    </aside>
    <section className="main-panel">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open menu"><span/><span/><span/></button><div className="mobile-brand">MatchPath</div><div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button><button className="avatar">BC</button></div></header>
      {active==="Job matches"?<div className="content">
        <section className="page-heading"><div><p className="eyebrow">YOUR OPPORTUNITIES</p><h1>Job matches</h1><p>Remote roles ranked against your experience, goals and working preferences.</p></div><button className="primary-button"><Sparkles size={17}/>Find new matches</button></section>
        <section className="summary-strip"><div><span className="summary-icon lavender"><Target size={20}/></span><p><strong>12</strong><small>New matches</small></p></div><div><span className="summary-icon green"><Sparkles size={20}/></span><p><strong>4</strong><small>Strong AI fits</small></p></div><div><span className="summary-icon amber"><Clock3 size={20}/></span><p><strong>Today</strong><small>Last search</small></p></div><p className="digest"><Check size={15}/> Daily search active · 08:00 Europe/Athens</p></section>
        <section className="toolbar"><label className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search roles, companies or skills"/></label><div className="filter-wrap"><Filter size={17}/><select value={focus} onChange={e=>setFocus(e.target.value)}><option>All roles</option><option>AI</option><option>Frontend</option><option>UI</option></select><ChevronDown size={15}/></div><button className="filter-button">Remote only <X size={14}/></button></section>
        <section className="results-layout"><div className="job-list"><div className="list-heading"><span>{filtered.length} demo matches</span><button>Best match <ChevronDown size={14}/></button></div>{filtered.map(job=><article key={job.id} className={`job-card ${selected?.id===job.id?"selected":""}`} onClick={()=>setSelected(job)}><div className="company-logo" style={{background:job.color}}>{job.logo}</div><div className="job-main"><div className="job-title-row"><div><h2>{job.title}</h2><p>{job.company}</p></div><button className={`heart ${saved.includes(job.id)?"saved":""}`} onClick={e=>{e.stopPropagation();setSaved(saved.includes(job.id)?saved.filter(id=>id!==job.id):[...saved,job.id])}} aria-label="Save job"><Heart size={18}/></button></div><div className="job-meta"><span><MapPin size={14}/>{job.location}</span><span>{job.contract}</span><span>{job.salary}</span></div><div className="job-bottom"><div><span className={`score score-${job.score>=90?"high":job.score>=80?"medium":"low"}`}>{job.score}% match</span><span className="tag">{job.focus}</span>{statuses[job.id]&&<span className="tag status-tag">{statuses[job.id]}</span>}</div><small>{job.posted}</small></div></div></article>)}{!filtered.length&&<div className="empty"><Search size={24}/><strong>No matching demo roles</strong><p>Try a different keyword or role filter.</p></div>}</div>
          {selected&&<aside className="job-detail"><div className="detail-top"><div className="company-logo large" style={{background:selected.color}}>{selected.logo}</div><button className="detail-close" onClick={()=>setSelected(null)}><X size={18}/></button></div><p className="detail-company">{selected.company}</p><h2>{selected.title}</h2><div className="detail-meta"><span><MapPin size={14}/>{selected.location}</span><span><Clock3 size={14}/>{selected.schedule}</span></div><div className="match-hero"><div className="score-ring" style={{"--score":`${selected.score*3.6}deg`} as React.CSSProperties}><span>{selected.score}<small>%</small></span></div><div><strong>Strong match</strong><p>Based on 6 profile factors</p></div></div><p className="summary-text">{selected.summary}</p><section className="reason-section"><h3>Why it fits</h3>{selected.matches.map(item=><p className="reason good" key={item}><Check size={15}/>{item}</p>)}</section><section className="reason-section"><h3>Things to consider</h3>{selected.gaps.map(item=><p className="reason warn" key={item}><span>!</span>{item}</p>)}</section><div className="skill-row">{selected.skills.map(skill=><span key={skill}>{skill}</span>)}</div><div className="detail-actions"><button className="primary-button" onClick={()=>updateStatus(selected.id,"Preparing")}>Prepare application <ArrowUpRight size={16}/></button><button className="secondary-button" onClick={()=>updateStatus(selected.id,"Maybe")}>Maybe</button></div></aside>}
        </section>
      </div>:<PlaceholderPage active={active} statuses={statuses}/>} 
    </section>
  </main>;
}

function PlaceholderPage({active,statuses}:{active:string;statuses:Record<number,string>}){
  const descriptions:Record<string,string>={Overview:"A focused snapshot of your search progress and strongest opportunities.",Applications:"Track every role from first look to application, interview and offer.",Profile:"The preferences and experience MatchPath uses to explain every score."};
  return <div className="content placeholder-page"><section className="page-heading"><div><p className="eyebrow">MATCHPATH</p><h1>{active}</h1><p>{descriptions[active]}</p></div></section>
    {active==="Profile"?<div className="profile-grid"><article><span>Target roles</span><h3>AI-driven frontend development</h3><p>Frontend Developer · Junior Web Developer · UI Developer · AI Application Developer</p></article><article><span>Work preference</span><h3>Fully remote</h3><p>European hours preferred, with partial US or Asia overlap.</p></article><article><span>Current strengths</span><h3>React product development</h3><p>JavaScript, responsive UI, REST APIs, Supabase, Git and AI-assisted workflows.</p></article><article><span>Compensation</span><h3>€26,000 target</h3><p>€20,000 soft minimum · €30/hour freelance target.</p></article></div>
    :active==="Applications"?<div className="kanban">{["Saved","Preparing","Applied","Interview"].map(column=><div className="kanban-col" key={column}><h3>{column}<span>{Object.values(statuses).filter(s=>s===column).length}</span></h3>{jobs.filter(job=>statuses[job.id]===column||(column==="Saved"&&job.id===2&&!statuses[job.id])).map(job=><article key={job.id}><strong>{job.title}</strong><p>{job.company}</p><span>{job.score}% match</span></article>)}</div>)}</div>
    :<div className="overview-grid"><article className="overview-main"><p>Search readiness</p><h2>Profile ready</h2><div className="readiness"><span style={{width:"88%"}}/></div><small>Complete one more AI project to strengthen specialised matches.</small></article><article><p>Best match today</p><h3>Junior AI Product Developer</h3><span className="score score-high">94% match</span></article><article><p>Search focus</p><h3>AI products + frontend</h3><small>Health · Language tech · Travel · Education</small></article></div>}
  </div>;
}
