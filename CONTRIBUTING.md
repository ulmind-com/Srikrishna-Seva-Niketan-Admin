# Contributing — Srikrishna Seva Niketan Admin Panel

## Getting set up

1. `cp .env.example .env` → set `VITE_API_BASE_URL` to your backend (`…/api/v1`).
2. `npm install`
3. `npm run dev` → http://localhost:5173 (needs the backend running).

## Adding a CRUD module (the fast path)

Most screens are **config-driven**. To add one:

1. Add the API path in `src/services/api/endpoints.ts` and a service in
   `src/services/resources.ts`.
2. Add a TS type in `src/types/models.ts`.
3. Create `src/config/resources/<name>.config.tsx` (columns, fields, filters,
   `permission`). Reuse `branchField()` / `BranchName` for location-scoped data.
4. Export a page in `src/pages/resource-pages.tsx`, add a `<Route>` in
   `src/routes/index.tsx`, and a nav item in `src/config/navigation.ts`.

Need something custom (reports, dashboards)? Add a page under `src/pages/`.

## Conventions

- **Permissions:** gate nav/actions with the `permission` key / `hasPermission`.
- **Server state** goes through TanStack Query; **forms** through React Hook Form.
- **Styling:** Tailwind + shadcn/ui primitives in `src/components/ui`. Keep it
  consistent with existing components; support light & dark.
- Type everything. No `any` unless unavoidable.

## Branching & commits

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`.
- [Conventional Commits](https://www.conventionalcommits.org/): `feat: add reports tab`.

## Before you open a PR

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] No secrets / `.env` in tracked files

CI must be green. Fill in the PR template.
