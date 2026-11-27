# Release notes

## 3.2 · Research across three eras

Four independent research buttons left little reason to plan ahead. A prerequisite tree now links coastal navigation, industry and land warfare. Banking 100 science cannot skip either route into motorization.

25 checks passed. 6 fixed campaigns replayed identically twice. The next playtest asks whether a player can pursue a civilian policy while research is underway.

## 3.1 · Settlement survey

**Playtest finding.** The opening settler can reach 14 destinations. The original command panel showed a single generic spacing rule, which left players to guess how many of those destinations would make a good city site. At desktop width the command panel could also crop the End turn button.

**Changes and result.** The map marks surveyed sites with a solid gold flag for this turn or a hollow blue flag for next turn. The site list gives the movement cost, closest city and distance, and accepts movement orders directly. In the standard opening there are five next-turn sites and no immediate sites. In an interactive playtest, moving from Pico-Union to Pico-Robertson used both movement points and the survey correctly explained that founding becomes available next turn. The repaired turn panel measured 61 pixels high and fully contained its 35-pixel button at a 1,363-pixel viewport. The four settlement regression checks cover timing, spacing, terrain and occupancy. All six scripted campaigns finished with the same outcomes before and after the survey.

**Next question.** Can a first-time player compare two cities' production queues and tell when a new defender will be ready? Play the same opening on a phone and a laptop, then decide what changes would help.

## 3.0 · The Los Angeles Campaign

**What changed.** The command panel, city production, multiplayer rooms, field guide and campaign history now use English. Selecting a friendly unit reveals its reachable tiles. An attack forecast shows both sides' expected hit points before the player confirms the order. The Research Council lets each faction invest science in Agronomy, Industry, Tactics and Civics. Each choice affects the shared game rules in solo and online games.

**What playtesting found.** The previous board made it hard to identify a unit's next destination. The routes, destination markers and faction badges now stay visible over the continuous painted landscape. Opening a move and committing it takes one destination click after selecting the unit. All four unit types have individual illustrated cards. On a small screen, the inspector keeps the selected unit and its orders together.

**How to reproduce the checks.** Run `npm test` to check saved-game migration, movement, production, research, combat forecasts and multiplayer conflicts. Run `npm run playtest` for the deterministic two-, three- and four-faction scenarios. Check the same order in two independent browsers for a release that changes online play.

**Next question.** Can someone playing for the first time tell why a settler can reach a tile but cannot found a city there? Test the opening two turns before deciding whether placement needs its own overlay.

## 2.0 · Units and cities

Replaced territory-only play with settlers, builders, infantry, archers, persistent cities and multi-turn production. Melee can capture cities weakened by a siege. The original map and multiplayer room codes carried forward.
