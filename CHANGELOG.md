# Campaign updates

## v7.0 atlas series

The series contains 100 separately playable revisions. The version ledger identifies the change in each one and shows how to find that build in Git. [Playable version ledger](./VERSIONS.md)

- **Find a place.** Open the California gazetteer from the Field guide or in-game menu. Browse Census counts for nine cities and three counties, inspect six historic and natural sites, or follow a three-stop regional field trip. Search works in English and Chinese. A discovered district links back to its real-world profile.
- **Make a map decision.** Map explorer finds legal settlements, builder jobs, harbor berths and university sites. Map lenses show what workers actually harvest, where a scout can travel this turn and which districts natural borders may reach. The Advisors menu ranks current choices and gives the expected cost or return.
- **Run a city network.** City view projects food and housing across five harvests. The Supply ledger can send food, lumber, citrus or scholars on charted roads between friendly cities. Expeditions give scouts assignments to observe regional features and file or exhibit their findings.
- **Recruit and place.** The normal city production picker shows the Settler’s three-resident requirement and the local growth outlook. One resident departs when the unit deploys. Site-based construction uses a left-side placement review so you can keep the map in view while choosing a highlighted parcel.
- **Read a siege.** Attacks on an occupied enemy city reduce city health first. The garrison stays in place during bombardment and leaves play when a surviving capture-capable ground unit takes the city.

