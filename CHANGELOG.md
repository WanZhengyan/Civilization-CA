# Release notes

## 3.0 · The Los Angeles Campaign

**What changed.** The command panel, city production, multiplayer rooms, field guide and campaign history now use English. Selecting a friendly unit reveals its reachable tiles. An attack forecast shows both sides' expected hit points before the player confirms the order. The Research Council lets each faction invest science in Agronomy, Industry, Tactics and Civics. Each choice affects the shared game rules in solo and online games.

**What playtesting found.** The previous board made it hard to identify a unit's next destination. The routes, destination markers and faction badges now stay visible over the continuous painted landscape. Opening a move and committing it takes one destination click after selecting the unit. All four unit types have individual illustrated cards. On a small screen, the inspector keeps the selected unit and its orders together.

**How to reproduce the checks.** Run `npm test` to check saved-game migration, movement, production, research, combat forecasts and multiplayer conflicts. Run `npm run playtest` for the deterministic two-, three- and four-faction scenarios. Check the same order in two independent browsers for a release that changes online play.

**Next question.** Can someone playing for the first time tell why a settler can reach a tile but cannot found a city there? Test the opening two turns before deciding whether placement needs its own overlay.

## 2.0 · Units and cities

Replaced territory-only play with settlers, builders, infantry, archers, persistent cities and multi-turn production. Melee can capture cities weakened by a siege. The original map and multiplayer room codes carried forward.
