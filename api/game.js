/**
 * Vercel Serverless Function: /api/game
 * Powers the AI Tender Pricing Game in estimation_masterclass.html
 *
 * Actions:
 *   GET  /api/game?action=generate&difficulty=easy|medium|hard
 *        → Generates a new AI BOQ scenario with perfect rates (hidden from client)
 *
 *   POST /api/game (body: { action: 'grade', items: [{ref, desc, unit, qty, userRate, perfectRate}] })
 *        → Grades submitted rates, returns scores + explanations
 *
 * Requires: ANTHROPIC_API_KEY environment variable set in Vercel project settings.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '4096');

// Load agent instructions from the .md file at runtime
function loadAgentInstructions() {
  try {
    const mdPath = join(process.cwd(), 'AI_GAME_AGENT_INSTRUCTIONS.md');
    return readFileSync(mdPath, 'utf-8');
  } catch {
    return '# AI Game Agent\nYou generate and grade construction BOQ pricing scenarios.';
  }
}

// ── Airtable: fetch real rates as AI context ─────────────────────────────────
// Pulls live Material Resources from the TenderMind Airtable base so that
// the AI game scenarios reference genuine South African project rates.

const AT_BASE = process.env.AIRTABLE_BASE_ID || 'appx9oZUOiM141LKx';
const AT_API  = 'https://api.airtable.com/v0';

async function fetchAirtableRates() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return null;  // Skip if not configured

  try {
    const table = encodeURIComponent('[REF] Material Resources');
    const qs = new URLSearchParams({
      returnFieldsByFieldId: 'true',
      pageSize: '20',
      // Sort by AllIn_Rate descending to get the most significant rates
      'sort[0][field]': 'flduOSo6nr6aMclK4',
      'sort[0][direction]': 'desc'
    });
    const url = `${AT_API}/${AT_BASE}/${table}?${qs}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const records = data.records || [];

    // Map to a compact context string for Claude
    return records.map(r => {
      const f = r.fields || {};
      const code   = f['fldD7IAURtH3NX1f5'] || '';
      const desc   = f['fldze2tQnQKgowmk3'] || '';
      const unit   = f['fldBRNYFC9OlLYuM4'] || '';
      const supply = parseFloat(f['fld72LBJuMZGYNQ5T']) || 0;
      const allin  = parseFloat(f['flduOSo6nr6aMclK4']) || 0;
      return `${code} | ${desc} | ${unit} | Supply R${supply.toFixed(2)} | All-in R${allin.toFixed(2)}`;
    }).join('\n');
  } catch {
    return null;
  }
}

// ── GENERATE scenario ──────────────────────────────────────────────────────
async function generateScenario(difficulty = 'medium') {
  const instructions = loadAgentInstructions();

  // Enrich the prompt with live Airtable rates for grounding
  const liveRates = await fetchAirtableRates();
  const rateContext = liveRates
    ? `\n\nLIVE MATERIAL RATES from TenderMind Airtable database (use these as reference for realistic pricing):\nCode | Description | Unit | Supply Rate | All-In Rate\n${liveRates}\n`
    : '';

  const userPrompt = `Generate a BOQ pricing scenario. Difficulty: ${difficulty}.${rateContext} Return ONLY JSON, no markdown:
{"id":"ai-${Date.now()}","title":"...","desc":"...","difficulty":"${difficulty}","icon":"emoji","items":[{"ref":"XX-001","desc":"...","unit":"m²","qty":500,"hint":"...","perfectRate":185.50,"buildUp":[{"label":"Plant","val":45.20},{"label":"Labour","val":12.80},{"label":"Material","val":85.00},{"label":"OH 12%","val":17.16},{"label":"Profit 8%","val":12.84},{"label":"Other","val":12.50}],"perfNote":"..."}]}
Rules: 3-4 items only, South African context, buildUp values must sum to perfectRate, realistic quantities.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: instructions,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const raw = response.content[0].text.trim();
  // Robustly extract the JSON object regardless of surrounding text / code fences
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model did not return valid JSON. Raw: ' + raw.slice(0, 200));
  const scenario = JSON.parse(raw.slice(start, end + 1));

  // Strip perfectRate from items before sending to client
  // Store them server-side temporarily (use a signed token in production)
  const clientScenario = {
    ...scenario,
    items: scenario.items.map(item => ({
      ref: item.ref,
      desc: item.desc,
      unit: item.unit,
      qty: item.qty,
      hint: item.hint,
      // Hidden from client until submission
      _key: Buffer.from(JSON.stringify({
        perfectRate: item.perfectRate,
        buildUp: item.buildUp,
        perfNote: item.perfNote
      })).toString('base64')
    }))
  };

  return { scenario: clientScenario };
}

// ── GRADE submission ───────────────────────────────────────────────────────
async function gradeSubmission(items) {
  const instructions = loadAgentInstructions();

  // Decode the hidden perfect rates from _key
  const itemsWithAnswers = items.map(item => {
    let perfect = {};
    try {
      perfect = JSON.parse(Buffer.from(item._key || '', 'base64').toString());
    } catch { /* fallback */ }
    return {
      ...item,
      perfectRate: perfect.perfectRate || item.perfectRate || 0,
      buildUp: perfect.buildUp || [],
      perfNote: perfect.perfNote || ''
    };
  });

  const gradingData = itemsWithAnswers.map(item => ({
    ref: item.ref,
    desc: item.desc,
    unit: item.unit,
    qty: item.qty,
    userRate: item.userRate,
    perfectRate: item.perfectRate,
    diff: item.perfectRate > 0
      ? Math.abs(item.userRate - item.perfectRate) / item.perfectRate * 100
      : null
  }));

  const userPrompt = `Grade BOQ submissions. Return ONLY JSON, no markdown.
Items: ${JSON.stringify(gradingData)}
Scoring: ≤2%=100pts, ≤5%=80pts, ≤10%=60pts, ≤20%=40pts, >20%=10pts.
Return: {"results":[{"ref":"...","pts":80,"tier":"great","pct":4.2,"direction":"over","explanation":"..."}],"totalPts":320,"maxPts":400,"percentage":80,"grade":"🥇 Gold — Sharp Estimator","feedback":"2-3 sentence QS review, SA context."}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: instructions,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const raw2 = response.content[0].text.trim();
  const s2 = raw2.indexOf('{'), e2 = raw2.lastIndexOf('}');
  if (s2 === -1 || e2 === -1) throw new Error('Grading response invalid JSON. Raw: ' + raw2.slice(0, 200));
  const grading = JSON.parse(raw2.slice(s2, e2 + 1));

  // Attach full build-ups to results for the reveal
  grading.results = grading.results.map((r, i) => ({
    ...r,
    perfectRate: itemsWithAnswers[i]?.perfectRate || 0,
    buildUp: itemsWithAnswers[i]?.buildUp || [],
    perfNote: itemsWithAnswers[i]?.perfNote || '',
    desc: itemsWithAnswers[i]?.desc || '',
    unit: itemsWithAnswers[i]?.unit || '',
    qty: itemsWithAnswers[i]?.qty || 0,
    userRate: itemsWithAnswers[i]?.userRate || 0
  }));

  return grading;
}

// ── Main handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS headers for Vercel deployment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY not configured. Set it in Vercel project environment variables.'
    });
  }

  try {
    if (req.method === 'GET' && req.query.action === 'ping') {
      return res.status(200).json({ ok: true, model: MODEL });
    }

    if (req.method === 'GET' && req.query.action === 'generate') {
      const difficulty = req.query.difficulty || 'medium';
      const result = await generateScenario(difficulty);
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action === 'grade' && Array.isArray(body.items)) {
        const result = await gradeSubmission(body.items);
        return res.status(200).json(result);
      }
    }

    return res.status(400).json({ error: 'Invalid action. Use action=generate or POST with action=grade.' });
  } catch (err) {
    console.error('[API/game] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
