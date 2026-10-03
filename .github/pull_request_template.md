## What & why

<!-- What does this PR change and why? Link the task: Closes #123 -->

## How to test

1.

## Checklist

- [ ] PR title follows `type(scope): subject` (it becomes the squash commit)
- [ ] `npm run verify` passes locally
- [ ] Tests cover the new behavior (unit for logic, e2e for HTTP contract)
- [ ] Schema change → migration generated (`npm run db:generate`) and backward compatible
- [ ] API change → `openapi.json` regenerated (`npm run openapi`); breaking changes called out below
- [ ] No secrets, no `process.env` outside `core/config`
- [ ] No new architecture exceptions (`eslint-disable boundaries/*`) — or justified below
