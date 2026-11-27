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

The script plays six campaigns twice. It covers two, three and four factions. Each configuration uses the normal AI opening and a second opening in which California Republic commissions a workshop first. Every later decision comes from the rules engine. Each pair must produce identical actions, final state and counters. The replay hash covers the actions and final state. Timings are excluded so a faster computer cannot change the report.

Compare the same seat count and opening across revisions. Look at campaign length, movement, cities founded or captured, completed projects, technology and winners together. More attacks can mean either a productive campaign or a stalled front. These openings revisit fixed factions in fixed places. Their winner counts cannot estimate a human player's chance of winning.

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
