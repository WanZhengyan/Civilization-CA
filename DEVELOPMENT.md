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

The current script plays 18 campaigns twice, six on each California map. It covers two, three and four factions. For each region, each configuration uses the normal AI opening and a second opening in which the first seat commissions a workshop after founding. Every later decision comes from the rules engine. Each pair must produce identical actions, final state and counters. The replay hash covers the actions and final state. Timings are excluded so a faster computer cannot change the report.

Compare the same seat count and opening across revisions. Look at campaign length, movement, cities founded or captured, completed projects, technology and winners together. More attacks can mean either a productive campaign or a stalled front. These 18 scenarios use reproducible seeds, drawing their factions and starting locations from the same rules as a new campaign. Their winner counts cannot estimate a human player's chance of winning.

## Check what a player experiences

- Play one opening turn without consulting the source. Use a keyboard to choose a unit, identify a reachable tile, select production and read a combat forecast. Check focus, labels and whether movement and attack targets remain distinct without color.
- On a narrow screen, select neighboring units, move one and check that its new location and remaining movement are clear. Compare a forecast with the battle that follows.
- Open the deployed game in two independent browser sessions. Share a room link, join from the second session, perform a legal action, pass the turn and reload both seats. Compare ownership, turn and research state across both views. Record the actual URL and result with the review.

For each version, keep a short review with the hypothesis, reference and candidate revisions, report files, the manual observations and the decision. Keep the change when the evidence addresses the original question, or revise it and repeat.

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
