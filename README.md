# Civilization CA

A bilingual, turn-based strategy game for one to four players. Each California campaign begins with a single settler, an independently drawn civilization and a new starting location. Choose Los Angeles, San Francisco Bay or San Diego. Single-player games can be saved separately for each region.

[Play Civilization CA](https://wanzhengyan.github.io/Civilization-CA/) · [Hosted game](https://angel-basin-civilization.gifteddream3.chatgpt.site/) · [Version history](./CHANGELOG.md)

![Civilization CA campaign board](./media/board-preview.webp)

[中文实机画面](./media/board-zh.webp)

## Your first expedition

1. Select your settler. Decide whether to found immediately, move to a different site, or spend a movement point surveying nearby resources. Nobody begins with a city, army or claimed land. The first city you found becomes your original capital.
2. Train a **Scout** to explore. A scout gets three movement points to a militia unit’s two. Rough terrain can cost more than one point. The map distinguishes uncharted land, places you remember, and tiles you can currently observe. In an online game each seat gets its own observations.
3. Choose research and a civic in the left rail, then train a **Builder**. An improved deposit supplies a city only when it is connected to controlled territory. Check the stockpile for your actual income. Fishing crews work marine sites from a harbor.
4. Inspect the city's food reserve, consumption, housing and next expected population change. Switch its workforce focus to favor food, industry or science. Granaries and residential quarters can expand housing.
5. Watch for neutral lookouts as the map opens. Returning lookouts can warn a camp and lead to a raid. Intercept a party, protect a city with a garrison or walls, or clear the source with a ground unit.
6. Open the councils and look up **UCLA**, **Stanford**, **UC Berkeley** and **Caltech**. Their respective discoveries or charters unlock construction. Pick eligible owned land, compare specialties and commit a city to the project. Each university can finish once per world.

| University | Unlock | Base yield per turn |
| --- | --- | --- |
| UCLA | Municipal Charter (civic) | 3 culture, 1 science |
| Stanford University | Workshop Engineering (technology) | 2 production, 2 science |
| UC Berkeley | Park Conservancies (civic) | 4 science |
| Caltech | Steam Power (technology) | 5 science |

A favored site adds one unit of the university’s specialty yield. Existing improvements and resource deposits are protected from campus construction.

Open **Change map** to choose a different region. For 2–4 people, choose **Multiplayer**, select the map and share the invitation. Players can use different languages. Use **Game menu → 简体中文** to switch, including during a match.

## 中文快速开始

开局只有一名开拓者。你可以就地建都，也可以先移动或勘探。建城后训练侦察兵拓展视野，再派建造者到城市控制范围内开发资源。城市人口需要粮食与住房。遇到野蛮人斥候时，可以选择拦截、驻军或清除营地。大学奇观需要相应的科技或市政，在符合条件的领地自由选址。四所大学在每局游戏中都只能各建成一次。

## Run locally

Use Node.js 22.13 or newer. From the repository root, run:

```sh
npm run dev
```

Open [the local game](http://127.0.0.1:8080/Civilization-CA/). The development server serves the frontend and the room API together, with room data saved in `.civitas-local/`. Open a private window or a second browser to join as a different player. Run the rules and multiplayer regression tests with:

```sh
npm test
```

Run `npm run playtest` to replay 18 campaigns twice across all three maps. See the [development notes](./DEVELOPMENT.md) and [changelog](./CHANGELOG.md) for the game systems and release history.

| File | Purpose |
| --- | --- |
| `docs/index.html`, `docs/styles.css` | Game board, controls and layout |
| `docs/hud.js`, `docs/game.js` | Map interaction, solo sessions, room membership and synchronization |
| `docs/atlas.js`, `docs/unit-art.js` | Regional map and unit rendering |
| `docs/rules.js` | Rules shared by the browser and the authoritative room service |
| `lib/room-service.js`, `lib/room-http.js` | Room validation, persistence and cross-origin access |
| `drizzle/`, `worker.js` | Database migrations and the Cloudflare Worker entry point |

## Publish the frontend on GitHub Pages

This repository publishes the contents of `docs/` at the root of its `gh-pages` branch. For a fork, you can instead select **Deploy from a branch → main → /docs** in **Settings → Pages**. GitHub displays the published URL after deployment. Asset paths are relative, so the game works under the repository path selected by GitHub Pages. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

Solo play runs entirely in the browser. The `civitas-api-origin` meta tag in `docs/index.html` selects the room service for multiplayer. The maintained service allows the project's GitHub Pages origin, `https://wanzhengyan.github.io`. For a fork under a different account or a custom domain, configure the room service for that origin using the steps below.

## Deploy an independent room service

A Cloudflare Worker handles `/api/room`, and D1 stores room membership, turns and game state.

1. Sign in with Wrangler, create the D1 database and copy the example configuration.

   ```sh
   npx wrangler@4 login
   npx wrangler@4 d1 create civitas-la-rooms
   cp wrangler.example.jsonc wrangler.jsonc
   ```

2. In `wrangler.jsonc`, enter the database ID from the previous command and keep `DB` as its binding name. Set `PROJECT_ORIGIN` to the scheme and host of your frontend, such as `https://your-account.github.io`.
3. Apply the migrations and publish the Worker.

   ```sh
   npx wrangler@4 d1 migrations apply civitas-la-rooms --remote
   npx wrangler@4 deploy
   ```

4. Set `civitas-api-origin` in `docs/index.html` to the deployed Worker's HTTPS origin and push your change. Use separate browser sessions to create and join a room, move a unit, and confirm the active turn is synchronized and each player sees their own explored area. [Cloudflare D1 migration documentation](https://developers.cloudflare.com/d1/reference/migrations/)

The interface uses Lucide icons. [Third-party notices](./THIRD-PARTY-NOTICES.txt)
