# California atlas series

Each line identifies a runnable revision in the Git history. From a clone on the main branch, locate a version with the command below, then open that revision in a separate worktree to play it.

```sh
git log --format="%h %s" --grep="^v7[.]0[.]"
```

| Version | Feature |
| --- | --- |
| 7.0.1 | Search the campaign's charted places and jump to a named hex from the map |
| 7.0.2 | Find surveyed resource deposits and the exact works needed to use them |
| 7.0.3 | Compare reachable founding sites by timing and movement on the actual map |
| 7.0.4 | Price visible border claims and contests and locate the selected proposal |
| 7.0.5 | Match available construction crews to reachable jobs and remaining work capacity |
| 7.0.6 | Compare legal harbor berths by their sponsoring city and construction time |
