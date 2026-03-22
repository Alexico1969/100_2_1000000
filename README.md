# Private Control Panel

This project is a lightweight personal website built with plain HTML, CSS, and JavaScript for static deployment on Netlify. The entire site is protected with Netlify's built-in Basic Authentication using the `_headers` file, so there is no custom login page, no backend, and no Netlify Functions involved.

## Architecture

- `index.html` provides the app shell with a desktop sidebar and mobile menu toggle.
- `styles.css` handles the responsive layout and visual system for the private control-panel interface.
- `main.js` fetches local JSON data, switches sections without full page reloads, and powers search/filter interactions.
- `data/dashboard.json` stores dashboard metrics and project progress.
- `data/actions.json` stores action items for the Action Board.
- `data/logs.json` stores searchable log entries.
- `data/documents.json` stores document metadata and external links.
- `_headers.template` stores the header template.
- `scripts/generate-headers.mjs` builds the final `_headers` file from the template and the `PSSW` environment variable.
- `_headers` is the generated output Netlify uses at deploy time.
- `netlify.toml` configures static publishing from the project root.
- `package.json` provides the tiny build step that generates `_headers`.

## Basic Auth

Netlify does not interpolate environment variables directly inside `_headers`. To keep using Netlify's built-in Basic Auth while sourcing the password from an environment variable, this project generates `_headers` during the build from `_headers.template`.

Template:

```text
/*
  Basic-Auth: admin:__PSSW__
```

At build time, `scripts/generate-headers.mjs` replaces `__PSSW__` with the value of the Netlify environment variable `PSSW` and writes the final `_headers` file.

Important: this is safer than committing the password directly in `_headers`, but the deployed site still ultimately uses a generated `_headers` file because that is how Netlify's built-in Basic Auth works.

## Run Locally

Because the site loads JSON with `fetch`, open it through a local web server rather than double-clicking `index.html`.

Option 1:

```bash
set PSSW=your-local-password
npm run build
python -m http.server 8000
```

Then open `http://localhost:8000`.

Option 2:

Use any static file server you already prefer.

## Deploy To Netlify

1. In Netlify, create an environment variable named `PSSW`.
2. Push this project to your Git provider if you want a Git-backed Netlify site.
3. In Netlify, create a new site from your repo or link the folder with the Netlify CLI.
4. Netlify should detect this as a static site and run `npm run build`.
5. The build script will generate `_headers` using `PSSW`.
6. Confirm the publish directory is set to the project root (`.`), which is already defined in `netlify.toml`.
7. Deploy the site.
8. After deploy, visiting the site should show the browser's native Basic Auth prompt before the app loads.

### Netlify CLI Example

```bash
npx netlify login
npx netlify init
npx netlify env:set PSSW yourpasswordhere
npx netlify deploy --prod
```

## Editing Basic Auth Credentials

To change the password later:

1. Update the Netlify environment variable `PSSW` in the Netlify UI, CLI, or API.
2. Redeploy the site to regenerate `_headers`.

To change the username:

1. Edit `_headers.template`.
2. Update the `Basic-Auth:` line's username portion.
3. Redeploy the site.

Limitation: this method still does not mean `_headers` reads environment variables directly. The password is injected at build time, not at request time.

## Replacing Mock Data Later

If you want to move from mock JSON to real data sources:

1. Update the fetch logic in `main.js` inside `loadAllData()`.
2. Point each section to your live API, exported JSON feed, or generated static files.
3. Keep the JSON shape the same if you want the current UI rendering to continue working with minimal changes.
4. If the data shape changes, update the matching render function in `main.js`:
   - `renderDashboard()`
   - `renderActions()`
   - `renderLogs()`
   - `renderDocuments()`

## Upgrading To A Custom Login System Later

If you outgrow Basic Auth and want a custom sign-in flow:

1. Remove the `Basic-Auth` rule from `_headers.template` and stop generating `_headers` for auth.
2. Add your preferred authentication system, such as a hosted identity provider or a custom backend.
3. Replace the static-only architecture with whatever client/server flow your auth provider needs.
4. If you want per-user sessions, protected APIs, or role-based access, you will likely need a backend or managed auth service.

For this version, the current approach is intentionally minimal and appropriate for simple personal/internal protection.
