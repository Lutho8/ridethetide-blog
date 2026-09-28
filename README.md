# Own the Room Lab

A mobile-first, local-first public-speaking practice dashboard built for deliberate practice alongside Bill Hoogterp's **Powerful Communication Owns the Room** course.

## What it does

- Day 0 baseline recording workflow
- 30-second, two-minute, elevator-pitch, story and Q&A drills
- Browser audio/video recording when supported
- Transcript fallback plus local text metrics
- WPM, filler rate, sentence length, hedging, evidence-language and qualification-language analysis
- Credibility-signal warnings for unsupported absolutes
- Self-assessment for clarity, composure, pauses, vocal variation, gestures, opening, close and audience connection
- 31-lesson course roadmap with immediate application drills
- Peptide/wellness speaking-prompt library focused on evidence quality and responsible communication
- Progress trends, baseline-vs-latest comparisons, local CSV export
- Local browser persistence; no paid API required for the MVP

## Privacy

The current MVP stores practice data locally in the browser. Recordings are not uploaded by default.

## Medical-content boundary

The topic library is for **public-speaking practice and education**, not medical advice or prescribing. It does not provide peptide dosing protocols. Scientific or clinical claims should be verified before being presented publicly.

## Build

```bash
npm run build
```

The build writes the self-contained dashboard to `dist/index.html`.

## Deployment

The repository contains a `vercel.json` configured for a static Vercel deployment with `dist` as the output directory.

A backup of the previous Ride the Tide repository state was created at:

`backup-before-own-the-room-2026-09-28`

## Separation from Peptide South Africa

This repository is separate from `Lutho8/peptide-south-africa-coza`. The Peptide South Africa tracker repository is not modified by Own the Room Lab changes.
