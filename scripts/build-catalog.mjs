#!/usr/bin/env node
// Build catalog.json — the single published index SUB/WAVE stations fetch live
// (controller/src/community/registry.ts). Walks the five content dirs, parses
// each entry, and emits one JSON index at the repo root. Zero dependencies
// (Node built-ins only) so CI needs no install step.
//
// `apps` is the odd one out: it is NOT installable into a station — the
// controller's registry picks only skills/personas/shows/stations off this index
// and ignores the rest. Apps exist for the public /apps directory on the website
// (web/lib/apps.ts), which is why their validation lives here and nowhere else.
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

// A soul is character prose the station reads as description, not a prompt it
// forwards to a model — the submission form says so and every hand-authored
// entry follows it, but LLM-drafted submissions arrive as "You are a ..."
// almost every time. Anchored to the opening only: mid-body second person is
// ordinary prose ("talks to you like you're the only one listening") and must
// not trip this.
const SECOND_PERSON_RE = /^\s*(you\s+are|you're|act\s+as|roleplay\s+as|pretend\s+(you|to)\b)/i;
const SHOW_MOODS = ['energetic', 'calm', 'reflective', 'celebratory', 'romantic', 'spiritual', 'focus', 'workout', 'driving', 'cooking', 'rainy', 'sunny', 'night', 'morning', 'evening', 'festival', 'cultural'];
const SHOW_ENERGY = ['low', 'medium', 'high'];
// Scalar where its neighbours are lists — instrumental and vocal are mutually
// exclusive, and asking for both is asking for neither. '' = no constraint.
const SHOW_VOCALS = ['instrumental', 'vocal'];

// Apps are third-party clients + integrations built against a station's API.
// One bucket each; `integration` is deliberately a catch-all (MCP servers, Home
// Assistant, hardware, libraries) rather than several chips holding one entry,
// and stays last for that reason.
//
// `skin` is a player face for the web app rather than a standalone client.
// Skins are a compile-time registry of in-repo components with no runtime
// install path, so a listed skin is source an operator builds into their own
// deployment — a pointer, which is all this directory ever offers.
const APP_TYPES = ['mobile', 'web', 'desktop', 'terminal', 'bot', 'skin', 'integration'];

// App icons/screenshots are submitter-hosted URLs, so the host is a trust
// boundary: an arbitrary host means listener browsers fetching from anywhere and
// an image that can be swapped to anything after review. Restrict to GitHub-owned
// hosts, which is where a project's own assets already live. This list MUST stay
// in lockstep with web/next.config.js `images.remotePatterns` and the re-check in
// web/lib/apps.ts — the web tier renders these through next/image, which refuses
// any host not in remotePatterns.
const APP_IMAGE_HOSTS = ['raw.githubusercontent.com', 'user-images.githubusercontent.com', 'github.com'];
const MAX_PLATFORM_LEN = 32;
const MAX_PLATFORMS = 6;

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

// Warnings are advisory — they print but never fail the build. Reserved for
// house-style drift that a human should look at but that the station-side
// readers cope with fine, so a submission is never blocked on taste alone.
const warnings = [];
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

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
    if (SECOND_PERSON_RE.test(soul)) warn(where, 'soul opens like a system prompt — write it as third-person character prose (see personas/saffron-am)');
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
    const vocals = (data.vocals || '').trim();
    if (vocals && !SHOW_VOCALS.includes(vocals)) fail(where, `vocals "${vocals}" not in ${SHOW_VOCALS.join('|')}`);
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
      vocals: SHOW_VOCALS.includes(vocals) ? vocals : '',
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

// Apps validate harder than stations (which are name+url pass-through): `type`
// drives the directory's filter chips, and the image URLs are a trust boundary,
// so both fail the build rather than reaching the site.
function isHttpUrl(v) {
  try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}
function appImageUrl(v, field, where) {
  if (v == null || v === '') return undefined;
  const s = String(v).trim();
  let u;
  try { u = new URL(s); } catch { fail(where, `${field} "${s}" is not a valid URL`); return undefined; }
  if (u.protocol !== 'https:') { fail(where, `${field} must be https://`); return undefined; }
  // A /blob/ link renders an HTML page, not the image. Normalise it to the raw
  // host so a hand-written JSON doesn't ship a broken <img> to the site.
  const blob = s.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
  if (blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`;
  if (!APP_IMAGE_HOSTS.includes(u.host)) {
    fail(where, `${field} host "${u.host}" not allowed — use one of ${APP_IMAGE_HOSTS.join(', ')}`);
    return undefined;
  }
  return s;
}

async function buildApps() {
  const out = [];
  for (const file of await listFiles(join(ROOT, 'apps'), '.json')) {
    const slug = basename(file, '.json');
    const where = `apps/${file}`;
    if (!SLUG_RE.test(slug)) { fail(where, 'slug (filename) must match /^[a-z0-9][a-z0-9-]{0,48}$/'); continue; }
    let json;
    try { json = JSON.parse(await readFile(join(ROOT, 'apps', file), 'utf8')); }
    catch (e) { fail(where, `invalid JSON: ${e.message}`); continue; }
    if (!json || typeof json !== 'object' || Array.isArray(json)) { fail(where, 'must be a JSON object'); continue; }

    const name = String(json.name ?? '').trim();
    const url = String(json.url ?? '').trim();
    const type = String(json.type ?? '').trim();
    if (!name) fail(where, 'name is required');
    if (!url) fail(where, 'url is required');
    else if (!isHttpUrl(url)) fail(where, `url "${url}" must start with http:// or https://`);
    if (!type) fail(where, 'type is required');
    else if (!APP_TYPES.includes(type)) fail(where, `type "${type}" not in ${APP_TYPES.join('|')}`);

    const repo = json.repo ? String(json.repo).trim() : '';
    if (repo && !isHttpUrl(repo)) fail(where, `repo "${repo}" must start with http:// or https://`);

    const description = String(json.description ?? '').trim();
    if (description.length > 280) fail(where, `description must be <=280 chars (is ${description.length})`);

    const platforms = (Array.isArray(json.platforms) ? json.platforms : commaList(json.platforms))
      .map(p => String(p).trim()).filter(Boolean).map(p => p.slice(0, MAX_PLATFORM_LEN)).slice(0, MAX_PLATFORMS);

    out.push(clean({
      slug,
      name,
      url,
      type,
      description: description || undefined,
      author: json.author ? String(json.author).trim().slice(0, 60) : undefined,
      platforms: platforms.length ? platforms : undefined,
      repo: repo || undefined,
      icon: appImageUrl(json.icon, 'icon', where),
      screenshot: appImageUrl(json.screenshot, 'screenshot', where),
      featured: json.featured === true,
      submitted: json.submitted ? String(json.submitted).trim() : undefined,
    }));
  }
  return out;
}

async function main() {
  const [skills, personas, shows, stations, apps] = await Promise.all([
    buildSkills(), buildPersonas(), buildShows(), buildStations(), buildApps(),
  ]);
  if (errors.length) {
    console.error(`✖ ${errors.length} catalog problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  if (warnings.length) {
    console.warn(`⚠ ${warnings.length} style warning(s) — not blocking:`);
    for (const w of warnings) console.warn(`  - ${w}`);
  }
  const catalog = { version: 1, generatedAt: new Date().toISOString(), skills, personas, shows, stations, apps };
  const counts = `skills=${skills.length} personas=${personas.length} shows=${shows.length} stations=${stations.length} apps=${apps.length}`;
  if (CHECK) {
    console.log(`✓ catalog valid (${counts})`);
    return;
  }
  await writeFile(join(ROOT, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  console.log(`✓ wrote catalog.json (${counts})`);
}

main().catch(err => { console.error(err); process.exit(1); });
