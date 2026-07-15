# FanPulse — GenAI Operations Layer for FIFA World Cup 2026 Stadiums

**Challenge 4 — Smart Stadiums & Tournament Operations**

FanPulse is a dynamic, context-aware assistant for stadium operations. It reads live signals — gate crowd density, weather, and kickoff countdown — across a venue, and reasons over them in real time to answer fans, volunteers, and control-room staff in their own language, before problems peak rather than after.

**Live demo:** _add your deployed GitHub Pages link here_
**Repo:** _add your public repo link here_

---

## What it demonstrates

| Challenge expectation | How FanPulse meets it |
|---|---|
| Ability to build a smart, dynamic assistant | The assistant's answer changes every time you ask it something — it's driven by a live-ticking simulation of gate density, weather, and time-to-kickoff, not fixed scripted replies. |
| Logical decision making based on user context | A rules-based reasoning engine detects intent (navigation, accessibility, transport, safety, weather) from free text, pulls the relevant live signal (e.g. the specific gate you mention, or the busiest gate if you don't), and composes a response that changes its recommendation based on real thresholds (e.g. reroutes you if a gate crosses 65% density). |
| Practical, real-world usability | Multilingual out of the box (English, Español, हिन्दी, العربية, Français, Português), quick-prompt chips for common fan questions, a live "stadium pulse" visualization, and real GPS-based directions to any gate. |
| Mobile-first, installable on Android & iOS | Fully responsive layout with a bottom app-nav on phones, plus a PWA manifest + service worker so it can be installed to the home screen like a native app on both platforms — no App Store/Play Store build required for this prototype. |

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
fanpulse/
├─ index.html          the entire app: markup, CSS, and JS in one file
├─ manifest.json        PWA metadata (name, icons, colors) for "Add to Home Screen"
├─ sw.js                 service worker — caches the app shell for offline/flaky-network use
├─ icons/                 app icons (192, 512, maskable, apple-touch, favicon)
└─ README.md

Browser
 ├─ Simulated live signal layer (JS)
 │   gate density (5 gates, each with lat/lng) · weather · kickoff countdown
 │   ticks every 2.5s, with occasional random "surge" events
 │
 ├─ Reasoning engine (JS)
 │   detectIntent(text) → navigation | accessibility | transport | safety | weather | general
 │   findGateFromText(text) → pulls a specific gate if mentioned, else the busiest gate
 │   generateResponse(intent, language, liveContext) → composed, threshold-aware reply
 │
 ├─ GPS / directions layer (JS)
 │   navigator.geolocation → user's live lat/lng (stays client-side)
 │   haversine distance + bearing → plain-language distance/direction/walk-time
 │   Leaflet + OpenStreetMap tiles → visual route preview
 │   Google Maps / Apple Maps deep links → handoff to native turn-by-turn
 │
 └─ UI
     canvas-based live "pulse monitor" (signature visual)
     chat assistant with quick-prompt chips + free-text input + "show on map" links
     directions panel (gate picker, GPS button, map, maps deep-links)
     signals panel showing the raw inputs the assistant is reading
     bottom app-nav on mobile + installable PWA shell (manifest + service worker)
```

### Why a rules-based engine and not a live LLM API call in this demo

A public repo (required by the submission rules) can't safely hold an API key, and browser-side calls to a hosted LLM would expose it to anyone viewing the deployed page's source. So this prototype's decision layer is a deterministic reasoning engine that mirrors what a GenAI-backed system would do — same inputs (intent + live context), same kind of threshold-aware, natural-language output.

**To wire in a real GenAI backend for production:**
1. Move `generateResponse()` server-side (e.g. a small serverless function).
2. Replace the template lookup with a call to the Claude API, passing the same live context object (`gate`, `density`, `weather`, `kickoff`, `language`) as structured input in the prompt, plus the user's raw question.
3. Keep the same JSON contract the front end already expects, so the UI doesn't need to change.

This keeps the repo small, secure, and deployable within the hackathon's rules, while the code structure shows exactly where the GenAI call belongs.

---

## Running locally

No build tools needed — it's a single HTML file.

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just double-click `index.html`.

---

## Deploying to GitHub Pages

1. Push this whole folder to GitHub (public, single branch — e.g. `main`), keeping `index.html`, `manifest.json`, `sw.js`, and the `icons/` folder all at the repo root together (relative paths depend on this).
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save — GitHub gives you a URL like `https://<username>.github.io/<repo-name>/` within a minute or two.
5. Open that URL on a phone to test "Add to Home Screen" (Android) or the Share → Add to Home Screen flow (iOS), and test the GPS button — your browser will prompt for location permission on first tap.

**Note:** GPS and "Install app" both require **HTTPS** — GitHub Pages serves everything over HTTPS by default, so this works out of the box once deployed. Testing locally over plain `http://localhost` also works for GPS (browsers allow geolocation on localhost), but service-worker install prompts are more reliable on the deployed HTTPS URL.

---

## Tech stack

- Vanilla HTML / CSS / JavaScript — no frameworks, no build step
- Canvas API for the live pulse visualization
- Browser Geolocation API for GPS directions (no key, no server, stays on-device)
- Leaflet + OpenStreetMap tiles for the route preview map (no API key required)
- Google Maps / Apple Maps URL scheme deep links for turn-by-turn handoff (no API key required)
- Web App Manifest + Service Worker for installable, offline-tolerant PWA behavior on Android and iOS
- Google Fonts (IBM Plex Sans, IBM Plex Sans Condensed, IBM Plex Mono) loaded via CDN

## Roadmap beyond this prototype

- Swap the simulated signal layer for real turnstile/CCTV/IoT feeds
- Move reasoning server-side with a real Claude API call (see architecture note above)
- Add crowd-forecast module (predict density 15–30 min ahead, not just read it live)
- Replace straight-line GPS routing with indoor pathing (stadium concourse graph) for turn-by-turn inside the venue, not just to the gate
- Add speech-to-speech translation for volunteer-fan conversations
- Wrap the PWA in Capacitor/React Native if a native App Store / Play Store listing is needed later
- Human-in-the-loop approval flow for any safety-critical recommendation (gate closures, evacuations)
