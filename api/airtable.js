/**
 * Vercel Serverless Function: /api/airtable
 * Proxies all Airtable REST API calls, keeping AIRTABLE_API_KEY server-side.
 *
 * Usage from frontend (production / Vercel):
 *   GET  /api/airtable?table=[REF] Labour Resources
 *   GET  /api/airtable?table=[REF] Labour Resources&recordId=recXXXXX
 *   GET  /api/airtable?table=[REF] Labour Resources&filterByFormula={Active}=1&sort[0][field]=Resource Code
 *   POST /api/airtable?table=[N4] BOQ Items           body: { records: [{ fields: {...} }] }
 *   PATCH /api/airtable?table=[N4] BOQ Items&recordId=recXXXX  body: { fields: {...} }
 *   DELETE /api/airtable?table=[N4] BOQ Items&recordId=recXXXX
 *
 * Environment variables (set in Vercel dashboard):
 *   AIRTABLE_API_KEY  — your personal access token (starts with "pat...")
 *   AIRTABLE_BASE_ID  — appx9oZUOiM141LKx  (TenderMind — N4-REHAB-2026)
 */

export default async function handler(req, res) {
  // ── CORS ─────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Config check ─────────────────────────────────────────────────────────
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!API_KEY || !BASE_ID) {
    return res.status(503).json({
      error: 'Airtable not configured. Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID in Vercel project settings.'
    });
  }

  // ── Build upstream URL ────────────────────────────────────────────────────
  const { table, recordId, ...rest } = req.query;

  if (!table) {
    return res.status(400).json({ error: "Missing required query param: 'table'" });
  }

  const encodedTable = encodeURIComponent(table);
  let upstreamUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodedTable}`;
  if (recordId) upstreamUrl += `/${recordId}`;

  // Forward safe query params to Airtable
  const ALLOWED_PARAMS = [
    'filterByFormula', 'maxRecords', 'pageSize', 'offset', 'view',
    'cellFormat', 'timeZone', 'userLocale', 'returnFieldsByFieldId'
  ];
  const qs = new URLSearchParams();

  // Pass through fields[], sort[], and allowed scalar params
  for (const [key, val] of Object.entries(rest)) {
    const base = key.split('[')[0];
    if (ALLOWED_PARAMS.includes(base) || base === 'fields' || base === 'sort') {
      qs.append(key, val);
    }
  }
  if (qs.toString()) upstreamUrl += `?${qs.toString()}`;

  // ── Proxy request ─────────────────────────────────────────────────────────
  const fetchOptions = {
    method: req.method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body) {
    fetchOptions.body = JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(upstreamUrl, fetchOptions);
    const data = await upstream.json();

    // Relay the exact status code from Airtable
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[api/airtable] Proxy error:', err.message);
    return res.status(500).json({ error: err.message || 'Airtable proxy error' });
  }
}
