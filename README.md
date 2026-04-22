# mysite — CV landing page

TypeScript CV site, presented in 5 distinct visual interpretations. A floating switcher in the bottom-right cycles between them.

- `/v1` — Editorial (magazine serif, cream/navy/gold)
- `/v2` — Brutalist (heavy borders, hot pink, grain)
- `/v3` — Terminal (phosphor green on black, scanlines)
- `/v4` — Swiss (modernist grid, massive type, red accent)
- `/v5` — Art Deco (emerald/gold/ivory, geometric ornaments)

`/` redirects to `/v1`.

Built with **Astro**, **TypeScript (`strictest`)**, and **Tailwind v4**. Fonts are self-hosted via `@fontsource*` — no external requests at runtime.

---

## Requirements

- Node.js 20 or newer
- npm (comes with Node)

## Running the dev server

From the project root:

```sh
npm install        # first time only
npm run dev        # starts dev server at http://localhost:4321
```

The dev server hot-reloads on file changes. Open any of `/`, `/v1`, `/v2`, `/v3`, `/v4`, `/v5`.

### Stopping the dev server

In the same terminal where it's running:

- Press **`q`** then Enter — Astro's built-in shortcut, or
- Press **`Ctrl+C`** — standard interrupt.

### Port 4321 already in use?

If something (a crashed previous run, another project) is still holding the port, Astro will fall back to 4322. To free 4321, find and kill the process:

**git-bash / MSYS:**
```sh
netstat -ano | grep :4321
taskkill //PID <PID> //F
```

**PowerShell:**
```powershell
Get-NetTCPConnection -LocalPort 4321 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

## Other commands

| Command | What it does |
| :-- | :-- |
| `npm run build` | Produce the production static site in `./dist/` |
| `npm run preview` | Serve the built `dist/` locally to check before deploying |
| `npx astro check` | Run the TypeScript / Astro diagnostics |

## Project layout

```
src/
├── data/
│   └── cv.ts                    # shared typed CV content — single source of truth
├── components/
│   └── VersionSwitcher.astro    # floating bottom-right switcher
├── layouts/
│   └── BaseHead.astro           # shared <head> / SEO / OG tags
├── pages/
│   ├── index.astro              # redirects to /v1
│   ├── v1.astro                 # Editorial
│   ├── v2.astro                 # Brutalist
│   ├── v3.astro                 # Terminal
│   ├── v4.astro                 # Swiss
│   └── v5.astro                 # Art Deco
└── styles/
    └── global.css               # Tailwind entry
```

All 5 versions consume the same `cv` object from `src/data/cv.ts`. Edit content there once and every version updates. The `CV` interface enforces that every field is rendered by every version.
