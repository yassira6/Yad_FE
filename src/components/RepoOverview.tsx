import { useEffect, useState } from 'react'
import { fetchLatestCommitDetail, GitHubApiError } from '../api/github'
import type { GitHubRepo, LatestCommitDetail } from '../types'
import { formatDateTime } from '../utils/file'

interface Props {
  repo: GitHubRepo
  token: string | null
  onOpenFile: (filePath: string) => void
}

const STATUS_LABEL: Record<string, string> = {
  added: 'added',
  removed: 'removed',
  modified: 'modified',
  renamed: 'renamed',
}

export function RepoOverview({ repo, token, onOpenFile }: Props) {
  const [detail, setDetail] = useState<LatestCommitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)
    fetchLatestCommitDetail(repo.owner.login, repo.name, repo.default_branch, token)
      .then((result) => {
        if (!cancelled) setDetail(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof GitHubApiError ? err.message : 'Failed to load recent activity.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [repo, token])

  if (loading) return <div className="repo-overview status">Loading last-updated files…</div>
  if (error) return <div className="repo-overview status error">{error}</div>
  if (!detail) return null

  return (
    <div className="repo-overview">
      <div className="repo-overview-header">
        <span className="repo-overview-label">Last updated</span>
        <span className="repo-overview-date">{formatDateTime(detail.date)}</span>
      </div>
      <p className="repo-overview-message">
        {detail.message}
        {detail.author && <span className="repo-overview-author"> · {detail.author}</span>}
      </p>
      {detail.files.length > 0 ? (
        <ul className="repo-overview-files">
          {detail.files.map((file) => (
            <li key={file.filename}>
              <button type="button" onClick={() => onOpenFile(file.filename)}>
                <span className={`file-status file-status-${file.status}`}>
                  {STATUS_LABEL[file.status] ?? file.status}
                </span>
                <span className="file-path">{file.filename}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="status muted">No file changes on the latest commit.</p>
      )}
    </div>
  )
}
