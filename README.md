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
