# NovaCRM — AI-powered CRM

A modern, responsive CRM built with the Next.js App Router, TypeScript and Tailwind CSS. It covers the parts of a sales tool that actually get used every day: an executive dashboard, lead management with full CRUD, a drag-and-drop deal pipeline, and an AI assistant that scores leads and drafts client emails.

Everything runs client-side against `localStorage`, so the app deploys to Vercel as a static front end with no database to provision and no sign-up before you can look around.

```bash
npm install
npm run dev      # http://localhost:3000
```

## Features

**Executive dashboard**
- Metric cards for total leads, active deals, conversion rate and monthly revenue, each with a period-over-period delta and a twelve-point trend line.
- A revenue growth chart and a pipeline funnel, both drawn as hand-rolled SVG/CSS — no charting dependency.
- An AI priority list, a live activity feed, and the follow-up tasks that are due or overdue.

**Leads**
- Full CRUD: create, edit and delete through a validated modal form.
- Search across name, company, email, phone and notes; filter by status and owner; sort by any column, including the AI score.
- A detail drawer with the scoring breakdown, the full record, and an assistant scoped to that one deal.

**Pipeline**
- A seven-column Kanban board — New, Contacted, Qualified, Proposal, Negotiation, Won, Lost.
- Native HTML5 drag-and-drop, plus per-card arrow buttons so the board is equally usable on touch and by keyboard.

**AI sales assistant**
- A transparent lead scoring engine: every point of the 0–100 score is attributed to a named signal (deal value, pipeline stage, contact recency, engagement, company fit, source, stall penalty), with a suggested next best action.
- A chat assistant available as a floating widget on every page and as a full page at `/assistant`, grounded in a live snapshot of your pipeline.

## The AI, and what runs where

The scoring engine is deterministic and local — it is a transparent rule engine, not a model call, which is why it can show its work.

The chat assistant has two backends:

| | When | Behaviour |
|---|---|---|
| **Claude** | `ANTHROPIC_API_KEY` is set | `POST /api/assistant` streams a response from `claude-opus-5`, grounded in the pipeline snapshot. |
| **On-device** | No key configured | A built-in rule engine answers from the same snapshot. |

The fallback is the point: the AI features work on a fresh clone and a fresh Vercel deploy with no configuration. Every reply is labelled in the UI with the engine that produced it, so the demo is never misleading about what answered. If a Claude request fails mid-flight, the route falls back rather than leaving a dead chat bubble.

To enable Claude:

```bash
cp .env.example .env.local
# then set ANTHROPIC_API_KEY=sk-ant-...
```

On Vercel, add the same variable under **Project → Settings → Environment Variables**.

## Deploying

Push to GitHub and import the repository at [vercel.com/new](https://vercel.com/new). The defaults are correct — no build configuration needed. `ANTHROPIC_API_KEY` is optional.

## Design notes

A few decisions worth calling out, since they are the ones a reviewer tends to ask about.

**One stage field, not two.** The brief describes lead *statuses* (New, Contacted, Qualified, Won, Lost) and pipeline *stages* (Lead → Proposal → Negotiation → Closed). Modelling those as separate fields lets a card dragged on the board disagree with the row edited in the table. Instead there is a single `stage` field spanning both — the five statuses plus Proposal and Negotiation — which the leads table renders as "Status" and the board renders as a column. One source of truth, no reconciliation.

**Leads carry the furthest stage they reached.** A deal that got to Negotiation and then lost reads as "lost", so the current stage alone cannot produce a funnel. Each lead also stores `furthestStage`, which only ever moves forward. That is what makes the funnel chart show real drop-off instead of a flat block.

**The score is calibrated, not just computed.** Signals are signed deviations from a neutral 50 rather than bonuses on top of zero, and the positive extremes are deliberately unreachable together. A scale that rates four deals in five as "High" tells a rep nothing; `npm run verify` asserts that the High tier stays selective and that no score clips at 100.

**Charts follow a validated palette.** Ordered stages use a single-hue ordinal ramp rather than eight identity colours, since colouring ordered categories by identity throws away the ordering. The light and dark ramps were each checked against their own surface for lightness monotonicity, step separation and contrast — dark mode is a selected set of steps, not an inverted light palette. Every chart has a table view, a hover and keyboard tooltip, and no value that is reachable *only* by hovering.

**State lives in an external store.** `localStorage` is an external system, so `src/lib/store.ts` owns it and React subscribes with `useSyncExternalStore`. Loading and persistence are not effects; the server renders a deterministic empty snapshot (hence the skeletons) and writes are persisted at the moment they happen.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config; `next lint` was removed in Next 16) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | 520+ assertions over the seed, analytics, scoring and the store |

