import { useEffect, useState } from 'react'
import { fetchContents, fetchLastCommit, GitHubApiError, rawFileUrl, repoZipUrl } from '../api/github'
import type { GitHubContentEntry, GitHubRepo, LastCommit } from '../types'
import { formatBytes, formatDateTime } from '../utils/file'

interface Props {
  repo: GitHubRepo
  path: string
  token: string | null
  selectedPath: string | null
  onNavigate: (path: string) => void
  onSelectFile: (entry: GitHubContentEntry) => void
}

const COMMIT_FETCH_CONCURRENCY = 4

function icon(entry: GitHubContentEntry) {
  return entry.type === 'dir' ? '📁' : '📄'
}

export function FileExplorer({ repo, path, token, selectedPath, onNavigate, onSelectFile }: Props) {
  const [entries, setEntries] = useState<GitHubContentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastCommits, setLastCommits] = useState<Record<string, LastCommit | null>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setLastCommits({})
    fetchContents(repo.owner.login, repo.name, path, repo.default_branch, token)
      .then((result) => {
        if (cancelled) return
        const list = Array.isArray(result) ? result : [result]
        list.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        setEntries(list)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof GitHubApiError ? err.message : 'Failed to load directory contents.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [repo, path, token])

  useEffect(() => {
    if (entries.length === 0) return
    let cancelled = false
    const queue = [...entries]

    async function worker() {
      while (queue.length > 0) {
        const entry = queue.shift()
        if (!entry) return
        try {
          const commit = await fetchLastCommit(repo.owner.login, repo.name, entry.path, repo.default_branch, token)
          if (!cancelled) setLastCommits((prev) => ({ ...prev, [entry.path]: commit }))
        } catch {
          if (!cancelled) setLastCommits((prev) => ({ ...prev, [entry.path]: null }))
        }
      }
    }

    const workers = Array.from({ length: Math.min(COMMIT_FETCH_CONCURRENCY, entries.length) }, worker)
    Promise.all(workers).catch(() => {})

    return () => {
      cancelled = true
    }
  }, [entries, repo, token])

  const crumbs = path ? path.split('/') : []

  return (
    <div className="file-explorer">
      <div className="breadcrumbs">
        <button type="button" className="crumb" onClick={() => onNavigate('')}>
          {repo.name}
        </button>
        {crumbs.map((segment, idx) => {
          const crumbPath = crumbs.slice(0, idx + 1).join('/')
          return (
            <span key={crumbPath}>
              <span className="crumb-sep">/</span>
              <button type="button" className="crumb" onClick={() => onNavigate(crumbPath)}>
                {segment}
              </button>
            </span>
          )
        })}
      </div>

      {loading && <p className="status">Loading…</p>}
      {error && <p className="status error">{error}</p>}

      {!loading && !error && (
        <ul className="entry-list">
          {entries.map((entry) => {
            const commit = lastCommits[entry.path]
            const downloadHref =
              entry.type === 'dir'
                ? repoZipUrl(repo.owner.login, repo.name, repo.default_branch, entry.path)
                : rawFileUrl(repo.owner.login, repo.name, entry.path, repo.default_branch, true)

            return (
              <li key={entry.path} className="entry-row">
                <button
                  type="button"
                  className={`entry-item ${selectedPath === entry.path ? 'active' : ''}`}
                  onClick={() => (entry.type === 'dir' ? onNavigate(entry.path) : onSelectFile(entry))}
                >
                  <span className="entry-icon">{icon(entry)}</span>
                  <span className="entry-name">{entry.name}</span>
                  {entry.type === 'file' && <span className="entry-size">{formatBytes(entry.size)}</span>}
                </button>
                <span className="entry-modified">
                  {commit === undefined ? '…' : commit ? formatDateTime(commit.date) : '—'}
                </span>
                <a
                  className="entry-download"
                  href={downloadHref}
                  onClick={(e) => e.stopPropagation()}
                  title={entry.type === 'dir' ? `Download ${entry.name} as .zip` : `Download ${entry.name}`}
                  aria-label={`Download ${entry.name}`}
                >
                  ⬇
                </a>
              </li>
            )
          })}
          {entries.length === 0 && <li className="empty">This folder is empty.</li>}
        </ul>
      )}
    </div>
  )
}
