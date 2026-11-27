# Civitas LA

Civitas LA is a turn-based strategy game set on a 221-hex map of the Los Angeles Basin. Found a second city east of the Santa Monica Mountains, turn a workshop into a faster training ground, or march on a rival capital. Play a solo campaign against three computer factions or invite one to three friends.

[Play on GitHub Pages](https://wanzhengyan.github.io/Civilization-LA/) · [Hosted game](https://angel-basin-civilization.gifteddream3.chatgpt.site/) · [Source repository](https://github.com/WanZhengyan/Civilization-LA)

![Los Angeles hex map showing districts, terrain, cities and units](./media/board-preview.webp)

## Your first turns

1. Select your settler, then click a highlighted hex to move it. Forests and hills cost two movement points. A settler can found a city on suitable land at least three hexes from every existing city.
2. Select a city and choose a production project. A city adds production at the end of its owner's turn. Train a builder to improve your land, recruit a military unit, or build a workshop to speed up future projects.
3. Pick a research project. Cities and population contribute science each turn. Agronomy increases food, Industry increases production, Tactics improves combat and Civics increases revenue.
4. Select a military unit and choose **Attack**. Check the combat forecast before committing. Ranged troops can weaken a city from two hexes away. A surviving melee unit can capture it.
5. Capture every original capital for an immediate domination victory. At the end of round 30, or the first round in which a faction reaches 100 points, the highest score wins.

To play with friends, open **Multiplayer**, create a room and share its invitation link. The host starts the match when everyone has joined. Players can use the same browser to recover their seats after a refresh.

## Run locally

Use Node.js 22.13 or newer. From the repository root, run:

```sh
npm run dev
```

Open [the local game](http://127.0.0.1:8080/Civilization-LA/). The development server serves the frontend and the room API together, with room data saved in `.civitas-local/`. Open a private window or a second browser to join as a different player. Run the rules and multiplayer regression tests with:

```sh
npm test
```

Run `npm run playtest` for an automated campaign. See the [development notes](./DEVELOPMENT.md) and [changelog](./CHANGELOG.md) for the game systems and release history.

| File | Purpose |
| --- | --- |
| `docs/index.html`, `docs/styles.css` | Game board, controls and layout |
| `docs/hud.js`, `docs/game.js` | Map interaction, solo sessions, room membership and synchronization |
| `docs/atlas.js`, `docs/unit-art.js` | Map and unit rendering |
| `docs/rules.js` | Rules shared by the browser and the authoritative room service |
| `lib/room-service.js`, `lib/room-http.js` | Room validation, persistence and cross-origin access |
| `drizzle/`, `worker.js` | Database migrations and the Cloudflare Worker entry point |

## Publish the frontend on GitHub Pages

Push the repository to GitHub. In **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, select **main** and **/docs**, and save. GitHub displays the published URL after deployment. Asset paths are relative, so the game works under a repository path such as `/Civilization-LA/`. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

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

4. Set `civitas-api-origin` in `docs/index.html` to the deployed Worker's HTTPS origin and push your change. Use separate browser sessions to create and join a room, move a unit, and confirm both players see the same board. [Cloudflare D1 migration documentation](https://developers.cloudflare.com/d1/reference/migrations/)

The interface uses Lucide icons. [Third-party notices](./THIRD-PARTY-NOTICES.txt)
