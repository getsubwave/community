#!/usr/bin/env node
// Build catalog.json — the single published index SUB/WAVE stations fetch live
// (controller/src/community/registry.ts). Walks the four content dirs, parses
// each entry, and emits one JSON index at the repo root. Zero dependencies
// (Node built-ins only) so CI needs no install step.
//
//   node scripts/build-catalog.mjs           # write catalog.json
//   node scripts/build-catalog.mjs --check    # validate only; exit 1 on any error
//
// The parsers mirror the controller's readers (SLUG_RE, the flat-YAML
// frontmatter parser, the field bounds) so an entry that builds here always
// passes the station-side normaliser and the install-time strict validators.

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,48}$/;
const FREQUENCIES = ['silent', 'quiet', 'moderate', 'chatty', 'aggressive'];
const SCRIPT_LENGTHS = ['one-liner', 'concise', 'extended', 'storyteller'];
const SHOW_MOODS = ['energetic', 'calm', 'reflective', 'celebratory', 'romantic', 'spiritual', 'focus', 'workout', 'driving', 'cooking', 'rainy', 'sunny', 'night', 'morning', 'evening', 'festival', 'cultural'];
const SHOW_ENERGY = ['low', 'medium', 'high'];

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

// Flat-YAML frontmatter parser — identical rules to the controller's
// parseFrontmatter (skills/loader.ts): a flat key: value block, no nesting.
function parseFrontmatter(raw) {
  const text = raw.replace(/^﻿/, '');
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text.trim() };
  const data = {};
  for (const line of m[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) data[key] = val;
  }
  return { data, body: m[2].trim() };
}

async function listDirs(dir) {
  try {
    const ents = await readdir(dir, { withFileTypes: true });
    return ents.filter(e => e.isDirectory()).map(e => e.name).sort();
  } catch { return []; }
}
async function listFiles(dir, ext) {
  try {
    const ents = await readdir(dir, { withFileTypes: true });
    return ents.filter(e => e.isFile() && e.name.endsWith(ext)).map(e => e.name).sort();
  } catch { return []; }
}

const commaList = v => String(v ?? '').split(',').map(s => s.trim()).filter(Boolean);
const dial = v => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= 10 ? n : undefined; };
const provenance = data => ({
  submittedBy: data.submittedBy?.trim() || undefined,
  dateAdded: data.dateAdded?.trim() || undefined,
  dateModified: data.dateModified?.trim() || undefined,
});
const clean = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

async function buildSkills() {
  const out = [];
  for (const slug of await listDirs(join(ROOT, 'skills'))) {
    const where = `skills/${slug}`;
    if (!SLUG_RE.test(slug)) { fail(where, 'slug must match /^[a-z0-9][a-z0-9-]{0,48}$/'); continue; }
    let raw;
    try { raw = await readFile(join(ROOT, 'skills', slug, 'SKILL.md'), 'utf8'); }
    catch { fail(where, 'missing SKILL.md'); continue; }
    const { data, body } = parseFrontmatter(raw);
    if ((data.name || slug).trim() !== slug) { fail(where, `name "${data.name}" must equal folder slug`); continue; }
    if (!body) { fail(where, 'brief (body) is required'); continue; }
    out.push(clean({
      slug,
      label: (data.label || slug).trim(),
      brief: body,
      cooldown: data.cooldown ? String(data.cooldown).trim() : undefined,
      window: data.window === 'commute' ? 'commute' : undefined,
      context: (data.context ?? data.contextFields)?.trim() || undefined,
      ...provenance(data),
    }));
  }
  return out;
}

async function buildPersonas() {
  const out = [];
  for (const slug of await listDirs(join(ROOT, 'personas'))) {
    const where = `personas/${slug}`;
    if (!SLUG_RE.test(slug)) { fail(where, 'slug must match /^[a-z0-9][a-z0-9-]{0,48}$/'); continue; }
    let raw;
    try { raw = await readFile(join(ROOT, 'personas', slug, 'PERSONA.md'), 'utf8'); }
    catch { fail(where, 'missing PERSONA.md'); continue; }
    const { data, body } = parseFrontmatter(raw);
    if ((data.name || slug).trim() !== slug) { fail(where, `name "${data.name}" must equal folder slug`); continue; }
    const soul = body.trim();
    if (!soul) { fail(where, 'soul (body) is required'); continue; }
    if (soul.length > 1000) { fail(where, `soul must be <=1000 chars (is ${soul.length})`); continue; }
    if (data.frequency && !FREQUENCIES.includes(data.frequency)) fail(where, `frequency "${data.frequency}" not in ${FREQUENCIES.join('|')}`);
    if (data.scriptLength && !SCRIPT_LENGTHS.includes(data.scriptLength)) fail(where, `scriptLength "${data.scriptLength}" not in ${SCRIPT_LENGTHS.join('|')}`);
    out.push(clean({
      slug,
      displayName: (data.displayName || slug).trim().slice(0, 40),
      tagline: data.tagline?.trim().slice(0, 80) || undefined,
      soul,
      frequency: FREQUENCIES.includes(data.frequency) ? data.frequency : 'moderate',
      scriptLength: SCRIPT_LENGTHS.includes(data.scriptLength) ? data.scriptLength : 'concise',
      djMode: data.djMode === 'true',
      humour: dial(data.humour),
      localColour: dial(data.localColour),
      warmth: dial(data.warmth),
      language: data.language?.trim().slice(0, 60) || undefined,
      ...provenance(data),
    }));
  }
  return out;
}

