# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is **PoopProfit.com** — a purely static website (vanilla HTML/CSS/JS) with no build tools, no package manager, no backend, and no database. All user data is stored in the browser's `localStorage`.

### Running the dev server

Serve the site with any static HTTP server:

```bash
python3 -m http.server 8080 --directory /workspace
```

Then open `http://localhost:8080/index.html` in Chrome.

### Key caveats

- **`<base href>` tags**: Several HTML files (`index.html`, `interface.html`, `guestmodeindex.html`, etc.) contain `<base href="https://www.poopprofit.com/">` or similar. This causes form submissions and relative links to redirect to the production domain rather than localhost. To test locally, navigate directly to specific pages (e.g. `http://localhost:8080/interface.html`) rather than using in-page links/form redirects.
- **No build/lint/test tooling**: There is no `package.json`, no linter, no test framework, and no CI pipeline. "Lint" and "test" are not applicable commands for this codebase.
- **CDN dependencies**: Chart.js, Font Awesome, and Google Fonts are loaded from CDNs. Internet access is required for full functionality (charts, icons, fonts).
- **No authentication backend**: Registration/login is client-side only using `localStorage`. Passwords are stored in plain text in the browser.

### File structure

| File | Purpose |
|---|---|
| `index.html` | Landing page with login/registration |
| `guestmodeindex.html` | Alternative landing with guest mode |
| `interface.html` | Main app (calculator, stats, games, shop tabs) |
| `core-preview.html` | Redesigned version of main interface |
| `loggedout.html` | Logout confirmation page |
| `TurdRaceGame.html` | Turd Race betting mini-game |
| `TurdToTheMoon.html` | Crash-style betting mini-game |
