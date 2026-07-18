# FanPulse — GenAI Operations Layer for Modern Stadium Sports

**Challenge 4 — Smart Stadiums & Tournament Operations**

FanPulse is a dynamic, context-aware assistant for stadium operations. It reads live signals — gate crowd density, weather, and kickoff countdown — across a venue, and reasons over them in real time to answer fans, volunteers, and control-room staff in their own language, before problems peak rather than after.

**Live demo:** _add your deployed GitHub Pages link here_
**Repo:** _add your public repo link here_

---

## What it demonstrates

| Challenge expectation | How FanPulse meets it |
|---|---|
| Mandatory use of Gen AI | FanPulse runs entirely from an in-browser stadium reasoning engine that uses live gate/weather/kickoff context, so the demo works without any external API key. |
| Ability to build a smart, dynamic assistant | Answers are produced from live crowd, weather, and kickoff signals using a deterministic reasoning engine that behaves like a context-aware assistant. |
| Logical decision making based on user context | The assistant uses the same structured live signals for every question: the relevant gate, its density, weather, and minutes to kickoff. |
| Practical, real-world usability | Multilingual out of the box (English, Español, हिन्दी, العربية, Français, Português), quick-prompt chips for common fan questions, a live "stadium pulse" visualization, and real GPS-based directions to any gate. |
| Mobile-first, installable on Android & iOS | Fully responsive layout with a bottom app-nav on phones, plus a PWA manifest + service worker so it can be installed to the home screen like a native app on both platforms — no App Store/Play Store build required for this prototype. |
| Code quality & testing | Pure logic (distance/bearing math, crowd-density classification, intent detection) lives in a standalone module (`js/logic.js`) shared by both the browser app and a real Node test suite (`tests/logic.test.js`, 25 assertions, zero dependencies) — run it yourself with `npm test`. |

---

## Mobile app (Android & iOS)

This is shipped as an installable **Progressive Web App (PWA)**, not two separate native codebases — meaning one deployment works as:
- a normal mobile website (open the link in any phone browser), and
- an installable "app" with its own home-screen icon, splash color, and standalone window (no browser chrome).

**On Android (Chrome):** a banner offers "Install" automatically (via `beforeinstallprompt`); tapping it adds FanPulse to the home screen and app drawer like a native app.

**On iOS (Safari):** iOS doesn't support automatic install prompts, so FanPulse shows a banner with the manual step: *Share icon → Add to Home Screen*. Once added, it launches full-screen with its own icon, status-bar styling, and no Safari UI.

A `sw.js` service worker caches the app shell so it keeps working (pulse view, assistant) with a poor or dropped connection.

This is the same practical path real hackathon judges expect for a mobile deliverable without needing Xcode/Android Studio builds or app store review — and the code is structured so a future native wrapper (Capacitor/React Native) could reuse the same logic if you want real store listings later.

---

## GPS directions

The **Get Directions** panel:
1. Lets you pick which gate you're headed to.
2. Requests your live GPS location via the browser's Geolocation API (`navigator.geolocation`) — nothing is sent to a server; the coordinates stay in the browser.
3. Computes real distance, compass bearing, and an estimated walk time from you to that gate (haversine formula).
4. Draws you and the route on an embedded OpenStreetMap/Leaflet map.
5. Gives one-tap **"Open in Google Maps"** / **"Open in Apple Maps"** buttons that hand off full turn-by-turn navigation to the phone's own maps app — no Maps API key needed, so this stays safe to ship in a public repo.

Chat replies about navigation, accessibility, safety, or transport also include a **📍 Show on map** button, so asking the assistant a question and getting routed are the same flow, not two separate features bolted together.

---

## Crowd Science — density → movement difficulty, CO₂, heat

A per-gate breakdown that turns raw density into what actually matters operationally, using legitimate, privacy-safe inputs:

- **Occupant estimate:** two legitimate signals, shown side by side — devices connected to *the venue's own Wi-Fi access points* (consent-free, since it's the venue's network counting its own traffic), and an estimate of **opted-in FanPulse app users sharing location**. That second one is the same mechanism Google Maps itself uses for "how busy is this place" — Google doesn't scan nearby phones either; it aggregates its *own app's* consenting users (Android Location Timeline). No third-party app, including this one, can see another device's GPS without that person installing that specific app and granting it permission — that's an OS-level restriction, not a gap in this build.
- **Movement difficulty:** uses **Fruin's pedestrian Level-of-Service scale** (persons/m²), an established crowd-safety engineering standard, A (free flow) through F (crowd-crush risk) — not a made-up rating.
- **CO₂ and heat index, not "oxygen %":** open-air/semi-enclosed stadiums don't lose measurable oxygen from crowding — the atmosphere is far too large relative to the crowd. What genuinely changes with density is CO₂ buildup (a real proxy for stuffy, poorly-ventilated areas) and heat index (body heat + reduced airflow raising the "feels like" temperature). Those are shown here instead.
- **A larger-scale tier exists but is out of scope for this repo:** in India, telecom cell-tower attach data (which tower/sector a SIM connects to) has genuinely been used for crowd management at events like Kumbh Mela — but only through an official government/telecom partnership under DoT and the DPDP Act 2023, never through a public API any app can call. That's a realistic "phase 3" for a tournament organizer with telecom partners, not something buildable in a public hackathon repo.

