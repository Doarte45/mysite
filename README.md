# mysite — CV landing page

A single-page personal CV site with a cyber-networking visual theme — phosphor-accent network lines, node labels, monospaced metadata, and a light/dark theme toggle. Content is driven by a typed `cv` object so edits flow through one source of truth.

Built with **Astro**, **TypeScript (`strictest`)**, and **Tailwind v4**. Fonts are loaded from Google Fonts (Space Grotesk, Space Mono).

---

## Requirements

- Node.js 22.12 or newer
- npm (comes with Node)

## Running the dev server

From the project root:

```sh
npm install        # first time only
npm run dev        # starts dev server at http://localhost:4321
```

The dev server hot-reloads on file changes.

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
├── assets/
│   └── me.jpg                    # portrait image (optimized via astro:assets)
├── data/
│   └── cv.ts                     # shared typed CV content — single source of truth
├── layouts/
│   └── BaseHead.astro            # shared <head> / SEO / OG tags
├── pages/
│   └── index.astro               # the landing page
└── styles/
    └── global.css                # Tailwind entry
```

Edit content in `src/data/cv.ts` and the page updates. The `CV` interface enforces the shape of every field rendered by the page.
