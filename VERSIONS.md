# California atlas series

Each line identifies a runnable revision in the Git history. From a clone on the main branch, locate a version with the command below, then open that revision in a separate worktree to play it.

```sh
git log --format="%h %s" --grep="^v7[.]0[.]"
```

| Version | Feature |
| --- | --- |
| 7.0.1 | Search the campaign's charted places and jump to a named hex from the map |
