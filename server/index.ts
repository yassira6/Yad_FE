import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import {
  GitHubUpstreamError,
  getContents,
  getLastCommitForPath,
  getLatestCommitDetail,
  getRawFile,
  getZipball,
  listRepos,
} from './githubClient.js'
import { mimeTypeFor } from './mime.js'
import { streamFolderZip, ZipBuildError } from './zip.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 8787
const DEFAULT_TOKEN = process.env.GITHUB_TOKEN || undefined

const app = express()
app.disable('x-powered-by')

function tokenFrom(req: Request): string | undefined {
  const header = req.header('authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return DEFAULT_TOKEN
}

function pathParam(req: Request): string {
  const value = req.params.path as unknown
  if (!value) return ''
  return Array.isArray(value) ? value.join('/') : String(value)
}

function sendError(res: Response, err: unknown) {
  if (err instanceof GitHubUpstreamError) {
    res.status(err.status).json({ message: err.message })
    return
  }
  if (err instanceof ZipBuildError) {
    res.status(404).json({ message: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ message: 'Unexpected server error.' })
}

app.get('/api/repos/:owner', async (req, res) => {
  try {
    res.json(await listRepos(req.params.owner, tokenFrom(req)))
  } catch (err) {
    sendError(res, err)
  }
})

app.get('/api/contents/:owner/:repo{/*path}', async (req, res) => {
  try {
    const { owner, repo } = req.params
    const ref = typeof req.query.ref === 'string' ? req.query.ref : undefined
    res.json(await getContents(owner, repo, pathParam(req), ref, tokenFrom(req)))
  } catch (err) {
    sendError(res, err)
  }
})

app.get('/api/raw/:owner/:repo{/*path}', async (req, res) => {
  try {
    const { owner, repo } = req.params
    const filePath = pathParam(req)
    if (!filePath) {
      res.status(400).json({ message: 'A file path is required.' })
      return
    }
    const ref = typeof req.query.ref === 'string' ? req.query.ref : undefined
    const { buffer, filename } = await getRawFile(owner, repo, filePath, ref, tokenFrom(req))
    res.setHeader('Content-Type', mimeTypeFor(filename))
    res.setHeader('Cache-Control', 'private, max-age=60')
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`)
    }
    res.send(buffer)
  } catch (err) {
    sendError(res, err)
  }
})

app.get('/api/last-commit/:owner/:repo{/*path}', async (req, res) => {
  try {
    const { owner, repo } = req.params
    const ref = typeof req.query.ref === 'string' ? req.query.ref : undefined
    if (!ref) {
      res.status(400).json({ message: 'A ref is required.' })
      return
    }
    const commit = await getLastCommitForPath(owner, repo, pathParam(req), ref, tokenFrom(req))
    res.json(commit)
  } catch (err) {
    sendError(res, err)
  }
})

app.get('/api/latest-commit/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params
    const ref = typeof req.query.ref === 'string' ? req.query.ref : undefined
    if (!ref) {
      res.status(400).json({ message: 'A ref is required.' })
      return
    }
    res.json(await getLatestCommitDetail(owner, repo, ref, tokenFrom(req)))
  } catch (err) {
    sendError(res, err)
  }
})

app.get('/api/zip/:owner/:repo/:ref{/*path}', async (req, res) => {
  try {
    const { owner, repo, ref } = req.params
    const folderPath = pathParam(req)
    const safeRef = ref.replace(/[^a-zA-Z0-9._-]+/g, '-')

    if (folderPath) {
      const safeFolder = folderPath.replace(/[^a-zA-Z0-9._-]+/g, '-')
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${repo}-${safeFolder}.zip"`)
      await streamFolderZip(res, owner, repo, ref, folderPath, tokenFrom(req))
      return
    }

    const upstream = await getZipball(owner, repo, ref, tokenFrom(req))
    if (!upstream.body) {
      res.status(502).json({ message: 'No response body from GitHub.' })
      return
    }
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${repo}-${safeRef}.zip"`)
    Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(res)
  } catch (err) {
    sendError(res, err)
  }
})

const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Yad File Explorer API listening on http://localhost:${PORT}`)
  if (DEFAULT_TOKEN) console.log('Using GITHUB_TOKEN from environment as the default token.')
})
