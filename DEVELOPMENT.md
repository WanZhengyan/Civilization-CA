# Development notes

## California atlas series

The 100 revisions are individually runnable. In the version ledger, choose a feature, find its commit, and create a separate worktree at that hash. Inside it, run `npm run dev` and open the local homepage. The version ledger distinguishes each release; this section documents the recurring checks. [Version ledger](./VERSIONS.md)

### Public geography and game state

The gazetteer bundles dates, units, reporting boundaries, source links and bilingual names in a small local module. The twelve Census records cover Los Angeles, San Francisco and San Diego counties plus nine incorporated cities. San Francisco's city and county cover the same territory. Oakland and Berkeley are separate cities outside San Francisco County. Population change uses the original 2010 count as its denominator. Density divides the 2020 population by 2020 land area in the selected units. County income, employment, commutes and retail sales each retain their own reporting period. [Source module](./docs/gazetteer-data.js) · [US Census Bureau QuickFacts](https://www.census.gov/quickfacts/)

| Campaign | Other field records and primary sources |
| --- | --- |
| Los Angeles | [Topanga State Park trail inventory](https://parks.ca.gov/AccessibleFeatures/Details/629) and the [Santa Monica Municipal Pier construction history](https://www.santamonica.gov/media/Housing-Element-Update-2021-to-2029/Housing%20Element%20EIR%20FINAL%20%28Reduced%29.pdf) |
| San Francisco Bay | [Fort Point construction history](https://www.nps.gov/places/fort-point.htm) and [Golden Gate Bridge opening dates](https://www.goldengate.org/bridge/history-research/statistics-data/faqs/) |
| San Diego | [Old Point Loma Lighthouse service history](https://www.nps.gov/articles/cabrillo.htm) and [San Diego–Coronado Bridge history](https://www.sandiego.gov/digitalarchives/new-discoveries/bridging-the-Gap) |

Public records remain readable before a game starts. To locate an entry in a campaign, the client checks the current seat’s explored district IDs on the current map. The scout planner quotes movement using the shared rules. Simulation food, production and movement come from the game state. Census figures retain the boundaries of the real city or county. [Gazetteer and map integration](./docs/gazetteer.js)

### Reproduce the atlas checks

```sh
node --test tests/gazetteer.test.js tests/campaign-explorer.test.js tests/campaign-lenses.test.js
node --test tests/advisors.test.js tests/city-profile.test.js tests/land-commerce.test.js tests/field-expeditions.test.js
npm test
npm run playtest
```

Manual paths cover the points where players enter or leave the map.

1. From the homepage Field guide, search for **奥克兰**, open Oakland and save the city to the notebook. Start a game and reopen the gazetteer from the menu. Its source and notebook entry should still be available.
2. On a matching campaign, inspect a charted district with a field record. Open the dossier and return to the district. Repeat on another region and with a different seat to check which map destinations are available.
3. Open production in a one-resident capital and read the Settler requirement. Grow to three, recruit and verify that one resident departs on deployment. Choose a building with a site, inspect a highlighted parcel, cancel once and then confirm a different legal site.
4. Bombard an occupied enemy city, then capture it with a ground unit that can take cities. Compare the forecast, city health, ownership and garrison before and after capture.

## v6.7.0 city production review

The reference was v6.6.0. In Los Angeles with seed 323, a one-resident capital could commission a Settler for 14 production or buy it immediately for 42 gold without losing a resident. In 50 matched openings all 50 starting capitals could also commission Workshops and walls, and all 50 could spend a district order on their own city tile.

A newly founded town has three housing spaces. A three-resident recruitment gate allows the first expansion without requiring a Granary. The city must still grow, and one resident must join the departing Settler. In the seed-323 opening the city reached three in round 5 and deployed the settler in round 8, leaving two residents. Housing and a food focus gave leaner starts a working route to expansion.

### Fifty review passes

Each group below records ten separate decisions or checks. The released game combines these changes in one compatible client and room-service update.

| Pass | Settlers and residents |
| ---: | --- |
| 1 | Reproduced recruitment in a newly founded size-one capital and required three residents in the producing city. |
| 2 | Applied the population check to production switches and outright purchases. |
| 3 | Moved one resident into the unit only when the unit successfully deploys. |
| 4 | Held invested production after starvation and resumed it on recovery. |
| 5 | Preserved both the project and the resident when the deployment ring is full. |
| 6 | Prevented material shipments into a paused Settler project while permitting food deliveries. |
| 7 | Quoted the resident cost before a player confirms either form of recruitment. |
| 8 | Distinguished population holds from a blocked deployment site in the queue, city roster and ledger. |
| 9 | Showed the current population, minimum and next growth forecast in one place on a locked card. |
| 10 | Replayed a duplicate rush order and a reconnect through the room service. One unit, one gold charge and one resident movement survived. |

| Pass | Borders and the city economy |
| ---: | --- |
| 11 | Reproduced the old paid upgrade on LA seed 417005 and retired the command in the authority. |
| 12 | Removed the upgrade button, preview and receipt from owned tiles. |
| 13 | Kept the neutral claim at four gold and one district order. |
| 14 | Made rival border prices independent of the historical upgrade level. |
| 15 | Changed computer border choices to work with claims and contests. |
| 16 | Updated treasury, difficulty descriptions and field-guide instructions in both languages. |
| 17 | Exercised owned tile levels zero through three across all three regions. |
| 18 | Replayed a harvest on previously developed land and preserved existing income and scoring. |
| 19 | Submitted the retired order to a room and checked the rejection left its revision, balance and log intact. |
| 20 | Exercised a real border claim in simultaneous-team play and checked the seat's budget after reconnect. |

| Pass | Buildings, research and the governor |
| ---: | --- |
| 21 | Required Workshop Engineering before new Workshop orders and Field Tactics before new walls. |
| 22 | Preserved invested work and existing facilities in historical city saves. |
| 23 | Added the Shop and verified its three gold enter the owner's treasury income. |
| 24 | Added the Academy and verified its two science enter the research bank. |
| 25 | Added the Grain mill and verified both its food forecast and its production contribution. |
| 26 | Added the Foundry with a local Workshop prerequisite and measured its three extra production. |
| 27 | Added the Printing house and verified its three culture enter the civic bank. |
| 28 | Checked legal sites, private projections, ordinary production and gold purchases against the same gates. |
| 29 | Taught AI cities to invest in income, food, research or culture according to their position. |
| 30 | Followed an AI that knew metallurgy but lacked a Workshop and made it plan the enabling Workshop first. |

| Pass | Identifying buildings and reading production cards |
| ---: | --- |
| 31 | Used an arcaded school building for the Academy portrait. |
| 32 | Distinguished the Shop by its storefront awning. |
| 33 | Made the Grain mill identifiable by its waterwheel. |
| 34 | Used a casting furnace as the Foundry silhouette. |
| 35 | Featured the hand press in the Printing house portrait. |
| 36 | Gave the new buildings separate models on placed map parcels. |
| 37 | Separated the industrial Workshop and the waterfront Shipyard with their own silhouettes. |
| 38 | Reviewed the five portraits at thumbnail size and regenerated the small first-paint previews. |
| 39 | Widened production cards and let the grid collapse as space runs out. |
| 40 | Provided 44-pixel action targets and kept the shipment styles intact when regenerating the art atlas. |

| Pass | Reading the technology and civic trees |
| ---: | --- |
| 41 | Opened both map-side council buttons through the same project browser. |
| 42 | Applied Available, Full tree and Completed filters to both tracks. |
| 43 | Applied era filtering to both and preserved each council's selection on switching. |
| 44 | Ensured the tutorial and outstanding turn prompts can reveal a selectable project even after filtering. |
| 45 | Showed the current project, bank, income, progress and expected completion in the same locations. |
| 46 | Distinguished available, locked, active and completed projects using text as well as color. |
| 47 | Read unlock names from the real unit, building, wonder and policy catalogs. |
| 48 | Opened a successor's prerequisite route and returned focus to the originating project. |
| 49 | Checked arrow keys, Home, End, normal Tab behavior and focus preservation after a room refresh. |
| 50 | Checked Chinese and English cards, narrow-screen layout, touch controls and empty-filter recovery. |

### Replay the openings

From the repository root run `npm run --silent playtest:city`. Each of the 50 fixed practice campaigns founds a city, selects food focus, trains a Scout, grows to three, trains a Settler, researches a building and completes or purchases it. The ten campaigns per building cover both production and gold. The script uses normal orders and the city's own harvests. It also rejects the retired order and checks the unit and final building exist.

| Measurement | Result |
| --- | --- |
| Capitals allowed to train an opening Settler at one resident | 50 of 50 on v6.6.0 and zero on v6.7.0 |
| First round at three residents | 4–9, median 5 |
| Round when the newly trained Settler was present | 6–13, median 9 |
| Shop / Academy present | Rounds 4–11 / 14–27 |
| Grain mill / Foundry present | Rounds 12–27 / 26–54 |
| Printing house present | Rounds 43–87 |

The competitive `npm run --silent playtest` suite separately plays 18 campaigns twice using the standard AI or the same scripted scout opening on both revisions. The retired district order occurred 2,050 times in the reference and zero times in the candidate. Both revisions produced identical replays on their second run. On these seeds the reference had 14 science wins and four conquests, while the candidate had eight science wins and ten conquests. Median finish moved from round 74 to 56, and 74 cities were founded versus 78 previously. These results describe the sampled AI campaigns. They do not estimate human multiplayer win rates.

## Relief-map review

The reference was `ebe5056`. The hypothesis was that a tilted ground plane, height-based terrain light and upright game pieces would make height and unit position clearer without changing a campaign order. This release used ten source iterations, followed by a final cache/memory correction.

| Iteration | Observed issue and resulting change |
| --- | --- |
| 1 | Flat, blurred terrain became a lit xyz mesh projected onto a tilted ground plane; projection and inverse picking share one camera module. |
| 2 | Neutral miniatures and battle numbers were compressed by the tilt; their ground shadows stay tilted while the pieces and text stay upright. |
| 3 | Rivers and bridges lacked thickness; bank shadows, shallow/deep water and raised bridge decks retain the original routes. |
| 4 | Input checks exercised real painted positions. A click on the lower HP bar initially selected the tile behind the unit; the hitbox now covers the painted bar. |
| 5 | Repeated ridges and forests gained seeded shapes, regional palettes and height-aware scenery ordering. |
| 6 | An entire Epic bitmap blurred at close zoom; the renderer now caches a padded viewport and regenerates it when the camera leaves it. |
| 7 | Tilted geographic text and adjacent names collided; captions stay upright and share collision bounds. |
| 8 | Move-range tint obscured terrain; lighter fills, upright settlement flags and directional formation shadows preserve the scenery. |
| 9 | Known terrain was too dark and the exterior looked like a flat chart; a quieter backdrop and lighter memory veil distinguish survey from unseen mist. |
| 10 | Native renders exposed cliff-like hills and triangular flat-land seams; lower rolling shoulders, nearly level woodland and grouped pitched-roof houses replaced them. |

The final complete suite passed 467 tests, including 22 focused rendering tests. The full rules replay runs 18 fixed campaigns twice. The candidate report is identical to the baseline JSON, including every action/state replay hash, round, counter and winner. The result remains 12 science and six conquest wins. Camera regression cases cover all three regions and all four historical/current map sizes, desktop and phone insets, both views, cursor zoom, drag, a moving pinch midpoint, keyboard navigation, full unit/body/HP selection and city-label order pass-through.

Native Canvas renders were inspected across Los Angeles, San Francisco and San Diego, including full-region and close views. Geometry tests check shared zero-height seams, clear tile centers, directional light, regional variety, raster limits and independence from unseen neighboring terrain. Ordinary frames reuse the bitmap; fully explored fit views still have a one-time mesh/raster preparation cost. Flat planes are excluded from the depth sort, and close views use the smaller viewport cache. On the same fully explored LA Epic native-Canvas benchmark, removing 86,562 flat triangles reduced one-time preparation/rendering from 3,827 ms to 2,403 ms. These timings describe this test machine, not mobile devices.

The managed development preview stalled on existing module requests, including `rules.js`. Native rendering and input integration tests provided visual and coordinate verification. This is a Canvas renderer with an orthographic terrain mesh and upright illustrated pieces; it is not a free-rotation WebGL world. Full physical occlusion between every mountain, building and unit is not implemented: tactical pieces remain legible above terrain.

# Testing a campaign change

Start with one question a player could answer. For example, does faster production give a player enough time to train a defender before the first attack? Identify the rule or screen to change and write down what result would support the change. If the question concerns timing, add a measurement for the turn of the first defender and the first attack.

## Replay the reference and candidate

From the reference revision, run the regression tests and save a report. Repeat from the candidate revision using the same playtest script, openings and Node version.

```sh
npm test
npm run --silent playtest > playtest-reference.json
# After applying the candidate change
npm test
npm run --silent playtest > playtest-candidate.json
```

The current script plays 18 campaigns twice, six on each California map. It covers two, three and four factions. For each region, each configuration uses the normal AI opening and a second opening in which the first seat trains a scout after founding. Every later decision comes from the rules engine. Each pair must produce identical actions, final state and counters. The replay hash covers the actions and final state. Timings are excluded so a faster computer cannot change the report.

Compare the same seat count and opening across revisions. Look at campaign length, movement, cities founded or captured, completed projects, technology and winners together. More attacks can mean either a productive campaign or a stalled front. These 18 scenarios use reproducible seeds, drawing their factions and starting locations from the same rules as a new campaign. Their winner counts cannot estimate a human player's chance of winning.

## Check what a player experiences

- Play one opening turn without consulting the source. Use a keyboard to choose a unit, identify a reachable tile, select production and read a combat forecast. Check focus, labels and whether movement and attack targets remain distinct without color.
- On a narrow screen, select neighboring units, move one and check that its new location and remaining movement are clear. Compare a forecast with the battle that follows.
- Open the deployed game in two independent browser sessions. Share a room link, join from the second session, perform a legal action, pass the turn and reload both seats. Compare ownership, turn and research state across both views. Record the actual URL and result with the review.

For each version, keep a short review with the hypothesis, reference and candidate revisions, report files, the manual observations and the decision. Keep the change when the evidence addresses the original question, or revise it and repeat.

## Read an order before committing it

The public reference was `a21ce99`. We used the same starting settlers or the same sequence of legal orders on both versions. The question was whether a player could distinguish two orders with different consequences, choose between them, and get the result the interface quoted.

| Decision | What the reference showed | What happened on the candidate |
| --- | --- | --- |
| Scout from Venice Canals, Large LA seed 17, round 4 | Nine legal destinations. Two carried the same district name, cost two moves and left one move. | The two map previews showed ten and nine new hexes. Actual exploration went from 19 to 29 and 19 to 28 respectively. Choosing Cancel left the scout in place. |
| Ship two iron to Bel Air, Large LA seed 3, round 11 | Switching the destination from an idle city left the delivery button disabled. The label promised four production for a settler already at 12/14. | The English desktop and 390-pixel Chinese ledger both offered two production. Dispatch took stock from seven to five and the settler to 14/14. The earliest completion stayed at the next harvest. |
| Change citizen assignments and build housing, Large LA seed 624101 | Choosing a focus committed it before showing the change in food or science. The housing shortcut could choose a site without the player reviewing it. | At round 5, science focus raised science income from 5 to 11 and changed food surplus from +7 to −2. Food went from 4 to 2 to 0; the city lost one resident at the third harvest. In the Chinese round-six case, canceling a granary left 6/14 invested in the settler. Confirming tile 18,23 built the granary in two turns and raised housing from three to five. |
| Sail a freight crew from Marina del Rey to Venice, Large LA seed 17 | The manifest named the other berth without showing a course or when it could unload. | Before loading on round 12, the captain could chart a three-hex route. After sailing on round 13, the crew had no movement. It unloaded four food for five gold on round 14, exactly as forecast. |
| Reconstruct consecutive bombardments, Large LA seed 114, round 31 | Two incoming Canoga Park attacks had the same button name. Map replay disappeared after 2.35 seconds. | The defender stepped between reports 3/4 and 4/4, distinguishing 65→7 HP from 7→0. Returning to the journal retained the filter and the selected row. A Chinese phone could also return directly to the command map. |

**Naval governor.** On nine staged coastlines spanning all three regions, a cutter arrived at its own harbor with one move left and a spotter could see a target. The old governor declined the supply order in each case. Using charted sailing distance identified a one-round advantage. A first candidate sometimes lost the opportunity when the spotter moved out of sight. Remembering the firing station for the next sailing turn let all nine governors land a hit the following round. On SF seed 5, provisioning used 6 gold (224→218). The cutter sailed on round 18 and dealt 36 damage to the port without return damage. Immediate departure with a stationary spotter first hit on round 19. A two-seat room replay kept the planned destination private; the cutter regained sight before shooting. Changing the unseen port’s HP did not change the move.

All 18 standard playtests run twice. Eighteen fixed Large games ran for up to 40 rounds across three maps. They saw 13 opportunities to reach an owned berth with one move left, but no known target justified the detour in those games. A night at berth uses time, gold and home defense. This release supports a measured tactical opportunity. The nine matched Large council campaigns retained their finish rounds and their seven science wins and two conquest wins.

**Compatibility.** Both seats in a newly created lobby receive the same naval decision rule. Existing games and lobbies use their original algorithm. Eighteen prior saved games, including nine without the previous campaign feature marker, matched all 7,316 subsequent actions and intermediate state hashes. Six older research-pace games matched another 1,383 actions.

**Next experiment.** Repeat the coastal sortie with an active harbor defender and a contestable escort. Compare damage dealt before either ship withdraws, the gold spent, and whether moving the scout sacrifices the attacker's ability to protect its own coast.

## Decisions on land and at sea

The reference was `89bd050`. Its scouts could reveal land and resources, but could neither visit field stations nor return a completed survey. Two cities could not exchange food by boat. Once a player picked a distant council goal, the planner gave a time at current income without offering a legal way to change it. We tested whether adding choices at these points could produce different, verifiable outcomes while keeping the old campaigns playable.

| Fixed opening or checkpoint | Orders and observed outcome |
| --- | --- |
| Large LA, SF and SD, seed 17, one settler | Scouts trained after founding. LA visited a lodge on round 4, recorded three terrains and published on round 10. SF published on round 16 and SD on round 10. On the Chinese LA map the publication paid 8 gold and 6 influence and raised influence income by 1. |
| Large LA, seed 624101, round 5 | A three-resident city with a workshop, 4 stored food and 46 gold granted its machinists’ charter, then held a craft exhibition. Gold fell to 28 and then 20. Food fell to zero. Production rose from 6 to 9 and then 12. Culture rose from 3 to 4 during the festival. The festival ended after three harvests. |
| Large LA, seed 17, paired ports | A fishing crew loaded 4 food at Marina del Rey on round 12 and delivered it to Venice on round 14 for 5 gold. In a separate run a cutter spent 6 gold at its berth and sailed five one-hex steps on its next turn. The following turn its allowance returned to three. Two independent seats saw the same delivery revision after reconnecting. A rival could not read the manifest. |
| Ranger shot against the same unit | Fortifying changed damage from 35 to 31 on open land, 31 to 23 in woodland, and 31 to 21 in the hills. The ranged attacker took no return damage. A veteran ranger with assault training separately improved a 35-damage shot to 41. On LA seed 114 both drills were available to a scout after 74 legal orders. |
| Large SF, seed 624102 | On round 4 a Stanford investment preview showed the site, a 7-gold fee and 4 construction turns. The treasury remained 37 until the order was confirmed, then fell to 30. On a later civic branch a craft exhibition had one harvest left. A flat-rate calculation predicted UCLA in 2 turns. The corrected preview said 3 and UCLA opened on its third harvest. The remaining 43 culture for County Federation took 14 turns without investment and 8 with UCLA. |
| Same SF game, 390-pixel Chinese display | The city overview compared two cities producing 5 and 7. A housing filter kept only the city at 3/3 residents. Citizen management opened for that city and showed its two-turn granary. |

In three paired Normal two-governor starts, the initial AI spent its scout on a unit upgrade before it could return with its notebook. Allowing it to keep an expedition scout, except when its capital faced a visible threat, changed publication in the first 24 rounds from zero of six governors to six of six. Another trial exposed a locked orbital project obstructing university selection. In a science-only SD game with seed 417005, the corrected governor built campuses and finished on round 69. LA and SF holdout starts also finished through science. Research prices and prerequisites stayed on the published schedule.

Run `npm test` and `npm run playtest` for the regression suite and 18 twice-replayed compact openings. The compact median finish stayed at round 59. The outcome split changed from nine science and nine conquest to twelve science and six conquest. Across one copy of those 18 games the governors issued 74 charters, published 21 atlases and delivered 107 freight shipments. In the separate nine Large openings from `node scripts/playtest-council.mjs --summary`, seven ended by science and two by conquest. Their median finish moved from round 52 to 60. These are fixed bots and maps. A player's victory chances have not been measured.

Nine saves from the preceding release replayed 3,619 identical orders and intermediate state hashes on the candidate. Six still older games replayed 1,383 identical orders. Public room views keep foreign notebooks, treasury orders and cargo private. Existing games keep their opening rules and a lobby records its rules when created.

**Tradeoffs and next experiment.** Sending a scout home can cost exploration time. On one LA start the first seat saw 425 hexes by round 24, compared with 500 on the reference. Governors delivered freight but did not buy voyage stores on these 18 openings. In the next experiment, use the same coastal siege and treasury for both sides: compare moving immediately with paying for supplies after arriving at a berth with one movement point left. Count the turn of the first effective shot and the intervening turns of harbor exposure.

## Branching within each era

The public reference was `93ba4ae`. Its seven Industrial technologies, four Industrial civics and four Modern civics had no prerequisites within their respective eras. We tested whether branching and pricing by prerequisite depth could extend a specialized campaign while keeping the first discovery attainable. Each new tree now has ten prerequisite edges within an era. Across both trees, every later stage in the same era costs more than any earlier stage in that era.

Use `node scripts/playtest-council.mjs --summary` for the nine Large two-governor games on the original LA, SF and SD seeds at all three difficulties. The benchmark plays up to 180 rounds and lists how many games reached each milestone. The fixed human-order comparison uses LA seed 624101, an Arroyo capital with a passive rival and an investment policy that builds available workshops, monuments and universities. Run science and civic goals as separate games and use the selected goal's actual prerequisites in every version.

| Opening or measurement | Reference | Lower prices | Intermediate prices | Released prices |
| --- | ---: | ---: | ---: | ---: |
| Median final round in nine Large games | 39 | 42 | 48 | 52 |
| Rocketry in the single-city university game | 30 | 47 | 58 | 68 |
| Orbital Survey completed in that science game | 34 | 51 | 62 | 72 |
| California Expositions in the civic game | 20 | 42 | 48 | 54 |

The first Frontier science and civic remained at median rounds 3 and 4 across the price trials. In the selected Large cohort, seven games ended in science and two in conquest. Eight reached Rocketry, at median round 50.5. Among those matching eight openings, the paired delay from the reference was 17.5 rounds. On three additional Normal starts held out from the price choice, the median end moved from 45 to 72. These small cohorts measure changes on these particular openings.

The selected costs make city investment matter. A single city on the test opening that built no science or civic infrastructure took until round 143 for Rocketry and 163 for California Expositions. Both goals were attainable under the allowed orders. This long wait is also the main tradeoff. The next experiment is whether a first-time player can identify a worthwhile culture or science building directly from a long research estimate.

**Rules and screens.** The full Rocketry route grew from 7 projects costing 461 science to 13 costing 1,298. California Expositions grew from 4 civics costing 130 culture to 10 costing 484. A civilization that reached Modern through civics alone remained unable to select Rocketry with 925 science banked. Five new projects paid their advertised prices and their yields changed by the stated amounts in a legal campaign. Six historical campaigns (three regions, both older pace settings) replayed 2,849 identical AI orders and reached identical final states over the comparison window. Twenty-five checkpoints from an active older save matched its existing council prices, orders and both reserves. In a Chinese round-two game, clicking **Plan Rocketry** showed 1,294 science remaining from 1,298 with four in reserve. Choosing Workshop Engineering started the project at 4/10. In a 390-pixel Chinese game with six culture in reserve, Public Broadcasting’s 292-point path showed 286 remaining. Both displays preserved the player's current turn and required an explicit order to change the active project.

## Occupying a port after bombardment

The reference was `cd31a11`. Start the Large LA seed 17 conquest scenario from two settlers. Construct both ports and sail the cutter from the ocean through the river to the lake. After the first shot on round 11, turn the attacking government over to the Normal AI. Keep the defender on end-turn to isolate the occupation decision.

| Governor | Result on the same opening |
| --- | --- |
| Reference | No capture by round 69 after 815 subsequent orders |
| Use an explored ground route to the coast | Captured on round 32 |
| Also commission a capture unit to support the guns | Captured on round 18 |

A second run let the defending Normal governor issue its own orders after the same handoff. The reference still had no winner at round 140. The release candidate won by conquest on round 75. Two HTTP seats played the closing 56 orders of the passive-defender case and agreed on the winner after reload. Terrain and a foreign ship placed outside the governor’s exploration affected neither its recruitment choice nor its advancing order. The nine independent Large openings remained nine science wins. In eight additional autonomous games the conquest/science split remained 3/5 and changes of city ownership, which include retakes, fell from 11 to 8. The result supports rescuing a specific siege rather than a general increase in conquest wins.

**Player orders and battle history.** On the Chinese 390 × 844 map, a tap used to move a cutter immediately. With route review it was possible to compare a one-point river move leaving 2/3 with a two-point move leaving 1/3, cancel without spending, then commit the second route and see 1/3 remaining at 21,17. Desktop mouse and keyboard orders still executed directly. On Large LA seed 114, 446 legal orders yielded eight reports by round 21. Three were attacks on the player. The old journal required reading all eight and showed 44 damage to the cutter. The updated English and Chinese journals filtered those three, recorded the cutter going from 85 to 41 and the militia from 57 to 32, and replayed the hit at Ballona Creek. The seed 17 combat preview in Chinese showed 85 to 85 for the cutter and 100 to 64 for the city. The confirmed order dealt exactly 36.

**Buying, building and reconnecting.** In a saved Boyle Heights game, selecting the Orbital Survey dropped its illustration, four-turn estimate and 60-production price from the confirmation screen. The revised review keeps them visible beside the order. On a 1,363 × 936 desktop, an overflowing city inspector put the production button underneath the end-turn panel. Constraining the inspector to its own scroll area restored the pointer click. On a 390 × 844 Chinese screen, Caltech placement charged the quoted 8 gold (1,474 to 1,466). All 42 catalog images decoded, but an uncached opening left the first 12 visible card frames temporarily empty. A 6,458-byte embedded contact sheet now supplies an exact miniature of each painting. A deliberately blocked high-resolution catalog still rendered all 30 late-game cards with their labels, and the satellite, settler and scout could be distinguished in the browser. The Fish shoal tile on LA seed 30 loaded its 384-pixel source correctly and showed fish on the 38-pixel field thumbnail. On seed 41 a lost response from a founding order previously left the sequential client unable to distinguish a committed city from an undelivered order. Compare a request dropped before delivery with a response dropped after commit, using separate human seat credentials. Check the city count, active seat, exact revision and the buyer's receipt after reload. A seat keeps its last eight order receipts. Any later unrelated orders beyond that record require checking the current board.

**Next experiment.** In a contested port with an actively defending governor, measure whether protecting the land unit before it reaches the crossing improves the chance of taking the city without leaving the home capital exposed. Reuse the observed city, route and sight before comparing outcomes.

## Inland water, delegations and late-game timing

The public reference was `99f86df`. We tested whether cities could contest an inland port with a ship, whether influence could buy information without disclosing a rival’s map, and whether the late councils could leave room to use Industrial equipment before a science victory. A new-game marker keeps the original map and council prices in saved games and live rooms created on the reference.

**Research and civic timing.** Run `node scripts/playtest-council.mjs` on the three Large regions at Easy, Normal and Hard. It reports each first discovery and civic by era. On the reference, the nine seeded games reached Industrial, Modern and Rocketry at median rounds 5, 9 and 12 respectively. All finished by science at a median of 16. Holding geography constant, the selected costs and governor fixes moved the finish to round 39, with six science and three conquest wins. With the new waterways and fleet decisions included, the same nine openings finished in rounds 34–52, again at a median of 39. Their Industrial, Modern and Rocketry medians were 10, 24 and 36. All nine finished by science. Six reached a Modern civic, at a median of 38.5 among those six. The opening Workshop Engineering and Municipal Charter still cost 10 and 7. Steam Power costs 44, Rocketry 153 and Public Broadcasting 57. Players can compare both reserves and remaining turns before switching focus. An independent two-seat HTTP match confirmed both councils charged their displayed prices and kept each rival’s focus private.

**Water and fleets.** Generation and reachability checks covered 1,440 seeded charts and 312 four-seat openings. In nine paired 24-round Normal games on identical charts (three regions, seeds 42, 71 and 114), fleet orders changed from 196 to 364 moves, inland moves from 25 to 61, freshwater launches from 5 to 10 and fish deliveries from zero to 53. The governor now limits armed hulls in a charted basin after upgrading a ship. In the Large LA seed 17 replay, two initial settlers founded the cities. A cutter launched at sea on round 6, entered the river on round 7, and attacked a harbor city from the lake on round 11. The city's health went from 100 to 64. The cutter kept all 85 health. This 35-order replay is in `tests/navigable-river-campaign.test.js`. On an independent English desktop and Chinese 390-pixel-wide chart, a cutter sailed from the South Bay Lagoon into the Dominguez Channel for one movement point.

**Civilizations and music.** A desktop delegation on round 16 cost exactly 6 influence (145 to 139) and showed the rival’s era and city count through round 18. A 390-pixel Chinese browser exposed a command drawer intercepting the button. Opening the dossier now dismisses that drawer, and a second run sent the delegation from the same screen position. Separate seat credentials confirmed that only the sender sees the report. In a resumed Grand San Francisco campaign the actual audio player loaded Pacific Light, then responded to mute, unmute and keyboard volume. Each era uses its own original stereo loop.

**Decision and next experiment.** Keep the longer councils and the connected inland water. The fleet now delivers food and can fight inland, but all nine Large validation games still favored science. Next test whether a governor that has already discovered a rival capital near navigable water commits an existing fleet to taking it. Compare first engagement, capture and victory on the same charts, and check that its decisions are identical when only uncharted terrain changes.

## Recorded v3 comparison

The same six openings produced the following totals. Both revisions replayed identically on repetition. The v3 campaigns ended in rounds 13–17. The v2 campaigns ended in rounds 13–23.

| Revision | Moves | Attacks | Captures | Cities founded | Units trained | Buildings completed | Improvements | Discoveries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v2 | 307 | 286 | 9 | 24 | 140 | 35 | 95 | 0 |
| v3 | 338 | 270 | 10 | 24 | 161 | 52 | 93 | 67 |

The v3 bots completed research in every campaign. In the four-player game, the normal opening ended in round 17 with Pacific Union winning. The workshop opening ended in round 14 with Arroyo League winning. Several rules changed in v3, so these outcomes show which playthroughs changed without isolating a single cause.

## Choosing the campaign length in 4.1

With bridge crossings and waterfront trade held constant, the 18 fixed openings ended in rounds 9–19 at a 100-point target, 12–26 at 125 points, and 13–29 at 150 points. Domination victories numbered 0, 2 and 2 respectively. In the six standard two- and four-player games, three fielded armor at 100 points and all six fielded armor at 125. The 125-point target gives the later units time to play a role, with a shorter maximum observed duration than the 150-point experiment. These are deterministic AI openings. Human balance and win rates require separate playtests.

## What changed when the AI had to explore in 6.1

On the standard 18 openings, the 6.0 opponent could use the position of an unseen city to choose its route. In 6.1 each faction plans from its own map. A regression test moves a hidden enemy city while keeping the patrol’s observations identical and checks that its next order stays the same.

| Metric across the 18 campaigns | 6.0 | 6.1 |
| --- | ---: | ---: |
| Attacks ordered | 993 | 716 |
| Improvements ordered | 326 | 364 |
| Campaigns reaching round 30 | 5 | 2 |

Each version repeated its own results on a second run. The next balance question is whether human players have enough early information to choose between founding immediately and spending a turn exploring.

## Comparing a discovered wonder before founding

Hypothesis: if the settlement survey states how many immediately claimed work districts benefit from a discovered natural wonder, a player can compare founding now with moving to another candidate without receiving hidden map information.

The fixed reference was the Los Angeles opening at seed 39, seat zero. Before the change, the settler could see Topanga Canyon and the field guide described its yield, but no settlement candidate connected that yield to the land the new city would actually control. The candidate survey reports two nearby workable districts and the exact production and science effect. Founding on that site produced exactly two eligible Topanga districts in the workforce system. San Francisco seed 1 and San Diego seed 9 were also checked against their regional wonders.

The change is retained. All 165 tests passed, including 80 seeds for every map and seat to prove that the preview never names an undiscovered wonder. The reference and candidate reports for all 18 fixed AI campaigns had identical actions and final states (combined report hash `c04d6168b3a18d0511f3d68cde3da61c6e3226f1bb153ee3f9efe1ba022e0ee2`), so the added advice did not alter balance. In a local two-seat room, the host previewed two La Brea districts, founded the city, received exactly two eligible districts, passed to the guest, and both seats reloaded the next round consistently. English and Simplified Chinese count labels are covered by the localization checks.

The gain is a concrete founding tradeoff using the same numbers that later drive city yields. The cost is extra height in a candidate card when a wonder is relevant; candidates without a known wonder remain unchanged. The survey still does not summarize ordinary terrain yields, resource prospects or travel risk, and automated play cannot establish whether a person finds the comparison quickly enough. The next isolated question is whether a computer settler should compare these same known wonder prospects instead of always founding immediately, without letting it inspect hidden wonders.

## Campaign scale and first-time entry

Players reported that their maps felt too small. We tested whether increasing the playable coastline to roughly four times as many hexes would leave room to explore while keeping each ground start connected and the existing Standard openings reproducible. The reference was `9fe96a8`.

| Region | Standard hexes | Large hexes |
| --- | ---: | ---: |
| Los Angeles | 172 | 689 |
| San Francisco Bay | 166 | 667 |
| San Diego | 149 | 598 |

Large and Standard share a geographic outline. Movement, visibility, production and settlement use the actual hex grid. Checking the Bay Area at a ground unit's sight range caught two crossings whose landings were too distant. The revised landings can be reached through visible cells. Independent two-seat HTTP matches on all three Large regions founded both capitals, advanced to round two and restored each player's private state after reconnecting.

All 174 tests passed. The 18 Standard reference campaigns produced identical replay reports before and after the change. At seed 417007 with four seats, a complete Large match repeated identically in each region. Compared with Standard, the closest pair of starting positions moved from 5 to 10 hexes in Los Angeles, 5 to 10 in the Bay Area and 6 to 10 in San Diego. Attacks ordered fell from 102 to 26, 48 to 20 and 77 to 24 respectively. All six matches ended in civic victories.

Keep the extra size as an opening choice. The added exploration space has a cost in the frequency of early encounters. The next playtest should measure the round of first rival contact across several fixed seeds and compare it with the first-contact round that human players find engaging.

Desktop Chrome played the 17-second film, switched language, followed the San Diego link and started a Chinese Large game with one computer rival. The opening showed one settler and zero cities. Host and join links opened their respective forms. A narrow mobile viewport still needs a hands-on check. On release, the GitHub Pages HTML, script and movie matched their source bytes. Two independent seats on the public room service founded their capitals, handed off the turn and reloaded round two on the 667-hex Bay Area map.

## Finding solo settings with a campaign in progress

On reference `f91864f`, a San Diego Large save with one computer opponent and a capital at Mount Soledad hid the opponent controls on the setup screen. Our hypothesis was that players could change the next game's roster and still recognize which settings belonged to their saved game if both were visible. The first layout exposed every option but put Resume below all three region cards, off screen even in a 1363 × 936 browser. Moving the save summary and Resume button to the top brought the action back within reach. New-game controls follow separately. The replacement dialog compares both rosters and goals before writing anything.

At seed 417007 we ran 18 competitive openings for each point target, covering all region, size and opponent combinations. Median completion rounds were 15 at 100 points, 19 at 125, and 22.5 at 150. A San Diego duel ended by conquest in round 24 with 147 points on the 150-point setting. The default target reproduced all 18 reference action traces and final states. These medians describe a single seed and automated play.

An additional 36 practice games covered the same regions, sizes and targets with two styles of play. All 18 active openings reached their selected target. All 18 conservative openings finished at the round cap with 14–21 points and no winner. Round-five saves could be restored in both groups. The next player test is whether a first-time player understands that zero opponents still leaves neutral camps on the map before encountering one.

Desktop Chrome confirmed Resume was visible immediately at 1363 × 936 and in a 454 × 312 CSS viewport. A player resumed the old San Diego slot, tested cancellation, then started an English zero-rival practice and reached round two with one city. A Chinese two-rival campaign showed three factions and its 150-point goal, including after a reload. These checks used a desktop browser, including its narrow layout. All 184 automated tests passed, and the standard playtest report matched the reference byte for byte.

## Recognizing a capital and weighing a district order

On reference `820096a`, turning off geographic names also hid the capital name. Clicking the far edge of the Fremont shore label selected the neighboring coast. The upgrade button showed a price without the change to income or civic score. The hypothesis was that a player could select the correct city at different zooms and predict the effect of an upgrade before spending an order.

Kept the city marker attached to the hex, a nameplate with its own hit target, and gold crowns for original capitals. A first pass let the selection ring cross Chinese characters. Drawing the ring underneath the nameplate fixed that. In desktop Chrome the far edge of the Bay Area capital label selected its own hex, including at a 454 × 312 CSS viewport. With a scout garrisoned in that city, issuing a move through the nameplate moved the scout from (25,22) to (24,22) and left two movement points. In a crowded view a lower-priority city can shrink to its badge. Zooming in or selecting the hex restores detail.

Across the three regions and both map sizes, 36 orders covered two terrain types and three upgrades in each opening. Both the rules engine and six two-seat HTTP games charged 5, 8 and 11 capital, spent one order per upgrade and added one civic point each time. Private previews and accepted orders agreed on recurring income. Port Concessions can round away a base gain in influence. Three earlier regional saves could still be upgraded. A separate capture test at Los Angeles seed 39 kept the lost capital hidden and correctly offered its founder an ordinary replacement city. Only the player's own founding history is shared.

At Los Angeles seed 63, upgrading Westwood from level 1 to 2 cost 8 capital. Treasury income went from 8 to 9 per turn, influence income stayed at 4 and the civic score rose from 21 to 22. An English narrow-screen coastal upgrade and a Chinese urban upgrade also agreed with the forecast. The sharper labels reserve space that geographic labels could otherwise use. Next, ask first-time players in a crowded regional overview to locate a captured capital and name its current owner before opening Field Command. Measure correct choices and time to locate it.

All 200 regression checks passed. The 18 automated campaigns each replayed twice. The candidate and reference reports matched byte for byte.

## Testing team rooms and computer difficulty

On reference `0e4e81c`, the host could pick a region and size, but an empty room had no computer seat and could not start. All rivals used the same policy. With identical computers on both sides, the first seat won 15 of 18 fixed openings. We predicted that exchanging the two policies on the same map would distinguish stronger decisions from lucky starting positions.

Use `node scripts/benchmark-ai.mjs --pairs=hard:normal,normal:easy,hard:easy --seeds=337,5813,727909` to reproduce the final comparison. Each pair played three regions at both map sizes on all three seeds. Both sides played each opening, with factions, units, terrain, starting resources and vision held fixed. Add `--details` for the starts and action hashes. The following seeds were reserved until after the last strategy and coastal-order fixes. Each cell gives wins, draws and losses for the first difficulty.

| Matchup | Standard | Large | Combined |
| --- | --- | --- | --- |
| Hard vs Normal | 16 / 0 / 2 | 17 / 0 / 1 | 33 / 0 / 3 |
| Normal vs Easy | 10 / 0 / 8 | 18 / 0 / 0 | 28 / 0 / 8 |
| Hard vs Easy | 15 / 0 / 3 | 18 / 0 / 0 | 33 / 0 / 3 |

An early Easy build rushed capitals and beat Normal in 14 of 18 Standard matches. Easy now prioritizes home development and nearby defense. Hard waits for an escort and a surveyed expansion site and compares attack orders across its available units. On the final seeds it founded 71 cities to Normal’s 36. A separate set of 108 games on seeds 239, 3877 and 910033 also completed. Those games caught an attempted harbor on a berth reserved by an unseen rival. The computer now evaluates its known coast and can choose a different project. It can decline a legal but uncertain berth. Changing hidden cities, troops, deposits and research while holding a seat’s observations fixed leaves its choice unchanged in dedicated tests. None of the levels gets extra sight, starting units, income or orders.

Configured rooms draw the first team and then a member using a separate random stream. For 128 fixed seeds with one person facing a three-member team, the one-person side drew 67 first turns and the three-member side drew 61. The draw preserved map layouts, resources and units. Rotating from that seat allowed every survivor one turn per round, including after the opening seat was eliminated. The two-versus-two preset alternates sides.

In 12 paired four-seat games across the three regions and both sizes, a fixed team target of 125 ended games at a median of round 9. A 250-point target ended them at a median of round 19.5. Median attacks rose from 6 to 38.5. Two campaigns ended by domination. The shared threshold now uses the largest team's starting size times the ordinary civic target. A duel stays at 125 and two-versus-two plays to 250. Survival and control of all original capitals can finish earlier.

Five HTTP campaigns with independent member credentials finished across the three California regions. Tests covered a bot opening the match, a human host and bot versus another mixed team, human allies versus computers, an unequal team challenge, repeated requests and 25 reconnects. The largest mixed match reached round 29. Desktop Chrome and a 449 × 312 CSS viewport exercised the bilingual room forms, team assignment and difficulty controls. An existing human lobby and saved solo campaign retained their original setups.

All 230 regression tests passed. The 18 standard playtest campaigns repeated deterministically. Under the revised information boundary, 9 of 18 had the same winners as the reference and total attacks changed from 1127 to 1102.

These are computer matchups and desktop-browser interactions. The next player test should compare a first-time player's first encounter on Standard at Easy and Normal, with the same starting site. Record the encounter round, whether the player could field a defender, and which behavior signaled the change in difficulty.

## Shared turns, city planning and larger maps

On reference 6913006, allies acted in separate turns, a city could not change an occupied queue, and Westwood had a single point label. We tested whether two allies could independently settle, plan buildings and see one another's discoveries during the same turn, while the server charged each order once. The turn belongs to a team in newly configured allied rooms. Each owner still chooses their own research and pays for their own orders.

Two different human credentials founded cities from the same revision in a Grand Los Angeles room. Both saw 38 hexes after founding. The second player changed a project after the first marked ready. Both reconnected with the same board on the following round. Contested harbor orders from the same revision on Los Angeles Large, San Francisco Grand and San Diego Epic awarded exactly one berth. Switching projects released it. Both allies then bought a building on their respective chosen sites, and a repeated purchase charged nothing. The three pairs of actual prices were 21/21, 21/21 and 18/21 gold. Save compatibility tests cover the old geometry, active queues, expansion progress and sequential rooms.

All 18 standard campaign cases reproduced their own result twice. Nine retained their reference winner. Attacks fell from 1102 to 991, units trained from 701 to 591 and completed buildings from 243 to 222. These changes combine several mechanics. They do not isolate the effect of a larger map. On seed 417007, two-seat games on all nine region/size combinations started with 19 visible hexes for the checked individual seat and finished in rounds 16–20. Organic expansions ranged from two to nine. All nine reached a civic victory. Los Angeles Epic's initial seat snapshot was 143,180 bytes, versus 36,427 on Large. Larger maps preserve unit speed, so distant opponents can have little direct contact before a civic victory.

In a 1000 × 620 native canvas harness, the 95th percentile of 30 focused-seat redraws on Epic was 5.2 ms in Los Angeles, 5.1 ms in San Francisco and 4.9 ms in San Diego after scenery caching and viewport clipping. The corresponding references were 98.9, 34.6 and 73.4 ms. Cold full-board renders still took 1.03–1.50 seconds in this harness. A slow phone and an Internet connection can add costs outside this measurement.

For the next experiment, record the round of first visual contact relative to the civic victory round on matched Large and Epic openings. Keep the seed, team size, AI levels, unit speed and civic target fixed, and include human scouting decisions.

## Choose a victory path and a civilization

The public reference was af11dbb. Sixteen of its 18 fixed campaigns ended on civic points and two on conquest. On the reference, a Ranger could fire at a unit, city or camp from an adjacent tile without losing health. The report did not identify the attack as ranged. We tested whether a player could tell the two combat types apart, reserve a distinct civilization and win by the selected route using ordinary game orders.

On the three coasts, 72 adjacent engagements covered Rangers, Militia, armed ships, units, cities and neutral camps or parties. Ranged attackers lost zero HP. In the fixed Ranger case, 35 damage left the firing unit at its original 80 HP. The militia controls lost 25, 15 and 12 HP respectively against a unit, city and camp. The preview and the resulting report now identify these outcomes. Visible historical reports can recover a known attacker's mode, and an unseen attacker stays unidentified.

A seeded allocation test covered all 780 combinations of one to four seats and the four explicit choices or Random, including duplicate rejection. Choosing a civilization did not move the settlers, alter their sight or give them extra starting gold. The founding-capital bonuses apply to the credited economy. The tests check loss, recapture and historical saves. Two independent HTTP members attempting the same civilization got one reservation and one conflict. Historical turn-five saves from six maps and sizes retained their point finish, and finished saves retained their recorded results. All 18 simulated historical campaigns retained their original victory type. Sixteen retained the same winner and sixteen ended on the same round. The unified close-combat rule changes the damage a scout can receive at a neutral camp during ongoing play.

We varied only the cost of the Orbital Survey while keeping the Rocketry prerequisites, player decisions and maps reproducible. Each cost played the same 18 Standard games twice.

| Required production | Science wins | Conquest wins | Median finish round |
| ---: | ---: | ---: | ---: |
| 40 | 18 | 0 | 17 |
| 60 | 16 | 2 | 18 |
| 90 | 16 | 2 | 19 |
| 130 | 16 | 2 | 20 |

We kept 60, the smallest tested cost at which both routes won. At two additional seed sets, 60 yielded nine conquest wins in 36 games, versus eight at 40. The rates describe these computer players and map samples. In Science games starting with an ordinary settler, a player-directed California Republic strategy won against Normal on Large Los Angeles, San Francisco and San Diego, in rounds 13, 13 and 12. In a new team room one city must finish the entire project for its side to win. Research and production stay with their owner.

Pure Conquest plays differently on a defended map. In three Normal two-player Large openings, Los Angeles and San Diego saw their first rival battles in rounds 7 and 9. Los Angeles finished in round 15 and San Diego in round 28. In San Francisco the first battle came in round 22. After 75 complete rounds and 203 rival strikes neither side had captured a city. A separate player-directed conquest in San Francisco succeeded on round 10. The next experiment should measure whether a Normal computer with a visible enemy capital brings a capture-capable unit within reach on the bay's crossings.
