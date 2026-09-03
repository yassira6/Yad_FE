import { useEffect, useState } from 'react'
import { fetchContents, GitHubApiError } from '../api/github'
import type { GitHubContentEntry, GitHubRepo } from '../types'
import { formatBytes } from '../utils/file'

interface Props {
  repo: GitHubRepo
  path: string
  token: string | null
  selectedPath: string | null
  onNavigate: (path: string) => void
  onSelectFile: (entry: GitHubContentEntry) => void
}

function icon(entry: GitHubContentEntry) {
  return entry.type === 'dir' ? '📁' : '📄'
}

export function FileExplorer({ repo, path, token, selectedPath, onNavigate, onSelectFile }: Props) {
  const [entries, setEntries] = useState<GitHubContentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
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
          {entries.map((entry) => (
            <li key={entry.path}>
              <button
                type="button"
                className={`entry-item ${selectedPath === entry.path ? 'active' : ''}`}
                onClick={() => (entry.type === 'dir' ? onNavigate(entry.path) : onSelectFile(entry))}
              >
                <span className="entry-icon">{icon(entry)}</span>
                <span className="entry-name">{entry.name}</span>
                {entry.type === 'file' && <span className="entry-size">{formatBytes(entry.size)}</span>}
              </button>
            </li>
          ))}
          {entries.length === 0 && <li className="empty">This folder is empty.</li>}
        </ul>
      )}
    </div>
  )
}
