# Add your app to the directory

This folder powers the public **[/apps](https://getsubwave.com/apps)** directory —
a listing of third-party apps and integrations built against SUB/WAVE stations.
Each app is **one JSON file** in this directory.

If you built a player, a bot, a TUI, an MCP server, a Home Assistant integration,
a browser extension, or anything else that talks to a SUB/WAVE station, it belongs
here.

## How to submit (the easy way — no fork)

Hit **"Submit an app"** on the [`/apps`](https://getsubwave.com/apps) page (or open
the [app form](https://github.com/getsubwave/community/issues/new?template=add-app.yml)
directly). Fill in the fields and submit — that's it. A bot turns your issue into a
one-file pull request, and a maintainer reviews and merges it. **You don't need to
fork the repo or write any JSON.** Your app appears on the directory on the next
site deploy. Edit the issue later and the PR updates itself automatically.

## How to submit (by hand)

Prefer to open the pull request yourself?

1. **Fork** this repo.
2. Add a file at `apps/<your-slug>.json` — the filename (minus `.json`) becomes the
   app's slug, so keep it short and kebab-case, e.g. `night-owl.json`.
3. Fill in the fields below and **open a pull request against `main`**.

One file per app keeps pull requests from colliding and makes each entry trivial to
review or revert.

## The fields

```json
{
  "name": "Night Owl",
  "url": "https://apps.apple.com/app/night-owl",
  "type": "mobile",
  "description": "A one-thumb SUB/WAVE player with a sleep timer and CarPlay.",
  "author": "@yourhandle",
  "platforms": ["iOS", "Android"],
  "repo": "https://github.com/yourhandle/night-owl",
  "icon": "https://raw.githubusercontent.com/yourhandle/night-owl/main/icon.png",
  "screenshot": "https://raw.githubusercontent.com/yourhandle/night-owl/main/shot.png"
}
```

| Field         | Required | Notes |
| ------------- | -------- | ----- |
| `name`        | **yes**  | Display name on the card. |
| `url`         | **yes**  | Where someone gets it — store listing, site, or repo. Must start with `http://` or `https://`. |
| `type`        | **yes**  | One of the six below. |
| `description` | no       | One or two sentences. Max 280 characters. |
| `author`      | no       | Your name or `@handle`. A leading `@` renders as a link to your GitHub profile. |
| `platforms`   | no       | Up to 6 short tags — `"iOS"`, `"Linux"`, `"Sonos"`, `"Home Assistant"`. Max 24 characters each. |
| `repo`        | no       | Source URL. Its presence is what puts a "source" link on your card. |
| `icon`        | no       | Square image URL. See **Images** below. |
| `screenshot`  | no       | Wide image URL. See **Images** below. |

`featured` and `submitted` are maintainer/bot fields — don't set them yourself.

### Types

| `type`        | What lands here |
| ------------- | --------------- |
| `mobile`      | iOS / Android / cross-platform handset apps |
| `web`         | Alternative web players, embeds, hosted front-ends |
| `desktop`     | macOS / Windows / Linux clients, menubar and tray apps |
| `terminal`    | TUIs and CLIs |
| `bot`         | Discord / Telegram / Slack / Matrix bots |
| `integration` | Everything else that wires a station into another system — MCP servers, Home Assistant, hardware builds, libraries and SDKs |

`integration` is deliberately broad. If your app doesn't obviously fit one of the
first five, it goes here.

### Images

Both `icon` and `screenshot` are optional, and cards render fine without them.

Image URLs must be `https://` on one of:

- `raw.githubusercontent.com`
- `user-images.githubusercontent.com`
- `github.com`

Anything else fails the build. This isn't arbitrary: the website renders these
through Next's image pipeline against a matching allowlist, so images are proxied
by the site rather than hot-linked — a visitor's browser never contacts your host
directly, and a listed image can't be quietly swapped for something else after
review. The simplest thing that works is to commit the image to your own repo and
link the `raw.githubusercontent.com` URL.

Icons are shown square; screenshots are shown wide (roughly 16:10).

## Listing rules

Apps are built and maintained by their authors, not by SUB/WAVE — being listed
here is not an endorsement or an audit. That said, maintainers apply a floor at
review:

- **It has to work.** The app must actually do something with a SUB/WAVE station.
- **No credential harvesting.** An app must not ask listeners for their station's
  admin username and password, and must not route those credentials through a
  third-party server. Talking to a station's public API is fine; asking someone to
  hand over the keys to their booth is not.
- **Say what it is.** Closed-source and paid apps are welcome. If your app costs
  money, or is closed-source, say so in the description. An entry with no `repo`
  and no disclosure will get a review comment asking for one.
- **No malware, no undisclosed telemetry, no ad injection** into the stream.

Spot something wrong with a listed app? Open a
[report](https://github.com/getsubwave/community/issues/new?template=report-app.yml).
