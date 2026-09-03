# Yad File Explorer

A GitHub repository explorer with a small backend that proxies every GitHub
call. Browse any user's or org's repos, drill into folders, view file
contents, copy them to the clipboard, and download individual files or a
whole repo as a zip — **all traffic goes through this app's own server**,
never directly from the browser to `github.com`. That means it works from
networks where GitHub itself is blocked, as long as the machine running the
server can reach GitHub.

```
Browser  ──same-origin /api/*──▶  This app's server  ──HTTPS──▶  GitHub API
```

## Features

- Enter a GitHub username or org to list their repositories (search/filter included)
- Optional personal access token for private repos and higher API rate limits
  — send it from the browser per-request, or set it once as a server-side
  `GITHUB_TOKEN` env var so nobody has to enter one
- Folder navigation with breadcrumbs
- File content preview with **Copy** and **Download** buttons — both routed
  through the server, not `raw.githubusercontent.com`
- Binary files (images, archives, fonts, etc.) skip preview and download directly
- One-click **Download repo (.zip)**, streamed through the server from
  GitHub's archive endpoint

## Getting started

```bash
npm install
cp .env.example .env   # optional: set GITHUB_TOKEN if you want a shared default
npm run dev
```

`npm run dev` runs both the Vite frontend (port 5173) and the Express API
backend (port 8787) together; the frontend proxies `/api` requests to the
backend. Open http://localhost:5173, enter a GitHub username (e.g.
`octocat`), and click **Load repos**.

## Production

```bash
npm run build   # builds the frontend into dist/
npm start        # single process: serves dist/ + the /api routes
```

`npm start` runs one Node process that serves the built frontend and the API
together on `PORT` (default `8787`) — that's the process you'd deploy to a
server, VM, or container that has network access to GitHub, so people on a
GitHub-blocked network can reach *it* instead.

## How the proxy works

The server (`server/index.ts`) exposes:

- `GET /api/repos/:owner` — list a user's or org's repos
- `GET /api/contents/:owner/:repo/*path?ref=` — list a folder or get file metadata
- `GET /api/raw/:owner/:repo/*path?ref=&download=1` — stream a file's raw bytes (add `download=1` to force a browser download)
- `GET /api/zip/:owner/:repo/:ref` — stream the repo's zip archive

Every route accepts an `Authorization: Bearer <token>` header from the
client and forwards it to GitHub; if the client sends none, it falls back to
the server's own `GITHUB_TOKEN` environment variable when set. The token
never has to leave your network.

## Notes on tokens

Without a token, requests are unauthenticated and subject to GitHub's public
rate limit (60 requests/hour) and can only see public repos. Generate a
[fine-grained personal access token](https://github.com/settings/tokens) with
read-only **Contents** access to raise the limit and browse private
repositories, then either paste it into the app's token field or set it as
`GITHUB_TOKEN` in the server's environment.
