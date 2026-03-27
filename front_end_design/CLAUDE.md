# CLAUDE.md — Smart Barcode Data Engine · Frontend Design Rules

> **System:** Smart Barcode Data Engine  
> **Purpose:** Instructs Claude Cowork to create and maintain a locally hosted project tracking dashboard website.  
> **Stack:** Single `index.html` · Tailwind CSS CDN · Chart.js · Vanilla JS  
> **Served on:** `http://localhost:3000` via `node serve.mjs`

---

## ALWAYS DO FIRST

1. **Read this file at the start of every session.**
2. **Invoke the `frontend-design` skill** before writing any frontend code.
3. **Start the local server** (`node serve.mjs`) before taking any screenshots.
4. **Screenshot → compare → fix** — minimum 2 rounds before declaring done.

---

## 1. Project Identity

The Smart Barcode Data Engine is an **operational intelligence platform** for construction and infrastructure projects. It captures granular execution data via barcodes, UI triggers, and list selections. Every record is linked to a **Task Basket** — a container holding all materials, equipment, documents, labour, and costs tied to a task.

The frontend is the **command surface** for managers and field users. It must feel like mission-critical software: precise, dense with useful data, and immediately readable under pressure.

---

## 2. Aesthetic Direction

**Theme:** Industrial-Precision Dark  
**Concept:** Think a war-room operations dashboard — deep charcoal surfaces, amber/gold accent on critical data, clean data-forward typography. Authoritative, not decorative.

### Color System (CSS Variables)
```css
--bg-base:       #0f1117   /* Deepest background */
--bg-surface:    #181c27   /* Card/panel surface */
--bg-elevated:   #1f2436   /* Elevated UI (modals, tooltips) */
--bg-border:     #2a2f45   /* Dividers and borders */

--accent-amber:  #f59e0b   /* Primary CTA, active nav, KPI highlight */
--accent-amber-dim: #92620a /* Dimmer amber for hover states */
--accent-teal:   #14b8a6   /* Secondary accent, charts, tags */
--accent-red:    #ef4444   /* Error, over-budget, critical */
--accent-green:  #22c55e   /* Success, on-track, complete */
--accent-yellow: #eab308   /* Warning, at-risk */
--accent-purple: #8b5cf6   /* Meetings, calendar events */

--text-primary:  #f1f5f9   /* Headings, KPI values */
--text-secondary:#94a3b8   /* Labels, captions */
--text-muted:    #475569   /* Disabled, placeholders */
```

### Typography
```
Display/Headings: 'DM Mono' (monospace — data-forward, technical authority)
Body/Labels:      'Inter' (clean, legible at small sizes)
KPI Numbers:      'DM Mono', tabular nums, letter-spacing: -0.04em
```

Load via:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

### Shadow System
```css
--shadow-card:    0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
--shadow-float:   0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(245,158,11,0.08);
```

---

## 3. Page Inventory (Implement These Screens)

### 3.1 Main Dashboard (`/` or `#dashboard`)
The home screen. Three-column layout on desktop.

**Left Column (40%):**
- 4 KPI Cards: Schedule Performance Index (SPI), Cost Performance Index (CPI), Quality Score, Safety Score
- Each card: large value, target comparison, trend arrow, status color badge (Green/Yellow/Red)
- Status colors: `--accent-green` (On-Track), `--accent-yellow` (At-Risk), `--accent-red` (Off-Track)

**Middle Column (35%):**
- Task Status Donut chart (Complete / In Progress / Pending / Blocked)
- Budget Burn Line chart (Planned vs Actual, Week 1–10, ZAR)
- Recent Transactions table (last 5 rows: ID, Description, Cost, Status)

**Right Column (25%):**
- Upcoming Milestones list (date + name + status badge)
- Safety Incidents counter (large number, red if >0)
- Last updated timestamp + [Refresh] button

**Data:** Use realistic placeholder data matching the system (ZAR currency, South African project context, road construction domain). Format: `R1,234.56`

### 3.2 Project View (`#project`)
Detailed view for a single project.

**Header:** Project name + status badge + progress bar + date range
**Tabs:** Overview | Tasks | Budget | Documents

**Overview tab:**
- Project metadata (scope, team lead, location)
- Gantt-style progress bars (Earthworks, Foundation, Structural)
- Critical path indicator (red highlight if slack ≤ 0)