// "1988-1996" | "1988" | "1988-" | "-1996" → { fromYear, toYear }, years 1900-2100.
function parseEra(token, where) {
  const parseYear = (s) => {
    if (s === '' || s == null) return null;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1900 || n > 2100) { fail(where, `era year "${s}" must be an integer 1900-2100`); return NaN; }
    return n;
  };
  const parts = token.includes('-') ? token.split('-') : [token, token];
  const from = parseYear(parts[0].trim());
  const to = parseYear(parts[1].trim());
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  if (from == null && to == null) return null;
  if (from != null && to != null && from > to) { fail(where, `era "${token}" fromYear must be <= toYear`); return null; }
  return { fromYear: from, toYear: to };
}

async function buildShows() {
  const out = [];
  for (const slug of await listDirs(join(ROOT, 'shows'))) {
    const where = `shows/${slug}`;
    if (!SLUG_RE.test(slug)) { fail(where, 'slug must match /^[a-z0-9][a-z0-9-]{0,48}$/'); continue; }
    let raw;
    try { raw = await readFile(join(ROOT, 'shows', slug, 'SHOW.md'), 'utf8'); }
    catch { fail(where, 'missing SHOW.md'); continue; }
    const { data, body } = parseFrontmatter(raw);
    if ((data.name || slug).trim() !== slug) { fail(where, `name "${data.name}" must equal folder slug`); continue; }
    const name = (data.displayName || slug).trim().slice(0, 60);
    if (!name) { fail(where, 'displayName is required'); continue; }
    const topic = body.trim();
    if (topic.length > 1000) { fail(where, `topic (body) must be <=1000 chars (is ${topic.length})`); continue; }
    const moods = commaList(data.moods).slice(0, 6);
    for (const m of moods) if (!SHOW_MOODS.includes(m)) fail(where, `mood "${m}" not in ${SHOW_MOODS.join('|')}`);
    const energies = commaList(data.energies).slice(0, 6);
    for (const e of energies) if (!SHOW_ENERGY.includes(e)) fail(where, `energy "${e}" not in ${SHOW_ENERGY.join('|')}`);
    const genres = commaList(data.genres).map(g => g.slice(0, 64)).slice(0, 6);
    const eras = commaList(data.eras).map(t => parseEra(t, where)).filter(Boolean).slice(0, 6);
    const secRaw = data.maxTrackSeconds;
    const sec = secRaw != null && secRaw !== '' ? Number(secRaw) : null;
    out.push(clean({
      slug,
      name,
      topic,
      moods: moods.filter(m => SHOW_MOODS.includes(m)),
      genres,
      eras,
      energies: energies.filter(e => SHOW_ENERGY.includes(e)),
      filtersStrict: data.filtersStrict === 'true',
      banter: data.banter === 'true',
      programme: data.programme === 'true',
      segmentSkill: (data.segmentSkill || '').trim().slice(0, 64),
      maxTrackSeconds: Number.isInteger(sec) && sec >= 0 ? sec : null,
      ...provenance(data),
    }));
  }
  return out;
}

async function buildStations() {
  const out = [];
  for (const file of await listFiles(join(ROOT, 'stations'), '.json')) {
    const slug = basename(file, '.json');
    const where = `stations/${file}`;
    let json;
    try { json = JSON.parse(await readFile(join(ROOT, 'stations', file), 'utf8')); }
    catch (e) { fail(where, `invalid JSON: ${e.message}`); continue; }
    if (!json || typeof json !== 'object') { fail(where, 'must be a JSON object'); continue; }
    if (!json.name || !json.url) fail(where, 'name and url are required');
    out.push({ slug, ...json });
  }
  return out;
}

async function main() {
  const [skills, personas, shows, stations] = await Promise.all([
    buildSkills(), buildPersonas(), buildShows(), buildStations(),
  ]);
  if (errors.length) {
    console.error(`✖ ${errors.length} catalog problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const catalog = { version: 1, generatedAt: new Date().toISOString(), skills, personas, shows, stations };
  const counts = `skills=${skills.length} personas=${personas.length} shows=${shows.length} stations=${stations.length}`;
  if (CHECK) {
    console.log(`✓ catalog valid (${counts})`);
    return;
  }
  await writeFile(join(ROOT, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  console.log(`✓ wrote catalog.json (${counts})`);
}

main().catch(err => { console.error(err); process.exit(1); });
