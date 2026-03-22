# Private Control Panel

This project is a lightweight personal website built with plain HTML, CSS, and JavaScript for static deployment on Netlify. The entire site is protected by a Netlify Edge Function that serves a password page, verifies the password against an environment variable, and stores a signed authentication cookie.

## Architecture

- `index.html` provides the app shell with a desktop sidebar and mobile menu toggle.
- `styles.css` handles the responsive layout and visual system for the private control-panel interface.
- `main.js` fetches local JSON data, switches sections without full page reloads, and powers search/filter interactions.
- `login.html` is the password page shown before access is granted.
- `netlify/edge-functions/auth.js` protects every route, validates the password, and issues the signed cookie.
- `data/dashboard.json` stores dashboard metrics and project progress.
- `data/actions.json` stores action items for the Action Board.
- `data/logs.json` stores searchable log entries.
- `data/documents.json` stores document metadata and external links.
- `_headers` is no longer used for authentication.
- `netlify.toml` configures static publishing from the project root.
- `package.json` is minimal because no build step is required for auth.

## Authentication Flow

The site is protected with a Netlify Edge Function instead of Netlify Basic Auth. The flow is:

1. A request hits the Edge Function.
2. If a valid signed cookie is present, the request continues to the site.
3. If not, the visitor is redirected to `login.html`.
4. The login form posts to `/auth/login`.
5. The Edge Function compares the submitted password to the `SITE_PASSWORD` environment variable.
6. If the password matches, the Edge Function creates an HTTP-only signed cookie using `AUTH_SECRET`.
7. Future requests are allowed while the cookie remains valid.

Required Netlify environment variables:

- `SITE_PASSWORD`: the password you type into the site login page
- `AUTH_SECRET`: a long random secret used to sign the auth cookie

## Run Locally

Because the site loads JSON with `fetch`, open it through a local web server rather than double-clicking `index.html`.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Note: the Edge Function auth flow only runs on Netlify, so local static serving does not reproduce the full login flow.

## Deploy To Netlify

1. In Netlify, create these environment variables:
   - `SITE_PASSWORD`
   - `AUTH_SECRET`
2. Push this project to your Git provider if you want a Git-backed Netlify site.
3. In Netlify, create a new site from your repo or link the folder with the Netlify CLI.
4. Confirm the publish directory is set to the project root (`.`), which is already defined in `netlify.toml`.
5. Deploy the site.
6. After deploy, visiting the site should redirect to `/login` before the app loads.

### Netlify CLI Example

```bash
npx netlify login
npx netlify init
npx netlify env:set SITE_PASSWORD yourpasswordhere
npx netlify env:set AUTH_SECRET your-long-random-secret
npx netlify deploy --prod
```

## Editing Credentials

To change the password later:

1. Update the Netlify environment variable `SITE_PASSWORD`.
2. Redeploy the site.

To rotate the signing secret:

1. Update the Netlify environment variable `AUTH_SECRET`.
2. Redeploy the site.
3. Existing cookies will stop working, which effectively logs out all active sessions.

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

## Upgrading To A Different Auth System Later

1. Remove or replace the Edge Function in `netlify/edge-functions/auth.js`.
2. Add your preferred identity provider or backend auth system.
3. Replace the current password-and-cookie flow with your new provider's session model.

This version is designed to stay lightweight while still enforcing access server-side on Netlify.
