// api/tutor.js — Standards Tutor AI Engine
// Generates questions from construction standards and grades user answers.
// Uses Claude AI with a comprehensive South African construction knowledge base.

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const MODEL = process.env.MODEL || 'claude-sonnet-4-6';

// ── Standards Knowledge Library ───────────────────────────────────────────────
// Curated from Plant Book R&E, COLTO, SANS, SAPEM, industry practice
const STANDARDS_LIBRARY = {
  PLANT_OPS: `
PLANT OPERATIONS — RULES OF THUMB (South African Construction Industry)

VOLUMES — BCM / LCM / CCM:
- 1 BCM (Bank Cubic Metre) swells to 1.2–1.4 LCM and compacts to 0.9–1.1 CCM
- Tipper 7.2 BCM = 10 LCM = 7 CCM (Gravel: 72% of loose / 70% of loose)
- 740 ADT: 14 BCM = 19 LCM = 13.3–16.0 CCM (Gravel/Rock respectively)
- For Rock: 14 BCM = 19 LCM = 14.5–16.0 CCM (76–85% compaction)

CYCLE ELEMENTS (Standard ADT cycle):
- Load: 2 min (including truck exchange)
- Haul: varies with distance (see haul speeds below)
- Dump: 1 min
- Return: varies
- Total typical: 8 min → 7.5 cycles/hr → 105 BCM/hr per truck

HAULING RULES OF THUMB:
- Dozers: 0–50m haul range
- Load & Carry: 50–120m
- Scrapers: 120–900m
- ADTs: 120–3,000m
- Rigid trucks: 250–9,000m
- Semi-trailers: >9,000m

AVERAGE TRUCK SPEEDS (one-way):
- 0–250m: 10 km/h | 0–500m: 12 km/h | 0–750m: 15 km/h
- 0–1,000m: 17 km/h | 0–1,500m: 25 km/h | 0–2,000m: 30 km/h
- 0–3,000m: 35 km/h | >3,000m: 40 km/h

FLEET SIZING:
- 0.5 km haul → 3 trucks minimum
- 1.0 km haul → 4 trucks
- >1 km: 4 trucks + 1 extra per additional km

TRUCK EXCHANGE: Must be <45 seconds. Load 33%/67% front/rear axle split.
No overloading — causes haul road deterioration and spillage.

DOZERS:
- Doze in 1st gear, slide the load, use blade tilt correctly
- No excessive tramming (<5% of work time)
- Use slot dozing wherever possible; doze downhill where possible
- Dozing downhill: 2% production gain per 1% downhill slope (max 20%)
- Technique: Front-to-Back = most efficient; Back-to-Front = less; Back each pass = least
- Ripping: 1st gear (1.5–2.5 kph) at 2/3 throttle; rip in straight lines; rip downhill
- Do NOT turn with ripper in ground; use correct ripper angle (tip rearward, pull forward)

EXCAVATORS:
- Load with idlers in front (less damage + extra counterweight)
- Loading time: 2 min max including truck exchange
- Cycle: 13–20 seconds per bucket cycle; truck loaded in 4–5 cycles
- Load off a bench; optimal bench height = stick length or truck rail height
- Production reduced 10% if bench too high OR too low
- 15% lower productivity when truck on same level as excavator
- Minimize swing angle: 45–90 degrees optimal; keep floor clean; maintain key cut

WHEEL LOADERS:
- Minimum stockpile height = bucket hinge pin height at max lift
- Enter pile straight on, bucket parallel to floor; 1st gear, full throttle
- Limit travel to 1.5 tyre revolutions; tight V pattern
- Cycle time: 25–40 seconds; time in pile <12 seconds
- Fill bucket while lift arms are horizontal; lift bucket early to reduce wheel spin

GRADERS:
- Grade in 2nd or 3rd gear (6–11 kph)
- Always use Diff Lock when blading and ripping; remove for turns
- Blade pitch: forward = fine grading; neutral = normal/mixing; back = cutting/drains
- Rip in 1st gear; only rip soft/intermediate material; straight frame for ripping
- Do NOT drag ripper bar in material

COMPACTORS:
- If not meeting compaction in 6 passes, change machine parameters or machine
- Vibratory compactors: max 4 km/h
- Impact rollers: 8–12 km/h (NOT in rockfill)
- Grid rollers: 12 km/h for gravel breakdown
- Compaction failure causes: wrong grading, moisture content, over-compaction
- Smooth, padfoot, pneumatic, or grid — select based on material type

PUSH SCRAPERS:
- Best combo: Cat 621 + D8/D9R
- Load time: 30 sec max in 60-sec dozer cycle; Minimum 50 pushes/hour
- Cat 621 capacity: 12 LCM struck / 17 LCM heaped
- Load downhill, drive out unassisted, dump at speed, keep bowl low
- Straddle load wherever possible

PRODUCTIVITY RATES (typical South African market):
- Excavator 25t: 120–200 m³/hr (loose); fuel 20 L/hr
- ADT 14t (740): 80–180 m³/hr bank depending on haul
- Motor grader: 3,000–6,000 m²/hr (blading)
- Paver: 1,500–4,000 m²/day
- Cold milling: 400–800 m²/hr
- Water cart: 20,000–40,000 L/hr
  `,

  EARTHWORKS: `
EARTHWORKS — SOUTH AFRICAN CONSTRUCTION STANDARDS

COLTO SERIES 1000 — EARTHWORKS:
- Bulk cut, fill, compaction, imported material
- All earthworks measured in BCM (in-situ) or CCM (compacted) — read the BOQ carefully
- 1000 series covers: clearing, grubbing, stripping, bulk excavation, fill, shaping

COMPACTION STANDARDS:
- Sub-grade (road bed): minimum 93% Mod AASHTO
- Subbase G7: 93% Mod AASHTO; G6: 98% Mod AASHTO
- Base G4: 100% Mod AASHTO (98% if C4 certificate)
- Test frequency: every 500 m² or as specified per COLTO Table 1000/1

MATERIAL CLASSIFICATIONS:
- G1: Natural gravel, CBR ≥ 80, % passing 0.075mm < 10%
- G2: Crushed stone base, CBR ≥ 80
- G4: Crushed stone subbase, CBR ≥ 45
- G5/G6: Natural gravel subbase, CBR ≥ 25/15
- G7: Selected granular fill, CBR ≥ 7

SWELL & SHRINK FACTORS:
- Gravel: swell factor 1.20–1.40 (LCM/BCM)
- Rock: swell factor 1.30–1.60
- Shrink/compaction factor: 0.85–0.95 (BCM to CCM for gravel)
- Always apply wastage/shrinkage when ordering material

LAYER WORKS:
- Maximum layer thickness for compaction:
  - Granular fill: 200–300mm loose (150–200mm compacted)
  - Rockfill: up to 600mm loose with impact roller
- Moisture optimum: ±2% of OMC (Optimum Moisture Content)
  `,

  PAVING: `
PAVING & BITUMINOUS WORKS — COLTO SERIES 3000

PRIME COAT:
- Purpose: seal and bond prepared granular base; penetrate and harden surface
- Material: MC-30 cutback bitumen OR slow-setting emulsion (SS-60)
- Application rate: 0.6–1.2 L/m² (typical 0.8 L/m²)
- Applied to: prepared G4 or G7 base course after priming period
- Cure time: minimum 24 hours before overlay

TACK COAT:
- Purpose: bond between existing surface and new asphalt overlay
- Material: rapid-setting anionic emulsion (RS-1) or cationic (CRS-1)
- Application rate: 0.2–0.4 L/m²
- Applied to: milled or prepared surface; allow break before paving

EMULSION GRADES:
- RS = Rapid Setting; MS = Medium Setting; SS = Slow Setting
- CRS = Cationic Rapid Setting (positive charge; bonds well to aggregate)
- Anionic = negative charge; used on limestone; less common in SA
- SS-60: 60% bitumen residual; used for prime coats and surface treatments

AC14 ASPHALT:
- Nominal max aggregate: 14mm; wearing course application
- Mix design: 4.5–5.5% binder content; Marshall stability ≥ 8 kN
- Typical thickness: 30–50mm wearing course; 50–75mm base course
- Compaction: minimum 97% Marshall density; 2 passes pneumatic + 2 passes steel
- Temperature: lay at ≥ 130°C; compact before ≤ 100°C

UTFC (Ultra-Thin Friction Course):
- 25mm thick; friction/drainage layer; used on high-speed roads
- Not structural; applied over prepared asphalt base
- Binder: typically PMB (Polymer Modified Bitumen)

SEAL COATS:
- Double seal: sand seal over bitumen spray; most common in SA
- Surfacing spray: 0.9–1.6 L/m² (60/70 pen bitumen)
- Cover aggregate: 6/9mm crushed stone at 12–16 m²/m³

ROAD MARKINGS:
- Thermoplastic: 3mm thickness; retroreflective; <80 km/h
- Cold applied: sprayed paint; lower durability; maintenance use
- Width standards: centre line 100mm; edge line 150mm; stop bar 300–600mm

MILLING:
- Cold planer output: 400–800 m²/hr
- Typical milling depth: 30–80mm (surface) or 100–150mm (deep rehabilitation)
- Material disposal: millings recyclable as RAP (Reclaimed Asphalt Pavement)
  `,

  COLTO: `
COLTO STANDARD SPECIFICATIONS — KEY SERIES

SERIES 1000 — EARTHWORKS: Clearing, bulk excavation, fill, borrow, imported material
SERIES 2000 — GRANULAR LAYER WORKS: G1–G7 material, compaction, testing
SERIES 3000 — BITUMINOUS WORKS: Primes, tacks, seals, asphalt (AC14, UTFC)
SERIES 4000 — CONCRETE WORKS: Kerbs, channels, slabs, bridge decks
SERIES 5000 — ANCILLARIES: Road markings, signs, guardrails, culverts, fencing

MEASUREMENT RULES:
- Earthworks: in BCM (bank) or CCM (compacted) depending on BOQ description
- Granular material: m³ after compaction (CCM) — always apply swell factor
- Bituminous layers: m² (area) with separate item for thickness or included in rate
- Concrete: m³ (volume) — includes shuttering, reinforcing, curing unless separate

PROVISIONAL SUM vs PRIME COST SUM vs CONTINGENCY:
- Provisional Sum: employer uncertain of exact work required; contractor rates provided
- Prime Cost (PC) Sum: employer nominates supplier/subcontractor; contractor adds attendance
- Contingency: allowance for unforeseen; employer's risk; not contractor's income

REMEASURED CONTRACTS:
- Quantities in BOQ are estimates only; final payment based on re-measured quantities
- Risk to contractor: unit rates must be accurate; quantity variations don't change rates
- Common in COLTO road works, bulk earthworks, infrastructure

LUMP SUM CONTRACTS:
- Fixed price for defined scope; no remeasure
- Risk to contractor: accurate take-off is critical; claims for extras
  `,

  STRUCTURES: `
CONCRETE & STRUCTURES — SOUTH AFRICAN CONSTRUCTION

CONCRETE GRADES (SANS 5861):
- C16/20: lean mix, blinding, non-structural; 20 MPa characteristic
- C20/25: general structural; foundations, ground slabs; 25 MPa
- C25/30: standard structural; columns, beams, slabs; 30 MPa
- C30/37: high-quality structural; bridges, waterproof; 37 MPa
- C40/50: high-strength; precast, post-tensioned; 50 MPa
- Grade = fcylinder/fcube strength (cylinder/cube at 28 days)

COVER TO REINFORCING (SANS 10100-1):
- Mild exposure: 25mm minimum
- Moderate (exterior, not aggressive): 30mm
- Severe (aggressive soil/water): 40mm
- Very severe (marine, industrial): 50mm+

REINFORCING STEEL (SANS 920):
- Y-bar (High-yield): 450 MPa yield; deformed; most common structural
- R-bar (Mild steel): 250 MPa yield; smooth; ties, starters, light work
- Fabric: mesh sheets; slabs, roads; square or rectangular mesh

SHUTTERING & FALSEWORK:
- Formwork designed for wet concrete pressure: γ = 24 kN/m³ + construction loads
- Stripping times: soffit slabs 14 days min; columns 24–48 hrs; walls 24 hrs
- Release agent: must be applied before placing rebar; reapply between pours

COMPACTION:
- Needle vibrator: spacing max 8x needle diameter (typically 400–500mm grid)
- Do NOT over-vibrate — causes segregation and bleeding
- Consolidate in 300–500mm layers

CURING:
- Minimum 7 days moist curing for Portland cement concrete
- Extend to 14 days in hot/dry conditions or for blended cements
- Use curing compound, wet hessian, or ponding
  `,

  BOQ: `
BILL OF QUANTITIES & MEASUREMENT

UNITS OF MEASUREMENT:
- m³: volumes (earthworks, concrete, fill)
- m²: areas (paving, painting, formwork, geotextile)
- LM / m: linear measures (kerbs, guardrails, pipes, fencing)
- Nr / No: enumerated items (manholes, gates, signs, crossings)
- kg / t: steel, reinforcing, pipes
- Sum: fixed lump allowances (preliminaries, P&G, mob/demob)
- Prov Sum: provisional allowances; replaced with actual on remeasure

ASAQS METHOD OF MEASUREMENT:
- Used for building works; similar to SANS 1200 for civil
- Rules: measure nett quantities; no deductions for small holes/openings
- Descriptions must identify work, materials, method, and location

SANS 1200 (Civil Works):
- Earthworks measured to net design sections
- Concrete in-situ: measured net (no deductions for rebars or holes <0.1 m²)
- Formwork: measured on the contact face only

DAYWORKS:
- Used for unforeseen or unquantifiable work
- Rates: Labour + Plant + Material + markup (15–25%)
- Written instruction required BEFORE dayworks; retrospective claim rarely accepted

UNBALANCED BIDDING:
- Front-loading: inflate early items; back-loading: inflate late items
- Rate-loading: artificially price items expected to increase in remeasure
- Risk: reduced items means lost revenue; ethical/contractual concerns under GCC/NEC

BOQ READING TIPS:
- Always read: item description → specification reference → unit → quantity
- "Included" in description means no separate item; "excluded" = separate allowance
- Provisional quantities: build your rate on what you know, not on uncertainty
  `,

  RATES: `
RATE BUILD-UP — FIRST PRINCIPLES (South African Construction)

FORMULA: Rate = Plant + Labour + Material + Overhead + Profit + Contingency

LABOUR:
- All-in rate = Basic wage + Allowances + UIF + SDL + Workmen's Comp + PPE + transport overhead
- BCCEI wage determinations set minimum rates for building & civil
- Gang composition matters: supervisor + skilled + semi-skilled + general
- Productivity factor (0.60–0.85): job efficiency, weather, site conditions

PLANT:
- Ownership cost = (Purchase price − Salvage) / Life hours + R&M allowance
- Hire rate includes: depreciation, finance, insurance, R&M (not fuel or operator)
- All-in hire rate = hire rate + fuel cost + operator wage
- Standby rate: typically 50% of working rate; applies when not productive

MATERIAL ON SITE:
- Material cost = Supply price + Freight/delivery + Unloading + Wastage
- Wastage factors: concrete 3–5%; steel 2.5–5%; aggregate 5–10%; pipe 1–3%
- Apply swell/shrinkage for earthwork material volumes

OVERHEAD RECOVERY:
- Site overhead (direct): site manager, site office, facilities, welfare
- Head office overhead: typically 6–12% of contract value
- Time-related OH: charged monthly regardless of progress
- Output-related OH: varies with production

PROFIT & CONTINGENCY:
- Profit margin: 3–8% for competitive civil; 8–15% for negotiated/specialist
- Contingency: 1–5% for risk allowance (weather, price fluctuations)
- Risk premium: price-in for uncertain quantities, access, logistics

ESCALATION (CPAP):
- Formula: Ce = Co × (CPAP_final/CPAP_base)
- Used in contracts with price adjustment provisions
- Important for multi-year projects; protect against fuel/labour cost rises

CCS CANDY RATE BUILD-UP PROCESS:
1. Create activity in BOQ
2. Link resources: plant + labour + material (composite or individual)
3. Set production rate (output per shift/hour)
4. CCS calculates: resource duration × rates = activity cost
5. Apply overhead % at project or section level
6. Print rate build-up sheet for tender submission
  `,

  MACHINE_OUTPUT: `
MACHINE OUTPUT CALCULATIONS

CYCLE TIME FORMULA:
Total Cycle Time = Load + Haul + Dump + Return + Spot/Position

OUTPUT FORMULA:
Output (BCM/hr) = (60/Cycle time in mins) × Payload in BCM × Efficiency factor

JOB EFFICIENCY FACTORS:
- Excellent: 0.85 | Good: 0.80 | Average: 0.75 | Poor: 0.65

ADT FLEET SIZING:
Number of ADTs = Excavator output (BCM/hr) / ADT output (BCM/hr per truck)
ADT output/truck = (60/cycle time) × payload BCM

TYPICAL MACHINE OUTPUTS:
- Excavator 25t (Cat 325): 120–200 m³/hr loose, 150–250 BCM/hr
- Excavator 14t: 80–140 m³/hr loose
- ADT 14m³ (740): cycle-time dependent; 30–80 BCM/hr per truck
- Dozer D8: push rate 200–400 BCM/hr at short distances
- Motor grader 140M: 3,000–6,000 m²/hr blading; 60–120 m³/hr ripping
- Paver 1800-3: 1,500–4,000 m²/day (40mm AC14); crew-dependent
- Padfoot roller (84 kN): 2,000–3,500 m²/hr at 4 km/h; 4 passes
- Cold planer (W200): 400–800 m²/hr at 30–80mm depth
- Water cart 20,000L: 20,000–40,000 L/hr; 2–4 km/h spraying

PRODUCTION CALCULATION EXAMPLE:
- Excavator output = 150 BCM/hr; ADT payload = 14 BCM; cycle = 25 min
- ADT trips/hr = 60/25 = 2.4 trips/hr
- ADT output = 2.4 × 14 = 33.6 BCM/hr
- Fleet size needed = 150/33.6 = 4.5 → use 5 ADTs

PAVER PRODUCTION:
Output (m²/day) = Width (m) × Speed (m/min) × Working mins/day
Controlling factor: asphalt supply rate from batch plant or site mix
  `,

  TENDER: `
TENDER STRATEGY & CONTRACT MANAGEMENT

TENDER PROCESS (SOUTH AFRICA):
1. RFT (Request for Tender) issued with BOQ, drawings, specifications
2. Compulsory site visit (record attendance — mandatory in many contracts)
3. Queries submitted in writing; clarifications issued to all tenderers
4. Tender submission: sealed; comply with format, time, BBBEE requirements
5. Adjudication: price + quality/technical + BBBEE scorecard
6. Acceptance: Letter of Award → Contract execution

CONTRACT FORMS:
- NEC4 ECC: collaborative; early warning system; schedule of cost components; risk shared
- JBCC Series 2000: South African; building; detailed payment provisions; nominated subcontractors
- FIDIC (Red/Yellow Book): international; engineer-led; strict claims process
- GCC 2015: Government works; remeasured; often used for roads/civil
- CIDB preferred for public sector contracts >R500k

CASH FLOW MANAGEMENT:
- Payment terms: 30-day (standard); 60-day (government); negotiate up front
- Front-loading strategy: inflate P&G and early items to improve cash flow
- Retention: typically 10% withheld; 5% on practical completion; 5% on defects liability
- Negative cash flow early = financing cost; must price-in or negotiate payment milestones

RISK REGISTER:
Key risks to price: ground conditions, latent defects, access/utilities, weather, design changes
Price risk as: separate risk item OR contingency % OR built into unit rates

TENDER PROGRAMME:
- Must match method statement and resource schedule
- Critical path identification: delay on critical activities = EOT (Extension of Time) claim
- Float: contractor's risk unless contract assigns shared ownership
- Resource histogram: link to rate build-up; ensure no illogical overloading

BBBEE IN TENDERING:
- Scorecard: ownership, management, skills development, enterprise development, procurement
- Level 1 = 135 points; Level 4 = 100 points (minimum for most state contracts)
- Sub-contracting: 30% to designated groups in many state contracts (CIDB requirement)
  `,

  CCS: `
CCS CANDY SOFTWARE — CONCEPTS & WORKFLOWS

WHAT IS CANDY:
CCS Candy is the industry-standard construction cost estimating and project management software used extensively in South Africa. Used by WBHO, Aveng, Group Five, Murray & Roberts.

KEY MODULES:
- Estimating: BOQ + rate build-up; resource libraries; composite resources
- BillingBuild: contract billing; payment certificates; variations
- Programme: Gantt chart; critical path; resource levelling
- Cost Reporting: budget vs actual; earned value; cost-to-complete

RATE BUILD-UP IN CANDY:
1. Create BOQ item (description, unit, quantity)
2. Add resources to the item:
   - Labour resource (code, rate, quantity per output unit)
   - Plant resource (hire rate, fuel, operator)
   - Material resource (supply rate, wastage factor)
3. Set production rate (crew/machine output per shift)
4. CCS computes: Total rate = Σ (resource quantity × rate) / output
5. Apply OH% and profit% at project level or item level

COMPOSITE RESOURCE vs FORMULA RESOURCE:
- Composite: pre-built "gang" or "unit" (e.g. "Concrete Gang = 1× vibrator + 4× labourers + 1× foreman")
  Add as single item; CCS expands to individual rates
- Formula resource: rate is calculated from a formula (e.g. Material = supply × (1+wastage/100))
  Used for materials where cost depends on a variable

PRODUCTION LINKING:
- Candy can link a BOQ activity to a programme activity
- When production rate changes, both cost and time update simultaneously
- Essential for resource-loaded programmes and cash flow forecasting

COST CODES (CCS Candy):
- 4010: Earthworks & Excavation
- 4020: Concrete & Formwork
- 4030: Reinforcing Steel
- 4040: Brickwork & Blockwork
- 3010: Material — Aggregates
- 3020: Material — Concrete

REPORTING:
- Rate build-up sheet: used for tender submission; shows breakdown per resource
- Cost report: budget vs actual for each cost code; variance analysis
- Cash flow: S-curve comparing planned vs actual expenditure
  `,

  HEALTH_SAFETY: `
HEALTH & SAFETY IN SOUTH AFRICAN CONSTRUCTION

LEGAL FRAMEWORK:
- OHSA (Occupational Health and Safety Act, 1993): primary legislation
- Construction Regulations 2014: specific to construction sites
- Mines Health and Safety Act (for mining support works)
- NEMA (Environmental Management Act): environmental obligations

PRINCIPAL CONTRACTOR OBLIGATIONS:
- Appoint Health & Safety Rep on sites >20 workers
- Prepare site-specific H&S Plan BEFORE work starts
- Conduct risk assessment for all activities
- Keep H&S file on site at all times (inspections, reports, toolbox talks)

H&S PLAN CONTENTS:
- Risk assessment register
- Hazard identification (HIRA)
- Safe Work Procedures (SWPs) for high-risk activities
- Emergency evacuation plan
- Fall protection plan (PFAS — Personal Fall Arrest System)

HIGH-RISK ACTIVITIES (Construction Regs):
- Excavations >1.5m depth: shores, benching, or battering required
- Working at height >2m: fall protection plan mandatory
- Lifting operations: appointed lifting inspector; load test certificates
- Demolition: method statement; engineer sign-off
- Hazardous materials (asbestos, lead paint): specialist removal

PPE MINIMUM REQUIREMENTS (Construction sites):
- Hard hat (SANS 1397) at all times on site
- Safety boots (steel toe + midsole)
- High-visibility vest
- Safety glasses in hazard zones
- Hearing protection near >85 dB machinery

TOOLBOX TALKS:
- Weekly minimum; recorded in H&S file
- Topic should relate to current activities (e.g. before paving: traffic management)
- All attendees sign; supervisor signs off

INCIDENT REPORTING:
- Dangerous occurrence: report to DoL within 24 hours
- Disabling injury: report within 7 days
- Fatality: immediately notify DoL inspector + police

ENVIRONMENTAL:
- No burning on site without permit
- Concrete washout to designated bunded area; not into stormwater
- Fuel storage: bunded area, 110% capacity; fire extinguisher on site
- Waste management plan: separate bins for general/hazardous/recyclable
  `
};