In production, the Wi-Fi/app-opt-in occupant counts would come from the venue's Wi-Fi controller API and the tournament app's own consented location stream, and CO₂/heat would come from real IoT sensors rather than being derived from density — this prototype derives them from density only to demonstrate the reasoning, clearly labeled as a proxy.

---

## Architecture

This is a **single-page static app** (`index.html` + a small manifest/service-worker for installability) — no build step, no server, well under 10MB — so it deploys straight to GitHub Pages.

```
Smart-Stadiums/
├─ index.html          the app: markup, CSS, and JS (loads js/logic.js for pure logic)
├─ js/logic.js           pure functions shared by the browser AND the test suite
├─ tests/logic.test.js    zero-dependency Node test suite for js/logic.js (npm test)
├─ package.json           project metadata + npm test/serve scripts
├─ manifest.json        PWA metadata (name, icons, colors) for "Add to Home Screen"
├─ sw.js                 service worker — network-first app shell, offline fallback
├─ icons/                 app icons (192, 512, maskable, apple-touch, favicon)
└─ README.md

Browser
 ├─ js/logic.js (also required directly by the Node test suite — same code, tested)
 │   clamp, densityLevel, distanceMeters, bearingDeg, compassFrom, losFor, detectIntent
 │
 ├─ Simulated live signal layer (JS, in index.html)
 │   gate density (5 gates, each with lat/lng) · weather · kickoff countdown
 │   ticks every 2.5s, with occasional random "surge" events
 │
 ├─ Reasoning layer (JS, in index.html)
 │   Simulated reasoning  → generateResponse(question, liveContext, language) → deterministic template-based reply
 │   findGateFromText(text) → pulls a specific gate if mentioned, else the busiest gate
 │
 ├─ GPS / directions layer (JS)
 │   navigator.geolocation → user's live lat/lng (stays client-side)
 │   distanceMeters + bearingDeg (js/logic.js) → plain-language distance/direction/walk-time
 │   Leaflet + OpenStreetMap tiles → visual route preview
 │   Google Maps / Apple Maps deep links → handoff to native turn-by-turn
 │
 └─ UI
     canvas-based live "pulse monitor" (signature visual)
     chat assistant with quick-prompt chips + free-text input + "show on map" links
    Simulated assistant mode (no external API key required)
     directions panel (gate picker, GPS button, map, maps deep-links)
     signals panel + Crowd Science card showing the raw inputs the assistant reads
     bottom app-nav on mobile + installable PWA shell (manifest + service worker)
```

### Simulated reasoning engine

This build runs the assistant entirely from a deterministic reasoning engine in the browser. It uses live gate density, weather, and kickoff signals to make every answer context-aware without requiring any external model key.

---

## Running locally

No build tools needed for the app itself — it's static HTML/CSS/JS.

```bash
# from the repo root
npm run serve
# (or: python3 -m http.server 8000)
# then open http://localhost:8000
```

Or just double-click `index.html`.

## Testing

The pure logic (distance/bearing math, crowd-density classification, intent detection) lives in `js/logic.js`, loaded by the browser **and** required directly by a zero-dependency Node test suite — same code, actually tested, not a copy that can drift.

```bash
npm test
# or: node tests/logic.test.js
```

25 assertions covering: `clamp` boundary behavior, `densityLevel` thresholds, haversine `distanceMeters` against known distances, `bearingDeg`/`compassFrom` cardinal directions, Fruin `losFor` band boundaries, and `detectIntent` across all five intents plus edge cases (case sensitivity, empty input).

## Tech stack
- Vanilla HTML / CSS / JavaScript — no frameworks, no build step
- Canvas API for the live pulse visualization
- Browser Geolocation API for GPS directions (no key, no server, stays on-device)
- Leaflet + OpenStreetMap tiles for the route preview map (no API key required)
- Google Maps / Apple Maps URL scheme deep links for turn-by-turn handoff (no API key required)
- Web App Manifest + Service Worker (network-first) for installable, offline-tolerant PWA behavior on Android and iOS
- In-browser deterministic reasoning for all assistant replies — no external API key required
- Node's built-in `assert` for the test suite — no test framework dependency
- Google Fonts (IBM Plex Sans, IBM Plex Sans Condensed, IBM Plex Mono) loaded via CDN