`npm run verify` covers the two layers that fail silently. `verify-data` guards the numbers: funnels that widen instead of narrowing, `NaN%` deltas on a fresh install, holes in the revenue chart, scores pinned to the ceiling, division by zero on an empty pipeline. `verify-store` guards the CRUD path behind **Add Lead** and **Add Deal** — that a new record lands in state immediately, is written to `localStorage` in the same tick, survives a reload, and stays consistent through edits, stage moves and deletes.

## Project structure

```
src/
├── app/
│   ├── layout.tsx            # Shell, fonts, theme script, providers
│   ├── page.tsx              # Executive dashboard
│   ├── leads/                # Lead management
│   ├── pipeline/             # Kanban board
│   ├── assistant/            # Full-page AI assistant
│   └── api/assistant/        # Claude-backed streaming endpoint
├── components/
│   ├── layout/               # Sidebar, topbar, app shell, theme toggle
│   ├── ui/                   # Button, Card, Modal, Field, Badge, EmptyState
│   ├── dashboard/            # Stat tiles, charts, activity, tasks
│   ├── leads/                # Table, form modal, detail drawer
│   ├── pipeline/             # Kanban board and deal cards
│   └── ai/                   # Assistant panel, chat widget, score card
├── lib/
│   ├── types.ts              # Domain model
│   ├── store.ts              # External store + localStorage persistence
│   ├── scoring.ts            # Lead scoring engine
│   ├── analytics.ts          # Derived dashboard metrics
│   ├── assistant.ts          # Prompt, grounding context, offline engine
│   ├── seed.ts               # Deterministic demo data
│   ├── constants.ts          # Stage and tier metadata
│   └── utils.ts              # Formatting helpers
├── hooks/                    # useAssistant, useElementWidth
└── providers/                # CRM and theme context

scripts/
├── verify-data.ts            # Seed, analytics and scoring assertions
└── verify-store.ts           # CRUD + localStorage persistence assertions
```

## Notes on the demo data

The sample pipeline is generated on first visit rather than hard-coded, so the trailing-twelve-month charts are always relative to today — the dashboard never opens on a stale or empty state. The generator is seeded, so the same browser always produces the same book of business. **Reset demo data** in the top bar regenerates it.

Data is stored per browser under the `ai-crm:state:v1` key. Nothing is sent anywhere unless you configure a Claude key, in which case the assistant's messages and the pipeline snapshot go to the Anthropic API to answer the question.

## Accessibility

Dialogs trap focus, restore it on close and respond to Escape. Charts are keyboard-navigable and have table equivalents. Status is never carried by colour alone — every badge pairs a colour with an icon or a written label. `prefers-reduced-motion` is respected, and the theme is applied before first paint so there is no flash of the wrong colour scheme.

Every text and UI colour pair was measured against its own surface in both themes and meets WCAG AA (4.5:1 for text, 3:1 for marks). Two consequences are visible in the tokens: `--ink-muted` and `--accent` are a step darker in light mode than the raw palette suggests, and `--critical` has a separate `--critical-text` step, because the mark colour that passes 3:1 as a dot does not pass 4.5:1 as a sentence. The two deliberate exceptions are the `warning` and `serious` score-tier dots on the light surface, which sit below 3:1 by design and are mitigated by the icon-plus-label pairing they always ship with.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · lucide-react · `@anthropic-ai/sdk`