**Tasks tab:**
- Filterable table: ID | Task | Assigned | Status | Due Date | Priority | Progress bar
- Status badges: `In Progress` (teal), `Complete` (green), `Pending` (yellow), `Blocked` (red)
- Row hover: subtle amber left-border highlight

**Budget tab:**
- Budget summary cards (Total / Spent / Forecast / Variance)
- Bar chart: Budget vs Actual by Cost Code
- Variance indicators: ✓ (under) vs ✗ (over)

**Documents tab:**
- File table: Doc ID | Name | Type | Size | Revised | Version
- Action buttons: [Download] [Preview] [Version History]

### 3.3 Asset Register (`#assets`)
- Searchable/filterable table of all assets
- Columns: Barcode | ID | Name | Type | Status | Location | Last Used
- [Scan Barcode] button (amber CTA) top-right
- Asset detail modal on row click

### 3.4 Cost Tracker (`#costs`)
- Approval queue section (Pending items highlighted amber)
- All costs table: CTR ID | Description | Cost Code | Amount | Status | Date
- Totals footer row
- [Add Cost] button

### 3.5 Barcode Scanner (`#scanner`)
- Large simulated camera frame (dashed amber border)
- Manual entry fallback: [Enter barcode manually] field
- Recent scans log (last 10 scans, scrollable)
- Scan result card: shows item name, ID, status, available actions

### 3.6 Reports (`#reports`)
- Downloadable report cards: KPI Report, Budget Report, Task Summary, Safety Report
- [Generate PDF] [Generate Excel] actions per report
- Date range selector

### 3.7 Settings (`#settings`)
- User profile section
- Project selector
- Theme toggle (Dark/Light)
- Language selector (English default)
- Notification preferences

### 3.8 Calendar (`#calendar`)
A multi-view project calendar showing tasks, milestones, site inspections, and scheduled events tied to the active project.

#### View Toggle (top-right of header bar)
Three tab-style buttons — **Month | Week | Day** — switch the active view. Active tab: amber filled. Inactive: ghost border.

---

#### Month View
- Standard 7-column calendar grid (Mon–Sun header row)
- Each day cell: date number (top-left), event pills stacked vertically inside the cell
- Event pill format: colored left-border dot + short label, truncated with ellipsis if overflow
- `+ N more` overflow link in amber if more than 3 events in a cell — clicking expands a day detail popover
- Today's cell: amber border highlight + subtle amber background tint
- Navigation: `[< Prev Month]` `[Today]` `[Next Month >]` buttons in header
- Month/Year label in DM Mono, large, left of nav buttons

**Event color coding (pill dot + left bar):**
- Task deadline: `--accent-amber`
- Milestone: `--accent-teal`
- Inspection / QA: `--accent-yellow`
- Safety event: `--accent-red`
- Delivery / logistics: `--accent-green`
- Meeting: `#8b5cf6` (purple — add to CSS vars as `--accent-purple: #8b5cf6`)

---

#### Week View
- 7 vertical columns (Mon–Sun), each column is a full day lane
- Time axis on the left: 06:00 → 20:00, hour gridlines, 30-min minor gridlines (dashed)
- Day column header: day name + date number; today highlighted amber
- Events render as **vertically positioned blocks** inside their day column, height proportional to duration
- Event block content: event title (bold), time range, assigned person/team (small text below)
- Overlapping events side-by-side within the same column (split column width equally)
- Scroll the time grid vertically; header row and time axis are sticky
- Current time indicator: horizontal amber dashed line across all columns at live time
- Navigation: same `[< Prev Week]` `[Today]` `[Next Week >]` controls

---

#### Day View
- Single day, full detail
- Left side: vertical timeline (06:00–22:00) with 30-min slots
- Right side: event blocks spanning their time range
- Event block: full width, shows title + description snippet + assigned + status badge + duration
- Click on event block → opens event detail modal/drawer (right-side slide-in panel)
- Empty time slots: faint dashed border, hoverable with `[+ Add Event]` ghost button
- Navigation: `[< Yesterday]` `[Today]` `[Tomorrow >]`

---

#### Event Detail Drawer (shared across all views)
Slides in from the right (320px wide) on event click. Contains:
- Event type badge + status badge
- Title (DM Mono, large)
- Date/time range
- Location / WBS code
- Linked Task Basket ID (clickable, navigates to Tasks)
- Assigned team members (avatar-style initials circles)
- Description / notes field
- Action buttons: `[Edit]` `[Mark Complete]` `[Link to Task]` `[Close]`

---

