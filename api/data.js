// api/data.js — Local CSV data endpoint (replaces Airtable)
// Serves CSV files from the /data folder bundled with the deployment.
const fs   = require('fs');
const path = require('path');

// Map of short-code → filename in the /data directory
const CSV_MAP = {
  activities: 'activities.csv',  // Programme Activities → Gantt
  PLT:        'PLT.csv',         // Plant & Equipment
  LAB:        'LAB.csv',         // Labour / Personnel
  MAT:        'MAT.csv',         // Materials
  CC07:       'CC07.csv',        // Fuel & Lubricants
  CC08:       'CC07.csv',        // Maintenance (use fuel file as fallback)
  CC09:       'LAB.csv',         // Transport (fallback)
  CC13:       'LAB.csv',         // Health & Safety (fallback)
  CC14:       'APR.csv',         // Quality Control (fallback)
  DLR:        'DLR.csv',         // Delay Register / Risk
  MLS:        'MLS.csv',         // Milestones / Checklist
  BVA:        'BVA.csv',         // Budget vs Actual / Cost Codes
  APR:        'APR.csv',         // Activity Progress / Productivity
  KPI:        'KPI.csv',         // KPI / Pricing Model
  ACT:        'ACT.csv',         // Activity Term Master / BOQ
  INS:        'APR.csv',         // Inspections (fallback)
  DSD:        'APR.csv',         // Daily Site Diary (fallback)
  LTS:        'LAB.csv',         // Labour Timesheet (fallback)
  PLU:        'PLT.csv',         // Plant Utilisation (fallback)
  SMALLPLANT: 'PLT.csv',         // Small plant (fallback)
  TOOL:       'PLT.csv',         // Tools (fallback)
  CC:         'BVA.csv',         // Cost Categories (fallback)
};

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const csv = (req.query.csv || '').trim();

  if (!csv) {
    res.status(400).json({ error: 'Missing ?csv= parameter' });
    return;
  }

  const filename = CSV_MAP[csv];
  if (!filename) {
    res.status(404).json({ error: `Unknown table: ${csv}` });
    return;
  }

  const filePath = path.join(process.cwd(), 'data', filename);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(content);
  } catch (err) {
    res.status(500).json({ error: `Could not read ${filename}: ${err.message}` });
  }
};
