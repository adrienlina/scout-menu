# scout-menu

## PR CI auto-monitoring

After creating a PR (or when resuming work on an existing PR branch), call `mcp__github__subscribe_pr_activity` with the PR's owner/repo/number so CI failures and review comments stream into the session as `<github-webhook-activity>` events. When a CI failure event arrives, investigate the logs and push a fix without waiting for confirmation. Subscriptions do not survive session resume — re-subscribe at the start of any resumed session that has an open PR.