#### Calendar Placeholder Data
Use realistic construction project events for the active month:
- Weekly site inspections (every Monday 08:00–09:00)
- Concrete pour milestones (specific dates, teal)
- Safety toolbox talks (every Friday 07:00–07:30, red)
- Material deliveries (scattered dates, green)
- Monthly progress meeting (last Wednesday, purple)
- Task deadlines spread across the month (amber)

---

### 3.9 Gantt Chart (`#gantt`)
A fully interactive Gantt chart for timeline planning and comparison. Rendered as a **custom HTML/CSS/JS table** (not Chart.js — Chart.js Gantt is inadequate). The chart must support real horizontal scrolling.

---

#### Layout: Two-Panel Structure
```
┌──────────────────────┬──────────────────────────────────────────┐
│  LEFT PANEL (300px)  │  RIGHT PANEL (scrollable timeline)       │
│  Task/WBS list       │  Gantt bars + date axis                  │
│  fixed, sticky       │  horizontal scroll                       │
└──────────────────────┴──────────────────────────────────────────┘
```
- Left panel: fixed width 300px, scrolls **vertically** in sync with right panel
- Right panel: horizontally scrollable, date columns rendered per selected period zoom
- Both panels scroll vertically together (synced `scrollTop`)

---

#### Period Zoom Slider + Tab Controls (top toolbar)

**Zoom Level Tabs** (left of toolbar): select the time column granularity
- `Day` | `Week` | `Month` | `Quarter` — tab buttons, amber active state
- Day zoom: each column = 1 day
- Week zoom: each column = 1 week (Mon label)
- Month zoom: each column = 1 month
- Quarter zoom: each column = 1 quarter (Q1/Q2 etc.)

**Period Range Slider** (center of toolbar):
- A dual-handle range slider: `[Start ●────────● End]`
- Controls the visible date window (e.g., dragging narrows or widens the visible timeline)
- Display: `DD/MM/YYYY → DD/MM/YYYY` showing current window on either side of the slider
- Slider track: amber filled between handles; outside handles: muted
- On slide: Gantt re-renders to show only bars within the selected range

**Quick Range Presets** (right of toolbar — small pill buttons):
`[This Month]` `[This Quarter]` `[This Year]` `[Project Lifetime]`

---

#### Date Axis (bottom of right panel — sticky)
- Date labels rendered **at the bottom** of the scrollable right panel (sticky `position: sticky; bottom: 0`)
- Two-tier: top tier = month/quarter label, bottom tier = day/week column labels
- Today indicator: vertical amber dashed line through the entire chart height
- Weekends shaded slightly darker in Day/Week zoom modes

---

#### Left Panel — Task/WBS Table
Columns: `WBS` | `Task Name` | `Duration` | `Start` | `End` | `% Done`
- Collapsible WBS groups (click row header to expand/collapse children)
- Row indent for child tasks (16px per level)
- `% Done` shown as a small inline progress bar (amber fill)
- Row hover: amber left-border flash + `--bg-elevated` background
- Selected row: persistent amber left border

---

#### Gantt Bars (right panel)
- Each task row renders a horizontal bar spanning its start→end columns
- Bar fill color based on task status:
  - Complete: `--accent-green`
  - In Progress: `--accent-amber`
  - Pending: `--accent-teal` (muted)
  - Blocked: `--accent-red`
  - Critical Path: `--accent-red` with pulsing border animation
- Bar height: 20px, vertically centered in the 36px row height
- Completed portion: darker inner fill showing `% done` progress within the bar
- Milestone diamonds: ◆ at the milestone date column, teal, slightly larger than bar height
- Dependency arrows: thin SVG lines connecting bar end → next bar start (right-angle elbow style, `--bg-border` color)
- Hover tooltip: task name + dates + assigned + status (floats above bar)

---

#### Layer / Overlay Selection Panel (top-right of toolbar — `[⊕ Layers]` button)
Clicking `[⊕ Layers]` opens a dropdown panel with checkboxes to toggle which data layers appear on the Gantt:

**Event & Activity Layers** (each toggleable independently):
- ☑ Task Bars (always on by default)
- ☑ Milestones
- ☐ Budget Spend Events (diamond markers on dates when cost entries were posted)
- ☐ Site Inspections (small flag icon on date)
- ☐ Material Deliveries (truck icon on date)
- ☐ Safety Events (shield icon, red)
- ☐ Weather Delays (cloud icon, grey — affects bar display)
- ☐ Resource Allocation (colour-coded band above each bar showing team assigned)
- ☐ Baseline Plan (ghost bars — original planned dates shown behind actual bars, `--text-muted` at 30% opacity)
- ☐ Critical Path Highlight (red border on all critical-path tasks)

