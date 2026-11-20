# 3d-news
News stories as a tiny interactive 3D world

Four stories from 20 Nov 2026 (GTA VI, Cyclone Akvan in Odisha, India vs New Zealand cricket, Sensex and Nifty) on one flat canvas with a slow camera tour.

- `index.html` is the built page that GitHub Pages serves.
- `source/` holds the editable project. Build with `cd source && npm install && npx vite build`, then copy `dist/index.html` to the repo root.
- Story facts and the market snapshot live in `source/src/data.ts`. The numbers are fixed and timestamped, not live.
