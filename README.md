# PlasticFree Campus

**Smart Campus Plastic Usage Audit & Reduction Platform**
iGEN Green Day 2026 · Section C · Project 9

A premium, offline-first SaaS dashboard for tracking, analysing and reducing single-use plastic across a campus. Built with **zero dependencies** — just HTML, CSS and vanilla JavaScript — and persisted entirely in `localStorage`.

---

## Quick start

No build step, no install, no network.

```bash
# Option A — double-click index.html (works from file://)
start index.html

# Option B — serve with any static server
python -m http.server 8123
# → http://127.0.0.1:8123/index.html
```

Open the URL, and you land on a fully seeded demo campus (9 zones · 24 catalogue items · 60 audits spanning Jun–Nov 2026).

---

## Feature tour

### 1 · Dashboard — *Workspace*
- Four live KPI cards (items, weight, spend, CO₂e) with animated count-up and sparklines
- **Monthly trend chart** — switch between weight / items / spend
- **Zone leaderboard** — horizontal bars sorted by plastic weight
- **Category mix** — donut of the 8 plastic categories
- **Heatmap** — 6 months × 9 zones intensity grid
- Recent-audit feed with quick "New audit" action
- Reduction-goal progress ring against the 40 % target
- Eco-score gauge with contextual hint text

### 2 · Audit records — *Workspace*
- Full CRUD table with search, zone filter, status filter, sortable columns, pagination
- **3-step audit wizard** (modal):
  1. Pick a zone
  2. Add catalogue items (quantity × unit weight)
  3. Review totals → save
- Inline edit and delete with confirmation
- CSV export of the current filter

### 3 · Analytics — *Workspace*
- **Period comparison** — current vs previous window with deltas
- **Stacked composition** — category breakdown per month
- **Zone × month heatmap** with hover tooltips
- **Top offenders** — ranked zones and items
- Period selector (30 d / 90 d / 6 m / 12 m / all)

### 4 · Insights & recommendations — *Intelligence*
Rule-based engine producing **8 prioritised insights**:
- Single-use dominance alert
- Hotspot zone identification
- Volume-leader category callout
- "Big 3" disposable swap suggestions
- Reduction-target gap analysis
- Carry-bag ban ROI projection
- Audit-cadence on-track confirmation
- Trend direction success message

Each insight includes a severity tier, actionable CTA and addressable-impact estimate.

### 5 · Report studio — *Intelligence*
- Scoped builder: period, zone selection, section toggles
- **Live preview** of the generated report
- Sections: executive summary · monthly trend · zone ranking · category breakdown · top offenders · recommendations · sign-off block
- **Print / PDF** via browser print stylesheet
- **CSV export** of underlying data
- **JSON backup** for full data portability

### 6 · Settings — *System*
- Campus profile (name, program line, academic year)
- Reduction target configuration
- Theme toggle (dark eco-glass / light)
- Data management: export · import · reset to seed · wipe all
- Storage usage meter
- About / version info

---

## Architecture

```
PlasticFree_Campus/
├── index.html              ← app shell + 64-icon SVG sprite
├── css/
│   ├── tokens.css          ← design tokens (colours, spacing, radii, shadows)
│   ├── base.css            ← reset, typography, scrollbars, utilities
│   ├── layout.css          ← app shell grid, sidebar, topbar, view container
│   ├── components.css      ← cards, buttons, chips, tables, modals, toasts, forms
│   ├── views.css           ← per-view layouts + print stylesheet
├── js/
│   ├── data/seed.js        ← deterministic seed generator (PRNG, month normalisation)
│   ├── store.js            ← LocalStorage store · metrics · analytics · eco score
│   ├── ui.js               ← UI kit (format, toast, modal, confirm, count-up, CSV…)
│   ├── charts.js           ← SVG chart engine (area, bars, donut, ring, spark, hbars)
│   ├── app.js              ← hash router, theme, chrome refresh, boot
│   └── views/
│       ├── dashboard.js
│       ├── audits.js
│       ├── analytics.js
│       ├── insights.js
│       ├── reports.js
│       └── settings.js
└── README.md
```

**Load order** (classic `<script>` tags, no modules):
`seed → store → ui → charts → views/* → app`

Every module attaches to a single global `window.PFC` namespace.

---

## Data model

| Entity | Key fields |
|---|---|
| **Audit** | `id`, `code` (PFC-…), `date`, `zoneId`, `auditor`, `notes`, `entries[]` |
| **Entry** | `itemId`, `qty`, `unitKg`, `weightKg`, `cost` |
| **Zone** | `id`, `name`, `category`, `icon` |
| **Catalogue item** | `id`, `name`, `category`, `unitKg`, `unitCost`, `singleUse` |
| **Settings** | campus profile, reduction target, theme |

**Storage key:** `pfc_v1` (JSON blob in `localStorage`).

**Seed data:** deterministic PRNG so `resetToSeed()` always reproduces the identical dataset. Monthly totals follow a planned decline curve (Jun → Oct) to showcase a realistic reduction narrative: **baseline 55.4 kg/mo → recent 34.4 kg/mo = 38 % reduction**, eco-score **73/100**.

---

## Testing

Two Node-based harnesses (no npm packages required):

```bash
# Data & logic — 85 assertions
node path/to/pfc-harness.js

# Render smoke — 78 assertions
node path/to/pfc-render.js
```

| Harness | Covers |
|---|---|
| `pfc-harness.js` | module loading · view registration · seed & persistence · metrics · analytics · CRUD · backup/import · insights engine · formatters · icon audit · asset wiring |
| `pfc-render.js` | every view's full `render()` · empty-state paths · router · markup balance · placeholder-leak scan · report/dashboard/audits/insights content · chart engine (data + empty) |

---

## Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari). Uses CSS custom properties, `IntersectionObserver`-free CSS animations, SVG, and `localStorage`. No polyfills needed for 2024+ browsers.

---

## Credits

Built for **iGEN Green Day 2026**, Section C, Project 9.
All data is fictional demo data generated for showcase purposes.