**Compare / Overlap Mode** (toggle switch in the layers panel):
- `[Compare Mode: OFF/ON]` amber toggle
- When ON: a second Gantt dataset (e.g., baseline vs. actual, or Project A vs. Project B) renders as **ghost bars** behind the primary bars
- A compare source selector appears: `[Compare against: Baseline ▼]` dropdown (options: Baseline, Previous Period, Another Project)
- Overlap bars use 40% opacity fill with dashed border, in `--accent-teal`

---

#### Row Group Tabs (below toolbar — secondary nav)
Filter which WBS groups/task categories are shown in the Gantt rows:

`[All Tasks]` `[Earthworks]` `[Foundation]` `[Structural]` `[Mechanical]` `[Electrical]` `[Finishes]` `[Milestones Only]`

- Active tab: amber filled pill
- Filtering animates the row list (rows not in category slide out)

---

#### Gantt Placeholder Data
Use a realistic road construction project schedule:

**WBS 1.0 — Site Preparation** (4 tasks, 3 weeks)
- 1.1 Site clearance, 1.2 Surveying & setting out, 1.3 Temporary works, 1.4 Stormwater diversion

**WBS 2.0 — Earthworks** (5 tasks, 6 weeks)
- 2.1 Bulk excavation, 2.2 Cut to fill, 2.3 Sub-grade preparation, 2.4 Layer works, 2.5 Compaction testing

**WBS 3.0 — Pavement** (4 tasks, 5 weeks)
- 3.1 G7 sub-base, 3.2 G4 base course, 3.3 Prime coat, 3.4 Asphalt surfacing

**WBS 4.0 — Structures** (3 tasks, 8 weeks)
- 4.1 Culvert construction, 4.2 Retaining walls, 4.3 Bridge abutments

**WBS 5.0 — Finishing** (3 tasks, 4 weeks)
- 5.1 Road markings, 5.2 Guardrails & signage, 5.3 Landscaping & reinstatement

**Milestones:** Site Handover ◆, Earthworks Complete ◆, Practical Completion ◆

Spread the schedule across a 6-month window. Mark 3 tasks on critical path. Show 60% overall completion.

---

## 4. Navigation — Left Sidebar

The left sidebar is the **primary navigation**. It is always visible on desktop, collapsible on mobile.

### Sidebar Structure
```
┌─────────────────────┐
│ [≡] SBDE            │  ← Logo/system name, hamburger toggle
├─────────────────────┤
│ [Project: P-001 ▼]  │  ← Active project selector dropdown
├─────────────────────┤
│ 🏠  Dashboard        │  ← Active state: amber left border + bg
│ 📊  Projects         │
│ ✅  Tasks            │
│ 💰  Costs            │
│ 📦  Assets           │
│ 📄  Documents        │
│ 📷  Scanner          │
│ 📈  Reports          │
│ 📅  Calendar         │  ← NEW: month/week/day calendar view
│ 📋  Gantt Chart      │  ← NEW: interactive Gantt with layers & compare
├─────────────────────┤
│ ⚙️  Settings         │
│ 👤  Profile          │
│ 🚪  Logout           │
└─────────────────────┘
```

### Sidebar Design Rules
- Width: 240px (expanded), 64px (collapsed — icons only)
- Background: `--bg-surface`
- Active item: amber left border (3px solid `--accent-amber`) + `--bg-elevated` background
- Hover: `--bg-elevated` background + 0.2s ease transition
- Notification badge: small amber dot for unread counts
- Project selector: dropdown with project list, shows active project name

---

## 5. Component Library

### KPI Card
```html
<!-- Structure -->
<div class="kpi-card">
  <div class="kpi-label">Schedule Performance</div>
  <div class="kpi-value">1.05</div>
  <div class="kpi-meta">
    <span class="kpi-target">Target: 1.00</span>
    <span class="kpi-trend up">▲ +0.03</span>
  </div>
  <div class="kpi-status on-track">On Track</div>
</div>
```
- Value: large DM Mono, `--text-primary`
- Status colors strictly: green/yellow/red only
- Trend arrow: green (▲ up), red (▼ down), based on KPI direction

