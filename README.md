# Civilization CA

A bilingual, turn-based strategy game for one to four players. Each California campaign begins with one settler, a randomly drawn civilization and a new starting location. Choose Los Angeles, San Francisco Bay or San Diego, then a Standard or Large map. Solo campaigns support one to three computer opponents and save separately for each region and size.

[Official website](https://wanzhengyan.github.io/Civilization-CA/) · [Play solo](https://wanzhengyan.github.io/Civilization-CA/game.html?setup=solo) · [Watch a campaign](https://wanzhengyan.github.io/Civilization-CA/#film) · [Campaign updates](./CHANGELOG.md)

![The Civilization CA title screen](./media/campaign-home.webp)

[English campaign board](./media/board-preview.webp)

[中文实机画面](./media/board-zh.webp)

## Enter a campaign

Choose **Play solo** to select a region, map size and number of rivals. Standard maps have 149–172 playable hexes. Large maps divide the same coast into 598–689 playable hexes. You can resume an existing Standard save while keeping a separate Large campaign. **Create room** lets the host set the region and size for everyone. **Join room** accepts a room code or invitation. Switch between English and 简体中文 on the website or during play.

Drag the map or pinch to zoom. Technology and Civics sit on the left, with Field Command on the right. **Fit region** shows the whole playable coastline. A double line marks the last playable hex, and a shared border shows the color of each civilization on its own side. Select a frontier district to identify its neighbors.

The city production menu shows the units, buildings and universities your civilization has unlocked. The science and civic trees show what you can unlock next. Open **Battle reports** to see who attacked, how much damage each side took and where the fight happened. **Replay on map** returns to that district. When the attacker fired from beyond your sight, the report identifies the impact location and keeps the source hidden.

The visitor footer counts anonymous browser profiles on each site from the day the counter launched. Refreshing or opening a second tab on the same site does not add another visitor. The public totals are shared between the two hosts. Day and month follow Los Angeles time.

## Your first expedition

1. Select your settler. Decide whether to found immediately, move to a different site, or spend a movement point surveying nearby resources. Nobody begins with a city, army or claimed land. The first city you found becomes your original capital.
2. Train a **Scout** to explore. All units see two hexes in every direction. A scout gets three movement points to a militia unit’s two. After researching Topographic Mapping, scouts and mounted scouts spend one point to enter foothills. The map distinguishes uncharted land, places you remember, and tiles you can currently observe. In an online game each seat gets its own observations.
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

California also has six natural wonders, two in each new regional campaign. A unit can discover La Brea Tar Pits in Los Angeles, Mount Tamalpais in the Bay Area, or Cabrillo Tide Pools in San Diego. Citizens working neighboring districts receive the site's bonus. Open **Field guide → Wonders → Show on map** to revisit a discovery. An older campaign keeps its original coastline and terrain when you resume it.

A favored site adds one unit of the university’s specialty yield. Existing improvements and resource deposits are protected from campus construction.

Open **Change map** to choose a different region. For 2–4 people, choose **Create room**, select the map and share the invitation. Players can use different languages. Use **Game menu → 简体中文** to switch, including during a match.

## 中文快速开始

官网提供实机短片和三个地区的开局入口。单人开局可以选择标准或大型地图，以及一至三名电脑对手。联机地图由房主选择。每个地区分别保存标准和大型单人战役，旧存档可以从标准地图继续。

首页可以开始或继续单人战役、创建房间，也可以用房间码或邀请链接加入多人游戏。地图上的双线为可玩边缘，界外有斜纹，地块格线可以在图层中单独开关。开局只有一名开拓者。所有单位的基础视野都是两格，侦察兵移动更快，研究地形测绘后进入丘陵只需一点移动力。你可以就地建都，也可以先移动或勘探。建城后训练侦察兵拓展视野，再派建造者到城市控制范围内开发资源。城市人口需要粮食与住房。遇到野蛮人斥候时，可以选择拦截、驻军或清除营地。大学奇观需要相应的科技或市政，在符合条件的领地自由选址。四所大学在每局游戏中都只能各建成一次。

科技与市政位于地图左侧，战场指挥位于右侧。在城市生产里可以查看当前已解锁的选项，后续解锁条件可在科技树和市政树中查看。打开「战报」可回放敌袭、查看伤害和反击。新战役中每个地区有两处自然奇观，市民在相邻地块工作会获得加成。在「游戏指南 → 奇观」中可以定位自己发现的地点。

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

A Cloudflare Worker handles `/api/room` and `/api/visits`. D1 stores room membership, turns, game state and the anonymous visit counters.

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
