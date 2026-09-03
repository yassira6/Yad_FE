import { useEffect, useState } from 'react'
import { decodeBase64Content, fetchContents, GitHubApiError } from '../api/github'
import type { GitHubContentEntry, GitHubFileContent, GitHubRepo } from '../types'
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

    async function load() {
      try {
        const result = await fetchContents(repo.owner.login, repo.name, entry.path, repo.default_branch, token)
        if (cancelled) return
        const file = result as GitHubFileContent
        if (file.content && file.encoding === 'base64') {
          setContent(decodeBase64Content(file.content))
        } else if (file.download_url) {
          const res = await fetch(file.download_url)
          if (!res.ok) throw new Error(`Failed to fetch raw file (${res.status})`)
          setContent(await res.text())
        } else {
          setError('No content available for this file.')
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof GitHubApiError ? err.message : 'Failed to load file content.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
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
    if (content !== null) {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      triggerDownload(url, entry.name)
      URL.revokeObjectURL(url)
    } else if (entry.download_url) {
      triggerDownload(entry.download_url, entry.name)
    }
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
          <button type="button" onClick={download} disabled={!content && !entry.download_url}>
            Download
          </button>
          <a className="ghost-link" href={entry.html_url} target="_blank" rel="noreferrer">
            View on GitHub
          </a>
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

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
