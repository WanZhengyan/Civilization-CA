# Civilization CA

A turn-based strategy game for one to four players, set in Los Angeles, San Francisco Bay and San Diego. Start with a settler, found a capital, and explore the coast one hex at a time. A harbor can open a route into the interior. A well-placed university can bring your next discovery several turns closer.

**[Play the Pasadena tutorial](https://wanzhengyan.github.io/Civilization-CA/game.html?setup=tutorial)** · [Start a solo campaign](https://wanzhengyan.github.io/Civilization-CA/game.html?setup=solo) · [Play with friends](https://wanzhengyan.github.io/Civilization-CA/game.html?setup=host)

[Game homepage](https://wanzhengyan.github.io/Civilization-CA/) · [v7.3.1 release notes](./CHANGELOG.md) · [简体中文](./README.zh-CN.md)

## Design inspiration and trademarks

Civilization CA is an independent, unofficial browser game set in California. We modeled its hex map, city production, and separate technology and civics trees on *Sid Meier’s Civilization VI*.

This project has no affiliation with, sponsorship from, or endorsement by Firaxis Games, 2K, or Take-Two Interactive. *Civilization* and *Sid Meier’s Civilization* are registered trademarks of Take-Two Interactive Software, Inc.

## Your first campaign

The tutorial opens on the Los Angeles map with a settler at Pasadena and no rival civilizations. Found your capital, then make your first technology, civic and production choices with the same controls used in a regular campaign. The tutorial has its own save. Come back to the tutorial link to resume, or keep playing after the last lesson.

Three decisions will get you through the opening.

1. **What does the city need?** Start with a Scout to explore. Open **City production** to see the Settler card, your current population and the requirement of 3 residents to train or buy one. One resident leaves when the unit deploys, so a city of 3 goes back to 2. Choose Agronomy for food or Workshop Engineering to unlock the Workshop and speed up construction.
2. **Do you need the next hex now?** Open **Influence** to see which parcel your city will gain from natural growth. You can wait, or spend 6 influence to take that parcel immediately. The panel shows the location, time saved and balance after purchase.
3. **Who still needs orders?** Check the button at the lower right. Its number counts all remaining decisions, including technology, civics and city production. When it reads **Unit needs orders**, click it to select the unit on the map. Move it, or choose **Skip this turn** to leave it in place. You can select it again and use its remaining movement before ending the turn. Once you’ve handled every decision in a solo game, the button reads **End turn**.

[![Close-up of the Unit needs orders button and its count of remaining decisions. Open the full campaign map.](./docs/art/turn-orders-detail-v731.webp)](./docs/art/turn-orders-v731.webp)

The left production drawer names the city and centers it on the exposed map. Pick a highlighted parcel for buildings such as the Academy. Walls always use the city center. After Motorization, a city with walls can build Modern fortifications and fire once per round at a visible enemy field formation within two hexes.

## Build beside a natural wonder

Scout the coast of Los Angeles for the **Ballona Wetlands**. A citizen working land next to the marsh earns an extra food and science each harvest. Adopt **Irrigation Districts** and a city near the wetlands can build a boardwalk for another 2 food and 2 culture per turn. All three regions have three discoverable landscapes, each with its own project.

Open **Wonders** to check a discovery and its research requirement. From a nearby city, open **City production → Natural wonder projects**. Pick a highlighted parcel that you own next to the landmark, within two hexes of the city. Keep it clear of resources and other construction. The first city to commission the work reserves it while building. Its recurring yields start at completion, and the landscape keeps its original worker bonus.

On turn 11 in San Diego, North Park lowlands has two places to build the Mission Gorge Geology Trail. Both green hexes touch the gorge. Choose one on the map, then select **Confirm site** in the production panel.

![The production panel at left and two green parcels beside Mission Gorge where North Park can build its geology trail](./docs/art/scenic-construction-v731.webp)

| Region | Project | Technology or civic | Cost in production | Yield per turn |
| --- | --- | --- | ---: | --- |
| Los Angeles | La Brea Fossil Lab | Land Surveying | 22 | 3 science |
| Los Angeles | Topanga Canyon Trail | Public Works | 16 | 1 production, 2 culture |
| Los Angeles | Ballona Wetlands Boardwalk | Irrigation Districts | 22 | 2 food, 2 culture |
| San Francisco Bay | Tamalpais Summit Lookout | Topographic Mapping | 27 | 2 science, 3 gold |
| San Francisco Bay | South Bay Bird Observatory | Agronomy | 18 | 1 food, 2 science |
| San Francisco Bay | Muir Woods Canopy Walk | Park Conservancies | 27 | 3 culture, 2 science |
| San Diego | Torrey Pines Bluff Overlook | Municipal Charter | 17 | 2 gold, 1 culture |
| San Diego | Cabrillo Intertidal Station | Coastal Navigation | 23 | 3 science, 1 food |
| San Diego | Mission Gorge Geology Trail | Applied Mechanics | 23 | 2 production, 2 science |

Other production chains also depend on what that city has already built. A completed **Workshop** and Industrial Metallurgy unlock its Foundry. A finished **Harbor** supports early vessels and, with Steam Power, a Shipyard. Finish the Shipyard to train larger warships as their technologies become available. A city with completed **City walls** and Motorization can build Modern fortifications.

## Read the research trees

Open **Technology** or **Civics** on the left of the map and scroll down through the eras. In the full tree, select a project. The bright lines lead from its immediate prerequisites. Select a prerequisite in the project details to follow its own branch farther back.

**How do you reach Ballistics?** Both **Field Tactics** and **Applied Mechanics** lead into it. In the screenshot, Field Tactics is available and Applied Mechanics is still locked. Select Applied Mechanics to find its own prerequisite, **Workshop Engineering**. Once you complete both branches, you can research Ballistics and train a Rifle Company.

![Ballistics selected in the technology tree, with incoming lines from Field Tactics and Applied Mechanics](./docs/art/technology-tree-v731.webp)

**How can a port city earn more gold?** Find **Harbor Commissions** in the civics tree. It requires both **Public Works** and **County Federation**. Trace County Federation back to **Land Registry**. Adopting Harbor Commissions raises income in each city with a harbor.

![Harbor Commissions selected in the civics tree, with Public Works and County Federation as its immediate prerequisites](./docs/art/civics-tree-v731.webp)

[Watch the 27-second research walkthrough from v7.2.1 (MP4)](https://wanzhengyan.github.io/Civilization-CA/film/councils-v721.mp4)

## Armies and rivals

Each computer starts a new campaign with one city on Easy, three on Normal and five on Hard. Each city starts with one resident. Human players choose where to settle with their original Settler.

Open the treasury to see gross income, unit maintenance and net income. A Militia costs 1 gold per harvest, Field Artillery costs 4 and an Armored Column costs 6. The production and upgrade panels quote recurring costs before confirmation. When gold runs short, the treasury carries the balance forward. You can retire a unit or raise income to recover.

In a siege, the city is the primary target. Each garrison unit takes 25% of the city's actual HP loss, rounded to the nearest point. Bombarding a city from 24 HP to 1 deals 6 damage to each garrison unit. A surviving capture-capable ground unit can take the city and remove its remaining defenders.

## Explore California

Open **Field guide → California gazetteer** from the homepage, or **Menu → California gazetteer** during play. Look up Oakland in either language to compare its 2010 and 2020 population. Switch to **Field tools → Field trips** to follow the bay entrance from Fort Point to the Golden Gate Bridge and onward to Oakland. Once a corresponding district is charted, open its field notes from the district inspector or locate it on the map from its profile.

The gazetteer covers **3 counties, 9 cities and 6 field sites or coastal works**. The sources give each figure its date, unit and geographic boundary. The game models yields and movement separately for its approximate hexes. The approach of exploring public geography through a strategy map was inspired by [Andrej Karpathy’s USACiv](https://karpathy.ai/usaciv/). [Census QuickFacts](https://www.census.gov/quickfacts/) · [Fort Point historical profile](https://www.nps.gov/places/fort-point.htm)

| When you want to… | Open… |
| --- | --- |
| Find a surveyed deposit or decide where to settle | **Map explorer** for legal choices, then **Map lens** to inspect the surrounding land and its current use. |
| Understand a town’s food or construction problem | **Compare cities → City view** for harvest forecasts and returns from investments. **Menu → Advisors** compares available actions. |
| Send supplies to another city | **Supply ledger** to compare charted land routes, check the cargo and cost, and dispatch a wagon. |
| Give a scout a longer assignment | Select your scout and open **Field expeditions** to commission a study, record observations and file the finished report. |

## Set up a campaign

Pick a region on the homepage to carry it into setup. The setup page shows the landscape for that region and keeps the homepage navigation and language controls while you choose opponents and victory rules.

![Los Angeles single-player setup with one Easy computer opponent](./docs/art/campaign-setup-v731.webp)

| Mode | How it works |
| --- | --- |
| [Solo](https://wanzhengyan.github.io/Civilization-CA/game.html?setup=solo) | Pick a civilization, region and map size. Face up to three computer rivals, or pick zero opponents for practice. Your browser keeps a separate save for each region and map size. |
| [Create a room](https://wanzhengyan.github.io/Civilization-CA/game.html?setup=host) | Set up two to four human or computer seats. Put friends on the same team to share explored terrain and current sight. Each ally controls their own cities, treasury and units. |
| [Join a room](https://wanzhengyan.github.io/Civilization-CA/game.html?setup=join) | Use the host’s room code or invitation link. Each player can choose English or Simplified Chinese. |

For **Conquest**, control every original capital or eliminate the last rival team. For **Science**, research Rocketry and finish the Orbital Survey in a city. **Standard** allows either route. On the way, you can discover natural wonders, build one of four university wonders, send a delegation to a rival, or use a river or coastal harbor to move freight and ships.

## Run locally

Use Node.js 22.13 or newer. From the repository root, run:

```sh
npm run dev
```

Open the [local homepage](http://127.0.0.1:8080/Civilization-CA/). The development server serves the game and API together and keeps room data in `.civitas-local/`. A second browser profile or private window can join a local room as a different player.

```sh
npm test
npm run playtest
```

The first command runs the rules, interface and multiplayer regression tests. The second plays 18 fixed campaigns twice across all three regions and checks their actions and final states for reproducibility. [Development and testing notes](./DEVELOPMENT.md) · [100 playable atlas revisions](./VERSIONS.md)

| Source | Purpose |
| --- | --- |
| [docs/index.html](./docs/index.html), [docs/game.html](./docs/game.html) | Public homepage and game entry points |
| [docs/game.js](./docs/game.js), [docs/hud.js](./docs/hud.js), [docs/atlas.js](./docs/atlas.js) | Session management, interface and map rendering |
| [docs/rules.js](./docs/rules.js) | Game rules shared by the browser and room service |
| [lib/](./lib), [worker.js](./worker.js), [drizzle/](./drizzle) | Room and visitor APIs, Worker entry point and D1 migrations |

## Publish an update

This repository serves GitHub Pages from the root of `gh-pages`. Once the source update is on `main`, run:

```sh
node scripts/publish-pages.mjs --check
```

If the check reports a difference, run `node scripts/publish-pages.mjs --publish` to publish the current `origin/main:docs` tree. Run the check again and open the public homepage to verify the release. A fork can instead serve `main` and `/docs` directly in **Settings → Pages**. [GitHub Pages publishing settings](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### Host your own room service

Solo games use browser storage. Online rooms and visitor counts use a Cloudflare Worker with D1. To deploy an independent service:

1. Sign in, create a database and copy the example configuration.

   ```sh
   npx wrangler@4 login
   npx wrangler@4 d1 create civitas-la-rooms
   cp wrangler.example.jsonc wrangler.jsonc
   ```

2. In `wrangler.jsonc`, supply the database ID, keep `DB` as the binding name, and set `PROJECT_ORIGIN` to your frontend’s scheme and host, such as `https://your-account.github.io`.
3. Apply the database migrations and deploy.

   ```sh
   npx wrangler@4 d1 migrations apply civitas-la-rooms --remote
   npx wrangler@4 deploy
   ```

4. Set the `civitas-api-origin` meta tag in both HTML entry points to the Worker’s HTTPS origin. Publish the frontend and join a room from two browser sessions to check that both see the next turn and their own explored map. The maintained service accepts the project’s Pages origin, `https://wanzhengyan.github.io`. [D1 migration reference](https://developers.cloudflare.com/d1/reference/migrations/)

Interface icons are from Lucide. See the [third-party notices](./THIRD-PARTY-NOTICES.txt).

Made together with ChatGPT.
