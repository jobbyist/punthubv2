# Launch-day copy flip (1 December 2026)

On 9 Nov 2026 pre-launch wording was added to the strings below so the site does not imply picks, the leaderboard or rewards are live. When Puntr launches, restore the live wording (or make it phase-aware). Keys are in `src/locales/en-ZA/<file>.json`.

| File: key | Pre-launch wording says | Restore to |
| --- | --- | --- |
| home: hero.body, board.empty, steps.s2.body | picks open 1 Dec; leaderboard starts at launch | live "post a pick" wording |
| community: composer.prompt, composer.locked, composer.post, feed.empty.new | picks open 1 Dec | "Post a pick on an upcoming match", "Choose a match", "Be the first" |
| predictions: meta.description, subtitle, gate.label, gate.values | picks open at launch | "Post a pick before kick-off", "unlock today's predictions" |
| howitworks: meta.description, intro | opens for picks 1 Dec | evergreen intro |
| founding: perks.f2, steps.s2.body, steps.s3.body; pricing: founding.f2 | "from launch on 1 December 2026" | remove date |
| rewards: meta.description | "once rewards open" | "Earn PuntPoints ... redeem" |
| intel: gate.title, gate.body | "open at launch" | "Unlock All Matchday Predictions" wording (only if the feature exists) |
| auth: gate.default, join.done.body | ready when predictions open | live wording; join.done.cta back to "See predictions" -> /predictions |
