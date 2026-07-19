# Docs

| Document | Description |
| --- | --- |
| [PRODUCT_ARCHITECTURE.md](./PRODUCT_ARCHITECTURE.md) | Navigation IA, Billing/Users/Roles recommendations (pre-isolation) |
| [WORKSPACE_ARCHITECTURE.md](./WORKSPACE_ARCHITECTURE.md) | Multi-workspace / `workspace_id` technical specification |
| [VERCEL_ARCHITECTURE.md](./VERCEL_ARCHITECTURE.md) | Vercel deployment / host / middleware architecture (source for generated diagrams) |
| [GITHUB_ARCHITECTURE.md](./GITHUB_ARCHITECTURE.md) | GitHub repository layout / modules / hygiene (source for generated diagrams) |
| [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) | Debt register and hygiene notes |
| [diagrams/](./diagrams/) | Generated visuals from the workspace architecture doc |

Served diagram artifacts:

- Vercel: `npm run diagram:vercel-architecture` → [`../public/architecture/vercel-architecture.svg`](../public/architecture/vercel-architecture.svg)
- GitHub: `npm run diagram:github-architecture` → [`../public/architecture/github-architecture.svg`](../public/architecture/github-architecture.svg)

Root-level companion docs:

- [../ARCHITECTURE.md](../ARCHITECTURE.md)
- [../DEPLOYMENT.md](../DEPLOYMENT.md)
- [../CONTRIBUTING.md](../CONTRIBUTING.md)
- [../README.md](../README.md)
