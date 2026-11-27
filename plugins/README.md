# List your music-source plugin

This folder powers the **[/plugins](https://getsubwave.com/plugins)** directory, which every
SUB/WAVE station also serves itself. A music-source plugin lets a station play from a server or
library it doesn't support out of the box: Emby, Funkwhale, a cloud drive, a plain folder of
files. Each listed plugin is **one JSON file** here.

How plugins work, and how to write one, is in the
[plugin guide](https://github.com/perminder-klair/subwave/blob/develop/docs/music-source-plugins.md).

## What a listing means

A plugin is code that runs inside the router of every station that installs it, with network
access. So a listing is a **review of the code**, not just of this file: a maintainer reads the
plugin at the version submitted before merging. A listing isn't an audit, and it doesn't cover
later versions. Every card on the directory says so, and links the source rather than offering an
install button.

## How to submit (the easy way — no fork)

1. Run the conformance kit from a SUB/WAVE checkout against a real server or library, with
   `--json`:

   ```bash
   npm --prefix router install
   npm --prefix router run conformance -- /path/to/your-plugin --config key=value --json
   ```

   It has to pass. A report with a failed check can't be listed.
2. Open the [plugin form](https://github.com/getsubwave/community/issues/new?template=add-plugin.yml)
   (or **Submit a plugin** on `/plugins`), paste your `subwave-source.json` and the kit's JSON
   output, and fill in the rest.

A bot turns the issue into a one-file pull request. The plugin's name, label and API version come
from your manifest and the counts from your report, so nothing on the card can drift from what you
ran. Edit the issue and the PR updates itself.

## How to submit (by hand)

Fork the repo, add `plugins/<name>.json`, where `<name>` is your manifest's `name`, and open a pull
request against `main`. Paste the conformance report in the PR description.
`node scripts/build-catalog.mjs --check` validates the entry locally.

```json
{
  "name": "Music folder",
  "plugin": "folder",
  "connectsTo": "A folder of audio files",
  "repo": "https://github.com/perminder-klair/subwave/tree/develop/docs/examples/sources/folder",
  "apiVersion": 1,
  "description": "Plays audio files straight from a folder laid out as Artist/Album/NN Title.ext.",
  "author": "@yourhandle",
  "checkedWith": "1.35.0",
  "conformance": { "pass": 15, "warn": 2, "fail": 0, "skip": 6 },
  "hostFiles": true
}
```

| Field         | Required | Notes |
| ------------- | -------- | ----- |
| `name`        | **yes**  | The manifest `label`: the name on the card. Max 60 characters. |
| `plugin`      | **yes**  | The manifest `name`. Must equal the filename, match `^[a-z][a-z0-9-]{1,31}$`, and not be a built-in (`navidrome`, `jellyfin`, `plex`, `mock`). It's the folder the plugin installs into. |
| `connectsTo`  | **yes**  | What it plays from, in a few words: "Plugs into …" on the card. Max 60 characters. |
| `repo`        | **yes**  | The plugin's source, `https://`. Point at the folder if it's part of a bigger repo. |
| `apiVersion`  | **yes**  | The manifest `apiVersion`. A station loads only plugins built for its own. |
| `conformance` | **yes**  | `{ pass, warn, fail, skip }` counted from the kit's `--json` report. `fail` must be 0. |
| `description` | no       | One or two sentences. Max 280 characters. |
| `author`      | no       | Your name or `@handle`. A leading `@` links to your GitHub profile. |
| `checkedWith` | no       | The SUB/WAVE version you ran the kit with, like `1.35.0`. |
| `hostFiles`   | no       | `true` if it reads files on the host, so operators must mount a folder into the router. |

`submitted` is a bot/maintainer field. Don't set it yourself.

## For reviewers

Read the code at the linked version before merging:

- It talks only to what `connectsTo` says: no other hosts, no telemetry.
- It downloads and runs no further code (no `eval`, `Function`, `child_process`, or dynamic
  `import()` of a URL).
- It reads files only under its configured path (if `hostFiles`) and writes only under
  `ctx.dataDir`.
- The manifest in the repo matches the entry (`plugin`, `apiVersion`).
- Its README says how to install it and what to mount.

An update to a listed plugin (a new version, a new `checkedWith`) is a fresh review: edit the file
in a PR with the new conformance report.

## Reporting a plugin

Use the [report form](https://github.com/getsubwave/community/issues/new?template=report-plugin.yml).
If you think a plugin is doing something harmful, remove it from your station's `router/plugins/`
folder first.
