# Timers

Lightweight multi-timer to track how much time goes into each project. Group timers (e.g. *Coding*, *Chores*), start and pause them, adjust time by hand, and see where your day went.

> **Status: v0, in progress.** Web app first; v1 will ship as an Ubuntu desktop app with Tauri.

## Principles

- **Never lose time.** Time is derived from session timestamps, so reloading, closing the tab or shutting down doesn't lose a running timer.
- **Light.** No backend, no account; data stays in your browser.
- **Honest history.** Every play/pause is a session and every manual change is a separate adjustment.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Zustand · Vitest

## Development

```bash
npm install
npm run dev     # http://localhost:5173
npm run check   # typecheck + lint + tests
npm run build
```

## Docs

- [Product](docs/product.md)
- [Architecture & data model](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
