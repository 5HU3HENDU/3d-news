# 3d-news

News stories as a tiny interactive 3D world. Eighteen stories and useful explainers from reports dated 16-20 November 2026, with regional scopes, source links and status caveats in each panel.

The original eight scenes remain. Ten additions cover PUC announcements, accessible verification, data permissions, group train booking, winter trains, flight disruption, rural livelihoods, care costs, indoor air and parenting. The camera lingers 16-19 seconds at each story, then travels for 9 seconds. Shuffled rounds visit all eighteen before repeating. While the page is open it asks the browser to keep the screen awake; some browsers or battery-saving modes may ignore the request.

`index.html` is the production page served by GitHub Pages. `source/` is the editable Vite project. Run `cd source && npm ci && npm run build`, then copy `dist/index.html` to the repository root. Build time is separate from story report dates. No displayed number is a live feed.

The Voyager 1 scene's probe is a Polyfork sample: "Comm Satellite" (comm-satellite-fdc2cd), CC BY 4.0, credit Polyfork (https://polyfork.dev/asset/comm-satellite-fdc2cd). Baked to code in source/src/scenes/polyforkSat.ts; no runtime download.
