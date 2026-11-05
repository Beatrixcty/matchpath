# MatchPath

MatchPath is a personal job-search workspace that finds live remote roles, filters them against a candidate's preferences, and turns long job posts into quick, practical summaries.

## Features

- Live job search from public job sources
- Location, work arrangement, seniority, industry, and contract filters
- Match scoring against a candidate profile
- Gemini-generated summaries covering the company, role purpose, daily work, and requirements
- Saved jobs and application tracking
- CV profile extraction
- Browser-local storage for private personal data

## Local setup

1. Install Node.js 22 or later.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and add a Gemini API key.
4. Start the app with `npm run dev`.

The site opens at [http://localhost:3000](http://localhost:3000).

## Environment variables

```env
GEMINI_API_KEY=your_gemini_api_key
```

Do not commit `.env.local`. Add `GEMINI_API_KEY` in the Vercel project's environment settings for hosted summaries.

## Privacy

Preferences, profile information, saved jobs, and application statuses are stored in the visitor's browser. They are not committed to GitHub or stored in a hosted database. Clearing browser storage removes that data.

## Tech stack

Next.js, React, TypeScript, Tailwind CSS, browser local storage, and the Gemini API.
