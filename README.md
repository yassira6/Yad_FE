# Yad File Explorer

A client-side GitHub repository explorer. Browse any user's or org's repos,
drill into folders, view file contents, copy them to the clipboard, and
download individual files or a whole repo as a zip.

## Features

- Enter a GitHub username or org to list their repositories (search/filter included)
- Optional personal access token (stored only in your browser's `localStorage`)
  for private repos and higher API rate limits
- Folder navigation with breadcrumbs
- File content preview with **Copy** and **Download** buttons
- Binary files (images, archives, fonts, etc.) skip preview and download directly
- One-click **Download repo (.zip)** via GitHub's archive endpoint

This is a static, client-only app — it talks directly to the GitHub REST API
from the browser (`api.github.com`), so there's no backend to run or deploy.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL, enter a GitHub username (e.g. `octocat`),
and click **Load repos**.

## Build

```bash
npm run build
```

Outputs a static site to `dist/`, deployable to any static host (GitHub
Pages, Vercel, Netlify, etc.).

## Notes on tokens

Without a token, requests are unauthenticated and subject to GitHub's public
rate limit (60 requests/hour) and can only see public repos. Generate a
[fine-grained personal access token](https://github.com/settings/tokens) with
read-only repo access to raise the limit and browse private repositories.
The token never leaves your browser except as an `Authorization` header sent
directly to `api.github.com`.
