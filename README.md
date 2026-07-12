# SUB/WAVE Community Catalog

The community exchange for **[SUB/WAVE](https://github.com/perminder-klair/subwave)** — the
personal internet radio station with an AI DJ. This repo holds the community-contributed
**skills**, **DJ personas**, **shows**, and the public **station directory**. Every running
SUB/WAVE station fetches this catalog **live**, so anything merged here shows up in every
station's admin panel — and on [getsubwave.com](https://getsubwave.com) — without waiting for a
software release.

## What's here

| Folder | What it is | Installs as |
|---|---|---|
| [`skills/`](skills/) | Between-track segment briefs (prompt-only, data-only) | a DJ skill in `/admin/skills` → Community |
| [`personas/`](personas/) | DJ characters — the "soul" + talk/tone knobs | a roster persona in `/admin/personas` → Community |
| [`shows/`](shows/) | Show templates — a brief + music-steering filters | a show in `/admin/shows` → Community |
| [`stations/`](stations/) | The public map of live SUB/WAVE stations | a pin on [/stations](https://getsubwave.com/stations) |

Each entry is **one file (or folder)** so contributions never collide on merge.

## How stations consume it

A CI job ([`build-catalog.yml`](.github/workflows/build-catalog.yml)) compiles every entry into a
single **[`catalog.json`](catalog.json)** at the repo root on each push to `main`. Stations fetch
it over the jsDelivr CDN:

```
https://cdn.jsdelivr.net/gh/getsubwave/subwave-community@main/catalog.json
```

The controller memoises it (~30 min TTL, refreshable from the admin UI) and degrades to an empty
catalog if the fetch fails — a station never stops broadcasting because the catalog is unreachable.
An operator can point their station at a fork or mirror with `COMMUNITY_CATALOG_URL`.

**Don't edit `catalog.json` by hand** — it's generated. Edit the source files under `skills/`,
`personas/`, `shows/`, `stations/` and the workflow rebuilds it.

## Contributing

The easy way (no fork, no YAML): open one of the issue forms and a bot turns it into a one-file PR
for a maintainer to review.

- 🎛️ [Add a skill](https://github.com/getsubwave/subwave-community/issues/new?template=add-skill.yml)
- 🎙️ [Add a persona](https://github.com/getsubwave/subwave-community/issues/new?template=add-persona.yml)
- 📻 [Add a show](https://github.com/getsubwave/subwave-community/issues/new?template=add-show.yml)
- 🗺️ [Add your station](https://github.com/getsubwave/subwave-community/issues/new?template=add-station.yml)

Prefer to open the PR yourself? See **[CONTRIBUTING.md](CONTRIBUTING.md)** for each type's schema
and validation rules. `node scripts/build-catalog.mjs --check` validates your entry locally.

## License

Community submissions are contributed for use within SUB/WAVE. See the main project for license
details.
