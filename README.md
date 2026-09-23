# JLCG Task Workspace

A complete multi-page task tracker styled with the supplied JLCG logo.

## Run locally

Install Node.js 22.13 or later, then run:

    npm ci
    npm run dev

Open the Local URL printed by the server (normally http://localhost:3000).

## Pages

- Overview: open, today, overdue, completed counts and completion progress.
- All tasks: create, edit, delete, complete, filter, search, and export CSV.
- Priority matrix: automatic Eisenhower classification by importance and urgency.
- Calendar: month/year selection, Monday/Sunday start, filters, daily task creation and agenda.
- Reports: priority completion, status and category breakdowns.
- Settings: workspace name, categories, and calendar preference.
- Guide: instructions for using the workspace.

Data is stored in a local Cloudflare D1 database during development, under .wrangler. Keep this folder to retain local data. A Sites deployment uses its own hosted D1 database; local records are not automatically transferred. The app starts empty. Assignees are names recorded on tasks; assigning a name does not send notifications or grant access.

## Verification

    npx tsc --noEmit
    npm run build
    node tests/workspace-api.mjs

The API verification requires the local server, creates one temporary task, verifies persistence and validation, checks all seven routes, and removes the temporary task.

## Hosting

This project is prepared for Sites private hosting with DB declared in .openai/hosting.json. Publishing was not completed because the Sites connector could not connect. Do not expose this app publicly without access controls: it is designed for a private workspace.

### Vercel

The default `npm run build` creates a Cloudflare Worker, not a Vercel deployment.
`vercel.json` selects Next.js and `npm run build:vercel` so Vercel generates page
and API functions instead of serving the Worker output as static files.

1. Import this repository into Vercel, or use the existing `jlcg-matrix` project.
   Set Root Directory to the folder containing `package.json` and `vercel.json`.
2. Use the Next.js framework preset, build command `npm run build:vercel`, and
   output directory `.next`. Remove old dashboard overrides pointing at `dist`.
3. Create or select a hosted Cloudflare D1 database. In Vercel's environment
   variables, set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and
   `CLOUDFLARE_D1_API_TOKEN` for the deployment's environment. The token needs
   Account > D1 > Edit permission scoped to the account holding that database.
   Keep these values server-side; do not commit them or use `NEXT_PUBLIC_`.
4. Deploy the updated source. The database tables are created on first API use.
   The UI can render without the database variables, but loading and saving tasks
   require them. Existing `.wrangler` data is local and is not uploaded by deployment.
5. Verify the Production deployment is assigned to `jlcg-matrix.vercel.app`.

For a local check of the Vercel build, copy `.env.example` to `.env.local`, fill in
the hosted database values, then run `npm run build:vercel` and
`npm run start:vercel`. These commands use the hosted database; `npm run dev`
continues using the local Cloudflare database.

Database adapter checks: `node --experimental-strip-types --test tests/d1-http.test.mjs`.
