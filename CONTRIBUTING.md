# Contributing to the SUB/WAVE Community Catalog

Two ways to contribute — pick either:

1. **Issue form (recommended, no fork).** Open the matching form from the
   [README](README.md#contributing); a bot opens a one-file PR for you.
2. **By hand.** Fork, add your one file/folder in the right directory, run
   `node scripts/build-catalog.mjs --check`, and open a PR against `main`.

Every entry's folder name (or filename) is its **slug**: lowercase, starts with a letter or digit,
then letters/digits/hyphens, ≤49 chars (`/^[a-z0-9][a-z0-9-]{0,48}$/`). The frontmatter `name:`
must equal the slug. A maintainer reviews all submissions; the `catalog.json` index rebuilds
automatically on merge.

Provenance (`submittedBy`, `dateAdded`, `dateModified`) is stamped by the submission bot — leave it
out when hand-authoring and the maintainer will add it.

---

## Skills — `skills/<slug>/SKILL.md`

A between-track segment brief the DJ reads from. **Prompt-only and data-only** — skills in this
catalog never carry code (no `tool.mjs`). The body is the brief.

```markdown
---
name: <slug>
label: Commute check-in          # human label (optional; defaults to the slug)
cooldown: 2h                     # min gap between airings: "90m" | "6h" | "2d" | "45s" | "45" (bare = minutes)
context: clock, time             # optional "right now" fields the segment may mention:
                                 #   date, clock, time, weather, festival, show, listeners
window: any                      # "any" (default) or "commute"
---
Say one short line acknowledging that some listeners are probably in transit right now…
```

The slug must not shadow a built-in/reserved kind: `link`, `dj-speak`, `announcement`,
`station-id`, `hourly`, `hourly-check`, `album-anniversary`, `curiosity`, `library-deep-cut`,
`news`, `now-playing-dig`, `weather`, `web-search`.

## Personas — `personas/<slug>/PERSONA.md`

A DJ character. The body is the **soul** (the character prose, ≤1000 chars). Station-specific
fields (voice, avatar, which skills it runs) are set by the operator after install — don't include
them.

```markdown
---
name: <slug>
displayName: The Archivist       # on-air name, ≤40 chars (required)
tagline: Liner notes and why this take.   # ≤80 chars (optional)
frequency: quiet                 # silent | quiet | moderate | chatty | aggressive
scriptLength: extended           # one-liner | concise | extended | storyteller
djMode: false                    # true = chattier + transition FX
humour: 3                        # tone dials 0–10 (5 = neutral); also localColour, warmth
language: English                # free-text on-air language, ≤60 chars (optional)
---
A crate-digger who treats every record like a found document…
```

## Shows — `shows/<slug>/SHOW.md`

A **show template**: a standing brief + music-steering filters + mode flags. A show carries only
what's portable — the host persona, guests, theme, playlist anchors, and the weekly schedule slot
are all bound by the operator after install. The body is the **topic** brief (≤1000 chars).

```markdown
---
name: <slug>
displayName: Late Feels          # show name, 1–60 chars (required)
moods: reflective, night         # each from the mood vocab below, max 6 (optional)
genres: shoegaze, dream pop      # free text, ≤64 chars each, max 6 (optional)
eras: 1988-1999                  # comma list of YYYY or YYYY-YYYY windows, years 1900–2100 (optional)
energies: low                    # low | medium | high, max 6 (optional)
filtersStrict: false             # true = hard filter instead of a soft lean
programme: false                 # true = produced-episode mode (intro / feature / outro)
banter: false                    # true = scripted multi-voice breaks (needs guests, added on install)
segmentSkill: library-deep-cut   # optional skill kind to pin the programme feature to
---
A slow midnight drift for the people still awake…
```

**Mood vocabulary:** `energetic, calm, reflective, celebratory, romantic, spiritual, focus,
workout, driving, cooking, rainy, sunny, night, morning, evening, festival, cultural`.
**Energy vocabulary:** `low, medium, high`.

## Stations — `stations/<slug>.json`

One JSON object per station for the public directory. `name` and `url` are required.

```json
{
  "name": "Klair Radio",
  "url": "https://radio.klair.co",
  "operator": "@perminder-klair",
  "location": "Punjab, India",
  "country": "India",
  "lat": 31.1471,
  "lon": 75.3412,
  "genre": "punjabi",
  "description": "Punjabi all day — an AI DJ picking the tracks and talking between them.",
  "featured": false
}
```