// Full topic labels for prompt context
const TOPIC_LABELS = {
  ALL: 'All Topics (Plant Operations, Earthworks, Paving, COLTO, Structures, BOQ, Rate Build-Up, Machine Output, Tender Strategy, CCS Candy, H&S)',
  PLANT_OPS: 'Plant Operations — Rules of Thumb (Excavators, ADTs, Dozers, Graders, Compactors, Wheel Loaders, Scrapers)',
  EARTHWORKS: 'Earthworks — BCM/LCM/CCM, compaction standards, material classifications, layer works',
  PAVING: 'Paving & Bituminous Works — COLTO 3000, prime/tack coats, AC14, UTFC, seals, milling',
  COLTO: 'COLTO Standard Specifications — Series 1000–5000, measurement rules, contract types',
  STRUCTURES: 'Structures & Concrete — grades, cover, reinforcing, shuttering, compaction, curing',
  BOQ: 'BOQ & Measurement — ASAQS, SANS 1200, units, Provisional Sum, PC Sum, dayworks, unbalanced bidding',
  RATES: 'Rate Build-Up — Labour, plant, material, OH, profit, escalation, CCS Candy process',
  MACHINE_OUTPUT: 'Machine Output Calculations — cycle time, fleet sizing, productivity, typical outputs',
  TENDER: 'Tender Strategy — process, contracts (NEC/JBCC/GCC), cash flow, risk, BBBEE',
  CCS: 'CCS Candy Software — estimating, composite resources, production linking, cost codes',
  HEALTH_SAFETY: 'Health & Safety & Environment — OHSA, Construction Regs, PPE, incident reporting'
};

