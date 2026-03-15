# Frontend — Wayfinder G1

Web interface for the autonomous AI historian robot. See [`/docs/PRD.md`](../docs/PRD.md) for full product context.

## Stack

- **Next.js 16** — App Router, React Server Components
- **React 19** / **TypeScript 5**
- **Tailwind CSS v4** — OKLCH design tokens, light/dark via CSS variables
- **shadcn/ui** — component library (style: `base-nova`, base color: `neutral`)
- **axios** — HTTP client for FastAPI backend
- **react-hook-form** + **zod** — form handling and validation
- **sonner** — toast notifications
- **next-themes** — dark mode
- **lucide-react** — icons

## Structure

```
app/
  layout.tsx         # Root layout — Geist Sans/Mono fonts, lang="en"
  page.tsx           # Home page
  globals.css        # Tailwind v4 imports + CSS variable theme
components/
  ui/                # shadcn/ui primitives (button, input, etc.)
lib/
  utils.ts           # cn() and shared utilities
hooks/               # Custom React hooks
```

Path alias: `@/` maps to the repo root (`./`). Add new shadcn components via `npx shadcn@latest add <component>`.

## API

Backend runs at `http://localhost:8000`. All API calls go through axios to the FastAPI server.
Auth is Bearer JWT — store the token returned by `POST /api/auth/login` and attach it as `Authorization: Bearer <token>`.

## Dev

```bash
npm run dev    # http://localhost:3000
npm run build
npm run lint
```