### Status Badge
- `on-track`: green background 10% opacity + green text
- `at-risk`: yellow background 10% opacity + yellow text
- `off-track`: red background 10% opacity + red text
- `pending`: teal background 10% opacity + teal text

### Data Table
- Header: `--bg-elevated`, `--text-secondary`, uppercase, 11px, letter-spacing 0.08em
- Rows: alternating `--bg-base` / `--bg-surface` on hover
- Borders: `1px solid --bg-border`
- Actions column: icon buttons, amber on hover

### Chart Defaults (Chart.js)
```js
Chart.defaults.color = '#94a3b8';           // text-secondary
Chart.defaults.borderColor = '#2a2f45';     // bg-border
// Primary dataset: '#f59e0b' (amber)
// Secondary dataset: '#14b8a6' (teal)
// Background fills: 20% opacity of stroke color
```

---

## 6. Screenshot & Comparison Rules

- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- After each build, screenshot and review:
  - KPI cards: values visible, correct status colors?
  - Charts: rendering? axes labeled? legend visible?
  - Sidebar: correct active item highlighted? Calendar and Gantt items present?
  - Tables: all columns visible, no overflow?
  - Responsiveness: test at 1440px and 768px
  - **Calendar:** Does Month view show a 7-column grid with event pills? Does Week view show vertical time columns? Does Day view show time-positioned blocks?
  - **Gantt:** Does the left panel show WBS rows? Does the right panel show bars at correct horizontal positions? Is the date axis at the bottom? Does the period slider change the visible range? Do layer toggles show/hide elements?
- Do at least **2 comparison rounds** before submitting

---

## 7. Output Defaults

- Single `index.html` file, all styles inline (`<style>` block)
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Chart.js via CDN: `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT/1f2436/f59e0b`
- Currency: ZAR format `R1,234.56`
- Dates: DD/MM/YYYY display
- All data: realistic construction project placeholder values

---

## 8. Anti-Generic Guardrails

- **NEVER** use default Tailwind blue/indigo as primary color. Use the amber system above.
- **NEVER** use flat `shadow-md`. Use layered shadows from the system.
- **NEVER** use the same font for headings and body (DM Mono + Inter).
- **NEVER** use `transition-all`. Use specific `transition-colors`, `transition-transform`.
- **EVERY** clickable element must have hover, focus-visible, and active states.
- **EVERY** status must show icon + color (never color alone).
- Add grain/texture to backgrounds: `url("data:image/svg+xml,...")` SVG noise filter.
- Charts must have proper labels, legends, and axis formatting — never bare numbers.

---

## 9. Hard Rules

- Do not add UI sections not listed in the Page Inventory above (sections 3.1–3.9)
- Do not use white or light backgrounds as default — dark theme is the base
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use generic sans-serif only — pair DM Mono for data display
- Do not use placeholder KPI values that don't match construction project context (e.g., no "Revenue" or "Monthly Active Users")

### Calendar-Specific Rules
- **NEVER** use a third-party calendar library (FullCalendar, etc.) — build in vanilla JS
- Month/Week/Day views must all be implemented and switchable without page reload
- Event color coding must follow the defined system (amber/teal/red/green/purple — never arbitrary colors)
- The Day view detail drawer must slide in from the right — never use a centered modal for event details
- Week view time blocks must be **vertically positioned by time** — not just a list
- All three views must share the same in-memory event data array

### Gantt-Specific Rules
- **NEVER** use Chart.js for the Gantt — build as a custom HTML table with CSS bar positioning
- The left task panel and right timeline panel must scroll **vertically in sync** at all times
- The date axis **must render at the bottom** of the chart (sticky bottom)
- Period slider must actually re-render the visible column range — not just CSS zoom
- Layer checkboxes must individually toggle each data layer with no full page reload
- Baseline/compare ghost bars must render **behind** (lower z-index than) primary bars
- Critical path tasks must have a red pulsing border animation (`@keyframes pulse-border`)
- Dependency arrows between tasks must be rendered as SVG lines, not just implied
- The Gantt must support at minimum **Day, Week, Month, Quarter** zoom levels
- WBS groups must be collapsible — clicking a group row hides/shows all child rows
- Do not hard-code pixel widths for date columns — compute them from the zoom level and visible range

---

## 10. Cross-References

- **System architecture:** `claude/system_overview.claude.md`
- **API endpoints:** `claude/api_endpoints.claude.md`
- **Engine logic:** `claude/engine_selection.claude.md`

---

*End of CLAUDE.md — Smart Barcode Data Engine Frontend Rules*