// Get relevant standards content for a topic
function getTopicContent(topic) {
  if (topic === 'ALL') {
    // Rotate through topics for ALL — pick 2-3 to keep prompt focused
    const keys = Object.keys(STANDARDS_LIBRARY);
    const rand = keys[Math.floor(Math.random() * keys.length)];
    return STANDARDS_LIBRARY[rand] || STANDARDS_LIBRARY.PLANT_OPS;
  }
  return STANDARDS_LIBRARY[topic] || STANDARDS_LIBRARY.PLANT_OPS;
}

// Difficulty descriptors
const DIFF_DESC = {
  easy:   'Easy — single concept, given data, one-step. Clear and direct.',
  medium: 'Medium — multi-step, some assumptions needed, interpretation required.',
  hard:   'Hard — first principles, incomplete data, judgment calls required.',
  expert: 'Expert — full scenario, strategy decisions, defend your answer with numbers.'
};

// Format descriptors
const FMT_DESC = {
  mcq:  'Multiple Choice — exactly 4 options (A–D). Mark one as correct. Return options array and correct_index (0-based).',
  open: 'Open Question — analytical or descriptive answer. Return no options array.',
  calc: 'Calculation Problem — numerical working required. Include given data. Show expected working. Return no options array.'
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const action = req.query.action || (req.body && req.body.action) || '';

  // ── PING ──────────────────────────────────────────────────────────────────
  if (action === 'ping') {
    const keyOk = !!process.env.ANTHROPIC_API_KEY;
    return res.status(keyOk ? 200 : 400).json({ ok: keyOk, service: 'tutor' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── GENERATE QUESTION ──────────────────────────────────────────────────────
  if (action === 'question') {
    const topic  = req.query.topic  || 'ALL';
    const diff   = req.query.diff   || 'easy';
    const fmt    = req.query.fmt    || 'mcq';

    const content = getTopicContent(topic);
    const isMCQ = fmt === 'mcq';

    const systemPrompt = `You are a senior South African construction industry trainer and QS with 25+ years experience.
Your specialties: COLTO, SANS standards, earthworks, pavement engineering, rate build-up, CCS Candy, NEC/JBCC contracts, BBBEE.
You train junior estimators and site engineers at WBHO — one of South Africa's top construction companies.
Always use South African Rand (ZAR / R). Use realistic SA market rates. Reference actual COLTO series, SANS numbers, and industry standards.
Be precise, technically accurate, and practically useful.`;

    const userPrompt = `Generate ONE ${DIFF_DESC[diff]||DIFF_DESC.medium} construction training question.

TOPIC: ${TOPIC_LABELS[topic]||topic}
FORMAT: ${FMT_DESC[fmt]||FMT_DESC.mcq}

REFERENCE MATERIAL FOR THIS TOPIC:
${content}

RULES:
- Question must relate directly to the topic and reference material above
- Use realistic South African project scenarios, rates, and context
- ${isMCQ ? 'Provide EXACTLY 4 options. Only one is correct. Distractors should be plausible.' : 'Question should require a detailed, thoughtful answer.'}
- Include a model answer that a senior engineer would give

Respond ONLY with valid JSON (no markdown, no code blocks), exactly this structure:
{
  "question": "Full question text here",
  "options": ${isMCQ ? '["Option A text", "Option B text", "Option C text", "Option D text"]' : 'null'},
  "correct_index": ${isMCQ ? '0 (zero-based index of correct option)' : 'null'},
  "answer": "Full model answer / explanation. For MCQ include WHY the correct answer is right AND why others are wrong.",
  "topic_tag": "Short topic label e.g. Earthworks — BCM Conversion"
}`;

    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt
      });

      const raw = message.content[0].text.trim();
      // Strip any accidental markdown fences
      const clean = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(clean);

      // Validate MCQ structure
      if (isMCQ && (!Array.isArray(parsed.options) || parsed.options.length < 2)) {
        parsed.options = null; parsed.correct_index = null;
      }

      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GRADE ANSWER ──────────────────────────────────────────────────────────
  if (action === 'grade' || req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch(_){} }

    const { question, correct_answer, options, user_answer, topic, diff } = body;

    if (!question || !user_answer) {
      return res.status(400).json({ error: 'question and user_answer are required' });
    }

    const systemPrompt = `You are a strict but fair construction training assessor at WBHO.
Grade the student's answer against the model answer. Be technically accurate and specific.
Use South African construction industry standards (COLTO, SANS, BCCEI etc.).
Give constructive feedback — point out what was right, what was wrong, what was missing.`;

    const userPrompt = `QUESTION:
${question}

MODEL ANSWER:
${correct_answer || '(not provided)'}

${options && options.length ? `OPTIONS PRESENTED:\n${options.map((o,i)=>String.fromCharCode(65+i)+') '+o).join('\n')}\n` : ''}
STUDENT'S ANSWER:
${user_answer}

Grade the student's answer.

Respond ONLY with valid JSON:
{
  "grade": "A|B|C|D|F",
  "score_pct": 0-100,
  "feedback": "Detailed feedback (2-4 sentences). What was correct, what was wrong/missing, the correct explanation. Professional, encouraging tone. Reference specific standards where applicable."
}

Grade scale: A=90-100% (excellent), B=75-89% (good), C=55-74% (satisfactory), D=40-54% (needs work), F=<40% (incorrect or insufficient)`;

    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 600,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt
      });

      const raw = message.content[0].text.trim();
      const clean = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(clean);

      return res.status(200).json(parsed);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action. Use ?action=question or ?action=grade (POST)' });
};
