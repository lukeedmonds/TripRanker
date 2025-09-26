# TripRanker

TripRanker is a lightweight web app for prioritising quarterly group trips. The Vue + Tailwind front end lets each participant drag and drop the available trips into their personal order, remove any they did not attend, and save the list. The Node.js backend persists every submitted ranking and produces a consensus list based on Borda count scoring.

## Project structure

```
TripRanker/
├── backend/          # Simple Node.js API server with file-based storage
├── frontend/         # Vue + Tailwind interface delivered via CDN bundles
└── README.md
```

## Getting started

### Backend

1. Navigate to the backend folder and start the server:

   ```bash
   cd backend
   node server.js
   ```

   The server listens on port `3001` by default. Rankings are stored in `backend/data/orders.json`.

### Frontend

The front end is a single static page that consumes the backend API.

1. Serve the `frontend/` directory with any static file server (e.g. `python -m http.server 4173`).
2. Open `http://localhost:4173/index.html` (or whichever port you used).

When the page is opened from `localhost`, it will automatically call the backend at `http://localhost:3001`.

## API overview

- `GET /api/trips` – Returns the alphabetical list of trips.
- `GET /api/aggregate` – Returns the group ranking summary.
- `POST /api/rankings` – Accepts `{ "ranking": string[] }` and stores the submitted order.

Aggregate rankings use a Borda-style scoring system, awarding `n - index` points for each of the `n` ranked trips in a submission. Trips that are removed from a submission simply receive no points from that user.
