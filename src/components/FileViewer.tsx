import { useEffect, useState } from 'react'
import { fetchRawText, GitHubApiError, rawFileUrl } from '../api/github'
import type { GitHubContentEntry, GitHubRepo } from '../types'
import { formatBytes, looksBinary } from '../utils/file'

interface Props {
  repo: GitHubRepo
  entry: GitHubContentEntry
  token: string | null
  onClose: () => void
}

export function FileViewer({ repo, entry, token, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const binary = looksBinary(entry.name)

  useEffect(() => {
    let cancelled = false
    setContent(null)
    setError(null)
    setCopied(false)
    if (binary) {
      setLoading(false)
      return
    }
    setLoading(true)

    fetchRawText(repo.owner.login, repo.name, entry.path, repo.default_branch, token)
      .then((text) => {
        if (!cancelled) setContent(text)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof GitHubApiError ? err.message : 'Failed to load file content.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [repo, entry, token, binary])

  const copy = async () => {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    const url = rawFileUrl(repo.owner.login, repo.name, entry.path, repo.default_branch, true)
    const a = document.createElement('a')
    a.href = url
    a.download = entry.name
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="file-viewer">
      <div className="file-viewer-header">
        <div>
          <h3>{entry.name}</h3>
          <span className="file-meta">{formatBytes(entry.size)}</span>
        </div>
        <div className="file-actions">
          <button type="button" onClick={copy} disabled={!content}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button type="button" onClick={download}>
            Download
          </button>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close file">
            ✕
          </button>
        </div>
      </div>

      <div className="file-viewer-body">
        {binary && (
          <div className="status">
            Preview not available for this file type. Use Download to save it.
          </div>
        )}
        {!binary && loading && <div className="status">Loading…</div>}
        {!binary && error && <div className="status error">{error}</div>}
        {!binary && !loading && !error && content !== null && <pre><code>{content}</code></pre>}
      </div>
    </div>
  )
}
