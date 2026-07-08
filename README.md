# 화요일 도시락 (Lunch Bento App)

Company lunch-box attendance tracker. Each employee picks their name, marks
whether they're attending and whether they'll eat, and the dashboard shows
who's in, who's out, and who hasn't answered yet — implemented from the
design in `project/Lunch Bento App.dc.html` (see `chats/` for the design
conversation that produced it).

## Structure

- `server/` — Express + SQLite REST API (roster, daily responses, reminder settings)
- `web/` — React + Vite frontend
- `project/`, `chats/` — original Claude Design handoff bundle (reference only)

## Run it

```bash
# backend
cd server
npm install
npm run start        # http://localhost:3001

# frontend (separate terminal)
cd web
npm install
npm run dev           # http://localhost:5173, proxies /api to the backend
```

Open http://localhost:5173, pick your name from the roster, and go.

Data lives in `server/data/lunch.db` (SQLite, gitignored) and persists across
restarts.