Andrej Karpathy’s USACiv inspired the use of public geography as an explorable strategy map. This game’s gazetteer identifies the public agency behind each measurement. [USACiv](https://karpathy.ai/usaciv/) · [Atlas data and validation](./DEVELOPMENT.md#california-atlas-series)

## v6.7.0 — Grow a city before sending settlers

Cities need **3 residents** to train or buy a Settler. One resident leaves when the unit deploys. A size-three city therefore becomes size two. The starting Settler is still free, and a newly founded capital can train a Scout immediately. If a city falls below three while training, its work waits for the population to recover. A blocked deployment hex also preserves the resident.

The **Develop district** order has been retired. A neutral border claim costs 4 gold and one district order. Contesting a rival border costs 4 gold, 5 influence and one order. Citizens still work the land, builders can improve resources, and influence can advance a city's natural border growth. Land upgraded in a previous save keeps its earned yield.

| City building | Research needed | Production | Benefit each turn |
| --- | --- | ---: | --- |
| Shop | Land Surveying | 12 | 3 gold |
| Workshop | Workshop Engineering | 13 | 2 production before technology bonuses |
| Academy | Topographic Mapping | 22 | 2 science |
| Grain mill | Crop Rotation | 21 | 2 food and 1 production |
| Foundry | Industrial Metallurgy and a local Workshop | 27 | 3 production |
| Printing house | Electrical Engineering | 26 | 3 culture |

City walls now require Field Tactics. Existing finished Workshops and walls remain in service. Partially funded historical orders keep their investment. Each city can build its own Academy, while each university wonder is unique across the map.

Technology and Civics now share a project browser. Compare banked points, income, cost and time in either council. Use **Full tree** to see a locked project's prerequisites and the units, buildings or policies a discovery unlocks. Both councils support keyboard navigation and a single-column layout on narrow screens. Search for a building in either language in the field guide to see its price, gate and output.

The [development review](./DEVELOPMENT.md) covers 50 review passes, 50 scripted city openings and 18 competitive campaigns played twice.

## v6.6.0 — Choose a game mode and find the next order

The homepage and title screen present the tutorial, solo play and multiplayer in the same order. Select **Multiplayer** to open room creation. Players with an invitation code can go straight to **Join a room**.

The Field Guide now searches both English and Chinese. Search from the title screen or inside a campaign to read a short answer and jump to the matching topic. In the tutorial, a scout can compare a recommended route by its movement cost and the number of new hexes it would reveal, then confirm the destination or choose a different one.

The GitHub project page now opens with an English introduction and an English screenshot from the Pasadena campaign. The [Chinese guide](./README.zh-CN.md) is available separately.

## v6.5.0 — Play your first campaign in Pasadena

Start the guided campaign from the homepage or the game title screen. Found a capital on the Los Angeles relief map, choose a technology and a civic, set up production, weigh the cost of expanding early, and send a unit into the field. Open the usual game controls for each choice. You can keep your influence, choose a different unit, collapse the tips, and continue to play after the last lesson. The tutorial resumes from its own save slot.

When your next turn starts, the planning panel lists research, civics and city projects that actually finished on your last turn. Expand it to see the city or unit involved and open the next available choice.

The bilingual homepage and GitHub README now link directly to the playable tutorial and show the current map. The title screen links back to the homepage. Run the Pages release check to confirm that the branch serving the website matches the source on main.

## Resolve orders from the turn button

The bottom-right button takes you to an available research choice, a civic, an idle city's production, or a unit waiting for orders. Select a task to open the relevant council, city, or map location. A unit can spend its movement or skip the rest of this turn’s reminders. You can still select a skipped unit manually while it has movement. When the list is clear, the button offers **End turn** or **Mark ready** in a shared team turn.

## Spend influence from the campaign map

Open **Influence / 影响力** to see your balance, where your next turn’s income comes from, and the orders available to your civilization. After founding a city, compare the natural expansion forecast with paying 6 influence for the same visible neutral parcel now. A paid expansion uses the city's accumulated border progress and starts the next claim at zero. Each city can use this order once per round.

Other uses include sending a three-round delegation to a contacted rival, changing a policy, and contesting a rival’s eligible border district. The bilingual field guide explains the costs through a first-turn example.

## Relief terrain and a tilted campaign table

The map now opens in a fixed, tilted relief view. Rocky ridges, rolling foothills, regional forests, clustered houses and shoreline banks have directional light and cast shadows. Rivers retain their navigable courses, and bridges have raised decks. All terrain and miniature artwork is original and generated locally.

Use **Relief view / 立体地形** beside the map controls to switch back to the flat strategic map. The choice is remembered on this device. Units, city names, resource markers and combat numbers remain upright. Zoom, drag, touch pinch, keyboard movement and city-label selection share the same projected ground coordinates.

A padded viewport cache keeps nearby terrain sharp on Grand and Epic maps. Previously explored land remains visible under a blue-gray veil. Unseen terrain never enters the relief mesh. This changes presentation only: ongoing campaigns and rooms keep their existing rules and saves.

## Compare scouting routes, plan coastal deliveries and review each battle

A scout can compare reachable destinations by how many uncharted hexes it will reveal. Review the dotted footprint before moving. A fishing crew can chart a course to a known friendly berth, inspect its next legal leg and see the earliest round it can unload.

In Citizen management, compare a proposed focus with current food, production and science before applying it. Housing projects use the normal map placement and project switch review. The supply ledger updates when you change cities. A shipment shows the food or production the city can receive and whether materials will bring the project forward.

On the battle map, step through the reports your side witnessed at your own pace. The selected attack stays in view until you leave it. Return to the same line in the journal or back to the command map.

In fresh campaigns, computer admirals consider the charted sailing distance before buying voyage supplies for a warship. They can keep a firing position in mind for the next turn if a spotter moves away. They still need sight to shoot. Existing rooms and saves keep their original naval decisions.

## Explore inland, specialize cities and trade along the coast

- Train a scout to visit trading posts, field archives and trail lodges. Each offers two exchanges. Each civilization can visit the same station once. A scout can also record three different terrains at least three hexes apart. Publishing the notebook at home pays 8 gold and 6 influence, and gives its city 1 influence per harvest.
- Open City hall in a city of at least two residents. Grant one permanent charter backed by a granary, workshop or monument. Municipal Charter also unlocks three festivals. Each costs 8 gold and 4 stored food, lasts three harvests and has its own payouts.
- Load 4 food onto a fishing crew at an owned harbor. Sail a charted water route and deliver it at a different friendly berth for food and freight revenue. A ship can separately buy voyage stores at its own berth. Spend 6 gold and the rest of this turn’s movement for two extra movement points on its next sailing turn.
- Fortify an armed land unit to reduce incoming damage. The extra protection depends on the terrain. A military unit that survives damaging engagements can earn a permanent assault or guard drill at 3 XP. The combat forecast includes both terrain protection and training.
- Select a council goal to compare available city investments. The forecast includes construction time, scheduled festival expiry, the local university or monument bonus, and the remaining time to the goal. Review the site and price before placing the order.
- Open the city overview to compare production, food and housing, then jump to the right city's production or citizens. These planning tools also work on earlier campaigns. Existing saves and existing rooms keep their original gameplay rules.

## Plan deeper research and civic paths

New campaigns have 19 technologies and 15 civics. Within each era, some projects open a choice of branches and others bring those branches together. Each later stage costs more. Industrial science can proceed from Steam Power (60 science) through Industrial Metallurgy (98) to Electrical Engineering (124). The industrial civic route from County Federation (39 culture) to Teachers Colleges (55) and Public Libraries (77) lets monuments contribute more culture. Reaching an era by one council still leaves the other council’s prerequisites to complete.

Open either council and select a goal to see every outstanding prerequisite and the points still needed after applying your reserve. Shared prerequisites count once. You can start an available step directly. **Victory progress → Plan Rocketry** opens the corresponding science route. An existing save or room retains the costs and prerequisites of its original campaign.

## Bring troops to port sieges and review orders on the map

When a Normal or Hard governor has a gunship in range of an observed enemy city, it can commission a ground formation and advance it along explored land and bridge crossings. A capture-capable survivor can take the city after the ship fires. The combat forecast shows when a garrison will absorb a hit and when a city needs ground troops to finish the capture.

Tap a highlighted destination on a touch map to review the route, its movement cost and the points the unit will have left. Select another hex to compare or cancel to keep the unit in place. Desktop mouse and keyboard movement retain their direct controls.

Open Battle reports to see historical attacker and defender HP. Choose Attacks on me to find hits on your own cities and units. Opening reports from an incoming alert selects that filter for you. A replay uses what your seat witnessed at the time of the attack.

All 42 catalog illustrations now have a miniature of the same artwork available while the full picture loads or if its download fails. Production keeps the selected project's illustration, its completion estimate and the remaining production or purchase price on the confirmation screen. Construction on the map also keeps the project and cost in view. University placement quotes the actual charter fee. A tall Field Command panel now scrolls above the end-turn controls so its production button can be clicked.

Online orders now carry private receipts in both sequential and shared-team-turn rooms. If a response is interrupted, reopening the room checks whether that order was accepted, safely retries an undelivered order in the original window, or asks you to review the changed board. A duplicate cannot purchase, found or move twice.

## Sail inland and meet the civilizations beyond your borders

New campaigns in all three regions draw navigable rivers and lakes from the opening seed. A harbor can launch on fresh water. Cutters can sail inland and fire at a city in range. Fishing crews can load at a surveyed shoal or their own fishery and return to an owned berth with 3 food and 1 stored fish. Bridges keep ground crossings open. Explored waterways can be located from the map key.

The portraits in the upper right open a civilization dossier. It shows your civilization’s trait, economy and influence uses. After first contact, you can review the rival’s trait and the cities your team has actually observed. A delegation costs 6 influence and reports the rival’s current era and city count for three rounds.

Industrial and Modern discoveries and civics now take longer. Both councils show the number of turns remaining at current income and keep banked points when you change focus. The original costs and geography stay with existing games and rooms.

Three original pieces accompany the Frontier, Industrial and Modern eras. Mute the music or set its volume in the game menu. Both languages offer the same controls.

## Choose your civilization and race for conquest or science

Choose a victory mode when starting solo or hosting a room. In Standard, your team can win by conquest or by researching Rocketry and committing 60 production in one city to the Orbital Survey. Science and Conquest each offer a single objective. Earlier campaigns and rooms keep the victory rules they started with.

Choose the California Republic, Pacific Union, Valley Coalition or Arroyo League, or leave the choice to a random draw. Each civilization has a different economic bonus in its original capital. Humans may choose their own civilization before the game starts, and the host can choose for computers.

Combat forecasts and new battle reports distinguish ranged strikes from close combat. A ranged attacker takes zero return damage even when firing at point-blank range.

## Give orders together on a larger California coast

Room setup starts with the number of seats. Set each position to human or computer, assign a team, and pick the difficulty of each computer. Allies share live sight, explored terrain and surveyed resources. New team rooms let each ally give orders at the same time and mark ready independently. A teammate's move can reveal a target for another player on the same turn. Older rooms can finish in their original turn order.

The previous Large map is now the smallest choice for a new game. Grand and Epic subdivide each coast further. Places such as Westwood extend across several named tiles. Older small maps keep their saved geometry.

Cities grow their borders with population and show an expansion forecast beside their name. Owners can change their current project, bank its invested production, place buildings on the main map and spend gold to buy eligible projects. The treasury explains spending and influence costs. Select a unit to compare upgrade routes, their exact prices in gold, technology and location requirements, and expected healing. The army handbook lists the same prices in English and Simplified Chinese.

## Play team matches with friends and computer governors

Create a room for a duel against a computer, two friends against two computers, or a custom match of up to four civilizations. Set teams and computer difficulty by seat. The server takes computer turns, including the opening move if their team wins the draw. An open human lobby still starts as soon as the host has a second player.

Each civilization explores with its own units. Easy patrols near home, Normal balances scouting and growth, and Hard compares attacks across its army and evaluates known expansion sites. All three spend the same resources and use the same sight and movement rules as humans.

Allies can defend each other’s cities and share a capital or civic victory. The civic target scales with the largest starting team, from 125 in a duel to 250 in two-versus-two. The setup, roster and team standings are available in English and Simplified Chinese.

## Find cities and see what district development buys

City names are anchored to their visible hexes. A gold crown identifies each original capital, including after capture. Its rim follows the owner. Turn geographic names off to clear the map and keep city names in view. Click a nameplate to inspect the city. A selected unit can still move or attack through it.

Open **District development** on owned land, including a city or a garrison. Compare the cost, district order, income per turn and civic score before spending. The preview includes terrain, policy effects and rounding. A confirmed order shows its result. Fully developed land displays its level cap. The map key, guide and commands are available in English and Simplified Chinese.

## Set your solo opponents and civic goal

Choose practice with zero opponents, a duel with one or a contest with two or three. Set the civic target to 100, 125 or 150 points. Practice keeps exploration, city building and neutral camps. Reaching the target completes the challenge. If round 30 ends first, you see your final score.

Solo setup shows the existing save and its Resume button together, followed by the settings for a new campaign. You can review the old and new settings before replacing a save. Earlier campaigns keep their original roster and 125-point target. Online rooms still require two to four human players.

## Choose the scale of your California campaign

Choose a Standard or Large coast when starting a solo campaign or creating a room. Los Angeles opens from 172 to 689 playable hexes, San Francisco Bay from 166 to 667 and San Diego from 149 to 598. Units keep their movement and sight ranges. Large Bay Area crossings meet the shore within sight of a ground unit. Solo players can also choose one, two or three computer rivals and keep a separate save for each region and map size.

The bilingual official website opens directly into solo, host and join setup. Watch a recorded Los Angeles campaign found Westwood, explore the coast, build UCLA and replay a rival attack. Older room invitations and campaign bookmarks still open the game.

## Compare natural-wonder land before founding

The settlement survey now explains when a known natural wonder will improve land claimed by a proposed city. Each candidate lists the wonder, the number of immediately workable neighboring districts and the exact yield effect. Undiscovered wonders remain private, and the estimate uses the same ownership, occupation and protected-land rules as the city workforce.

165 checks passed. The 18 fixed campaigns produced the same actions and final states as the reference. A live two-seat room previewed two La Brea districts, then founded the city and exposed exactly those two districts to its workforce. The next experiment is whether computer governors should use this visible comparison before founding immediately.

## Exploring the California coast

The Los Angeles Basin, San Francisco Bay and San Diego Bay now follow distinct playable outlines. Shipping routes, founding sites and shared frontiers use the same hexes you see on screen. Two colors meet at each contested boundary. The full-window map supports panning beneath the councils and field commands.

All mobile units see up to two hexes. Scouts cover more ground per turn, and Topographic Mapping makes foothill movement cheaper for scouts. A bilingual battle journal records attacks, damage, counterattacks and captures that your seat witnesses. Replay an incoming attack to find its location. Shots from beyond sight reveal only what the defender observed.

Cities show production as its era and research requirements are met. Units, buildings, university charters, local resources and improvements have individual illustrations. Each new region also contains two discoverable natural wonders. Inspect a wonder to see how nearby workers benefit, or find it again in the field guide. Existing campaigns can finish on their original map.

## The California campaign table

Start on an illustrated California coast. Choose a region and save for solo play, host an online game, or join a friend by code or link. The map has a defined playable perimeter, independent tile-grid controls, colored territory edges and a fit-region view. Anonymous browser totals appear at the lower left.

Military formations now specialize in scouting, defense, siege, support and naval combat. Science rewards surveying, resource specialization, rail connections and observation from harbors. The civic assembly can adopt regional projects and fund one operating policy at a time. Open the field guide’s unit handbook to compare requirements and costs across eras.

## Civilization CA

A regional title and an inherited opening guide no longer described the campaign. The project now uses the Civilization CA name and an opening guide for settlement, reconnaissance, surveyed resources, population, raiders and universities. Computer opponents plan reconnaissance, military routes and settlements from their own charted territory.

94 checks passed. 18 fixed campaigns replayed identically twice. Continue measuring opening balance and late-game campus races with players.

## Recognizable campuses on the California map

The architectural identity and progress of a campus were difficult to read on a crowded map. University construction, completion and specialties now have dedicated artwork, visual feedback and bilingual guidance.

91 checks passed. 18 fixed campaigns replayed identically twice. Play a full founding-to-campus journey and recheck every hidden-information boundary.

## Compete for a unique world wonder

Different cities can pursue the same charter, so finishing a race must settle conflicts consistently. The first completion awards the world wonder. Competing queues resolve by the same rules online and in solo games.

88 checks passed. 18 fixed campaigns replayed identically twice. Improve recognition of completed universities at board scale.

## Choose the campus district

Hard-coded real-world addresses would repeat the same wonder location across campaigns. A survey lets a city select eligible controlled land for a campus. Terrain suitability changes its specialty yield and occupied sites are excluded.

87 checks passed. 18 fixed campaigns replayed identically twice. Resolve two civilizations racing to build the same university.

## University wonders from science and civics

A research discovery rarely changed the long-term identity of a city. UCLA, Stanford, UC Berkeley and Caltech have distinct unlock requirements, costs and effects; players can examine the relevant charter in their councils.

86 checks passed. 18 fixed campaigns replayed identically twice. Give the player a meaningful choice of campus site.

## Intercept raids before they reach a city

Stationary camps gave the player little reason to choose between patrolling and defending. Returning lookouts can trigger raids. Defenders and walls repel attackers. Civilian settlers are protected and a raid cannot capture a city.

84 checks passed. 18 fixed campaigns replayed identically twice. Test a longer-term peaceful project alongside frontier defense.

## Discover barbarian outposts

Exploration had no independent opponent outside the rival capitals. Reachable neutral camps and lookouts are generated outside the starting buffer. A military unit can clear a camp for a treasury reward.

81 checks passed. 18 fixed campaigns replayed identically twice. Check that a sighting leaves time to intercept an approaching raid.

## Plan housing before growth stalls

A stocked city could reach its capacity without explaining what would help it grow. City reports show housing, reserves and growth timing. Granaries and residential quarters expand capacity. Governors can respond to shortages and housing pressure.

77 checks passed. 18 fixed campaigns replayed identically twice. Add a neutral threat that a young city can scout and defend against.

## Assign the city workforce

More residents previously gave the governor little control over which yields increased. Residents work eligible city land or specialist jobs. The city focus changes assignments and therefore actual food, production or science.

75 checks passed. 18 fixed campaigns replayed identically twice. When growth stops, make its limiting factor visible.

## Feed each citizen

Population grew without a clear cost to providing food. Cities now consume food per resident, store surplus and draw down their reserves during shortages. Prolonged shortages reduce population.

73 checks passed. 18 fixed campaigns replayed identically twice. Compare food-oriented and industry-oriented assignments in the same city.

## Turn local deposits into usable supplies

A map icon did not explain how a city earned and spent goods. Improved, connected deposits credit the owning civilization’s stockpile. A ledger makes production and exchanges visible.

71 checks passed. 18 fixed campaigns replayed identically twice. Test whether this opening economy can support residents in a new settlement.

## Builders work the city hinterland

A discovered deposit by itself gave a city no local construction decision. Builders match farms, orchards, lumber camps, quarries and mines to deposits within controlled territory; fishing crews work marine sites. Projects consume a build charge.

68 checks passed. 18 fixed campaigns replayed identically twice. Check that a connected improved tile supplies its owner on the next turn.

## Survey the land for resources

Knowing every deposit at the opening removed the value of exploration. Each seed distributes resources appropriate to land and water. The opening settler has no identified deposits. Surveying or founding starts local discovery.

66 checks passed. 18 fixed campaigns replayed identically twice. Test what a builder can do on an actual controlled deposit.

## Private intelligence for every online seat

Hiding graphics alone would still hand an opponent the underlying state. The room service returns a seat-specific board and history. Private seeds, hidden positions and unseen orders stay with the authoritative game; launching and rejoining a room both use the same projection.

63 checks passed. 18 fixed campaigns replayed identically twice. Verify resource discovery using that same visibility boundary.

## A map that remembers exploration

A previously seen district and an unvisited one looked the same. The atlas distinguishes unexplored ground, remembered terrain and currently visible positions. Enemy movements are live only inside current sight.

62 checks passed. 18 fixed campaigns replayed identically twice. Check that the room service gives each seat the matching view.

## Sight belongs to each formation

Explorers and infantry shared access to the same open board. Units and cities now have individual sight radii. The scout sees farther than an ordinary infantry unit.

61 checks passed. 18 fixed campaigns replayed identically twice. Keep a record of seen terrain when the scout leaves.

## Train a dedicated land scout

Settlers were costly to risk just to examine another valley. Cities can train a foot scout with three movement points; militia have two. The early scout is separate from mounted scouts.

59 checks passed. 18 fixed campaigns replayed identically twice. Measure how far each formation can actually see.

## One settler and no inherited capital

The old opening handed players territory, an army and an established city. Each seat now begins with a single settler on neutral land. Founding consumes that unit and establishes the first capital at the chosen site. An unfounded surviving rival counts as a participant.

58 checks passed. 18 fixed campaigns replayed identically twice. Can a player train an inexpensive explorer with a distinct travel range after founding?

## Draw a civilization independently of the map

A given seat always represented the same civilization. Civilizations, colors and capitals now follow an independent draw. All twelve ordered two-player combinations occurred across 48 fixed seeds. Human names remain attached to their seats.

56 checks passed. 18 fixed campaigns replayed identically twice. Now test how the game behaves before anyone has founded a city.

## Seeded starts across California

A familiar capital and the same adjacent districts gave away each opening. The host now draws a seed. Each map chooses connected, separated founding sites; 120 four-player setups had at least five hexes between opponents.

55 checks passed. 18 fixed campaigns replayed identically twice. Next, separate starting region and player identity.

## Illustrated forces and a longer modern campaign

Advanced troops shared silhouettes and the initial 100-point limit often ended a game before armor arrived. Seven military and maritime formations have their own map pieces, animations and painted portraits. Ports, shipyards and fisheries appear on their water hexes. Waterfront trade now reaches urban ports, and the 125-point target allowed armor to reach all six reference two- and four-player standard games, up from three.

54 checks passed. 18 fixed campaigns replayed identically twice. Next investigate player positioning around bridges and harbors; AI campaign outcomes alone do not establish human balance.

## English and Simplified Chinese at the same table

The English-only interface made the field guide, council decisions and network lobby difficult to share with Chinese-speaking friends. The game menu now changes the interface language live, including the map, canvas labels, project descriptions and chronicle. Each player retains their own preference and entered names. The guide covers sea routes and three eras in both languages.

50 checks passed. 18 fixed campaigns replayed identically twice. Finally compare force silhouettes at map scale and check whether a standard campaign lasts long enough to use its advanced units.

## A map-first command screen

The field inspector consumed map space while major research decisions and city queues were scattered. Technology and Civics now share the left edge of the map, with active choices, prerequisites and production timing. Field command measured 245 pixels wide on desktop. At a 390-pixel phone viewport both council targets measured 59 by 52 pixels.

45 checks passed. 18 fixed campaigns replayed identically twice. Next test both councils, map switching, the guide and an online room with different language choices.

## Southern California and navigable crossings

The first Bay Area playtest exposed a serious terrain problem: the Marin capital was on an island for land armies, making conquest impossible in a four-player game. Golden Gate, Bay and Coronado bridges now let land troops cross or contest the far end while ships can pass underneath. San Diego adds a sheltered inner bay and Mission Bay. Each region keeps its own solo save.

45 checks passed. 18 fixed campaigns replayed identically twice. Every original capital is land-reachable for every map and seat count. The next check is how many controls a player can reach while watching the board.

## A campaign across San Francisco Bay

On the Los Angeles map most factions begin inland. A second region needed to make competing ports part of the opening. The new Bay Area map has its own terrain, city sites and a navigable Golden Gate. In a four-faction opening all four capitals can commission distinct harbors. The host selects the scenario for everyone.

41 checks passed. 6 fixed campaigns replayed identically twice. Next test switching between two coastlines without losing either saved solo campaign.

## Fishing crews and coastal fleets

Ports could earn revenue but had no vessels to launch. Fishing crews can establish fisheries, cutters patrol connected sea hexes, and steam frigates bombard the shore. A crew in the reference coastal opening launched in round 6, worked two fisheries, then shared its harbor with a cutter in round 8.

37 checks passed. 6 fixed campaigns replayed identically twice. Try the same port rules against the peninsulas and narrow water passages of San Francisco Bay.

## Harbors and working waterfronts

A coastal district previously generated no port income and offered the same building list as an inland city. A harbor now needs access to a connected controlled shore. Its berth is reserved while under construction. A finished harbor adds two capital each turn and unlocks a shipyard with two extra production.

33 checks passed. 6 fixed campaigns replayed identically twice. The next playtest checks whether a vessel can launch, cross the bay and return to the correct shore.

## Mobilize across three eras

In the prior build a discovery could raise damage, but cities kept training the same four units. Cities now train mounted scouts, rifle companies, field artillery and armored columns after the matching discoveries. In the four-faction opening those units first appeared in rounds 6, 7, 10 and 12.

31 checks passed. 6 fixed campaigns replayed identically twice. Coastal cities still have few uses for an ocean-facing location. Test a port economy next.

## Civics and a culture economy

Choosing a treasury technology consumed the same research slot as engineering. A separate culture budget now lets cities research science and adopt civic policies in parallel. County Federation adds a third district order on the next turn.

28 checks passed. 6 fixed campaigns replayed identically twice. The next test is whether a discovery changes the units a city can actually train.

## Research across three eras

Four independent research buttons left little reason to plan ahead. A prerequisite tree now links coastal navigation, industry and land warfare. Banking 100 science cannot skip either route into motorization.

25 checks passed. 6 fixed campaigns replayed identically twice. The next playtest asks whether a player can pursue a civilian policy while research is underway.

## Settlement survey

**Playtest finding.** The opening settler can reach 14 destinations. The original command panel showed a single generic spacing rule, which left players to guess how many of those destinations would make a good city site. At desktop width the command panel could also crop the End turn button.

**Changes and result.** The map marks surveyed sites with a solid gold flag for this turn or a hollow blue flag for next turn. The site list gives the movement cost, closest city and distance, and accepts movement orders directly. In the standard opening there are five next-turn sites and no immediate sites. In an interactive playtest, moving from Pico-Union to Pico-Robertson used both movement points and the survey correctly explained that founding becomes available next turn. The repaired turn panel measured 61 pixels high and fully contained its 35-pixel button at a 1,363-pixel viewport. The four settlement regression checks cover timing, spacing, terrain and occupancy. All six scripted campaigns finished with the same outcomes before and after the survey.

**Next question.** Can a first-time player compare two cities' production queues and tell when a new defender will be ready? Play the same opening on a phone and a laptop, then decide what changes would help.

## The Los Angeles Campaign

**What changed.** The command panel, city production, multiplayer rooms, field guide and campaign history now use English. Selecting a friendly unit reveals its reachable tiles. An attack forecast shows both sides' expected hit points before the player confirms the order. The Research Council lets each faction invest science in Agronomy, Industry, Tactics and Civics. Each choice affects the shared game rules in solo and online games.

**What playtesting found.** The previous board made it hard to identify a unit's next destination. The routes, destination markers and faction badges now stay visible over the continuous painted landscape. Opening a move and committing it takes one destination click after selecting the unit. All four unit types have individual illustrated cards. On a small screen, the inspector keeps the selected unit and its orders together.

**How to reproduce the checks.** Run `npm test` to check saved-game migration, movement, production, research, combat forecasts and multiplayer conflicts. Run `npm run playtest` for the deterministic two-, three- and four-faction scenarios. Check the same order in two independent browsers for a release that changes online play.

**Next question.** Can someone playing for the first time tell why a settler can reach a tile but cannot found a city there? Test the opening two turns before deciding whether placement needs its own overlay.

## Units and cities

Replaced territory-only play with settlers, builders, infantry, archers, persistent cities and multi-turn production. Melee can capture cities weakened by a siege. The original map and multiplayer room codes carried forward.
