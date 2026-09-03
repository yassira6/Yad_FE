import { useRef, useState } from 'react'
import { fetchFileList, GitHubApiError, rawFileUrl } from '../api/github'
import type { GitHubRepo } from '../types'

interface Props {
  repo: GitHubRepo
  token: string | null
}

type Phase = 'idle' | 'listing' | 'confirm' | 'downloading' | 'done' | 'error'

const DELAY_MS = 300
const WARN_THRESHOLD = 50

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function DownloadAllButton({ repo, token }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [files, setFiles] = useState<{ path: string; size: number }[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef(false)

  const startListing = async () => {
    setPhase('listing')
    setError(null)
    try {
      const list = await fetchFileList(repo.owner.login, repo.name, repo.default_branch, '', token)
      setFiles(list)
      setPhase('confirm')
    } catch (err) {
      setError(err instanceof GitHubApiError ? err.message : 'Failed to list files.')
      setPhase('error')
    }
  }

  const confirmDownload = async () => {
    setPhase('downloading')
    setProgress(0)
    cancelRef.current = false
    for (let i = 0; i < files.length; i++) {
      if (cancelRef.current) break
      const file = files[i]
      const filename = file.path.replace(/\//g, '__')
      const url = rawFileUrl(repo.owner.login, repo.name, file.path, repo.default_branch, true, filename)
      triggerDownload(url, filename)
      setProgress(i + 1)
      if (i < files.length - 1) await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    }
    setPhase(cancelRef.current ? 'idle' : 'done')
  }

  const cancel = () => {
    cancelRef.current = true
  }

  const reset = () => {
    setPhase('idle')
    setFiles([])
    setProgress(0)
    setError(null)
  }

  if (phase === 'idle') {
    return (
      <button type="button" className="link-button" onClick={startListing}>
        Download all files
      </button>
    )
  }

  if (phase === 'listing') {
    return <span className="status muted">Listing files…</span>
  }

  if (phase === 'confirm') {
    return (
      <span className="download-all-confirm">
        <span>
          Download {files.length} files individually? Your browser will ask you to allow multiple downloads
          {files.length > WARN_THRESHOLD ? ` (this repo has a lot of files — it'll take a bit)` : ''} — allow it once
          and the rest continue automatically.
        </span>
        <button type="button" className="link-button" onClick={confirmDownload}>
          Start
        </button>
        <button type="button" className="link-button" onClick={reset}>
          Cancel
        </button>
      </span>
    )
  }

  if (phase === 'downloading') {
    return (
      <span className="download-all-confirm">
        <span>
          Downloading {progress}/{files.length}…
        </span>
        <button type="button" className="link-button" onClick={cancel}>
          Stop
        </button>
      </span>
    )
  }

  if (phase === 'error') {
    return (
      <span className="download-all-confirm">
        <span className="status error">{error}</span>
        <button type="button" className="link-button" onClick={reset}>
          Dismiss
        </button>
      </span>
    )
  }

  return (
    <span className="download-all-confirm">
      <span>Downloaded {files.length} files.</span>
      <button type="button" className="link-button" onClick={reset}>
        Dismiss
      </button>
    </span>
  )
}
