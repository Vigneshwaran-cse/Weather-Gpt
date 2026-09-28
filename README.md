<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/bb9488d1-8d6d-4b37-8abe-113b9d3b5031

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## WeatherGPT – Conversational Weather Intelligence (SIH 2026)
Ask -> location -> forecast (Open-Meteo NWP) + IMD warning -> hazard engine -> Gemini explanation -> WeatherIntelligenceBrief -> UI/voice.
- New services: `services/{imdService,marineService,climateService,hazardEngine,intelligenceEngine,cacheService,briefTypes}.ts`
- New endpoints: `/api/location/search`, `/api/warnings`, `/api/marine`, `/api/climate`, `POST /api/intelligence`, `/api/health`, `/health` (plus existing `/api/weather`, `/api/chat`)
- UI: `src/components/IntelligenceDashboard.tsx` (Disaster Mode, Data Saver, offline cache, voice, Farming/Marine/Climate contexts). Legacy chat via "Open full chat".
- Gemini key stays server-side. No database (localStorage + in-memory TTL cache).
- Run: `npm install && npm run build && npm start` (copy `.env.example` to `.env` first and set `GEMINI_API_KEY``. The unused FastAPI backend was moved to `archive/backend-fastapi-unused`.
- IMD warnings: configure `IMD_WARNINGS_URL`, `IMD_DISTRICT_MAP`, and `IMD_API_KEY` in `.env`. The official endpoint requires the district `obj_id`; Nagercoil is covered by Kanyakumari, whose verified official `Obj_id` is `30`. The built-in alias handles Nagercoil, or you can set `IMD_DISTRICT_MAP='{"nagercoil":"30","kanyakumari":"30"}'` and add other verified districts. `IMD_API_KEY` must be supplied if the official endpoint returns `401`. Test it with `/api/warnings?name=Nagercoil&lat=8.18&lon=77.43`. If IMD is unreachable, unauthorized, or the payload is not recognised, the UI shows `IMD unavailable` and continues with Open-Meteo data. No warning is ever invented, and IMD warnings remain separate from calculated forecast risks.
- Disaster Mode activates only from a real IMD Orange/Red warning or a High/Extreme result from the hazard engine.
- Data states: LIVE / RECENT / CACHED / STALE / OFFLINE. Data Saver skips automatic AI calls, climate loading and animations.

### Vercel deployment
Import this repository into Vercel with `proj` as the project root if the repository root contains this folder. Vercel uses `vercel.json` to build the Vite frontend and route `/api/*` to the Express serverless function. Add `GEMINI_API_KEY`, `IMD_API_KEY`, and (when overriding the verified defaults) `IMD_DISTRICT_MAP` as Vercel Environment Variables for Preview and Production. Never put these secrets in `VITE_*` variables.
