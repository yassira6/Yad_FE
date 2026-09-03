import { useRef, useState } from 'react'
import { fetchFileList, fetchRawBlob, GitHubApiError } from '../api/github'
import type { GitHubRepo } from '../types'

interface Props {
  repo: GitHubRepo
  token: string | null
}

type Phase = 'idle' | 'picking' | 'listing' | 'writing' | 'done' | 'error'

async function writeFile(root: FileSystemDirectoryHandle, filePath: string, blob: Blob): Promise<void> {
  const segments = filePath.split('/')
  const name = segments.pop()
  if (!name) return
  let dir = root
  for (const segment of segments) {
    dir = await dir.getDirectoryHandle(segment, { create: true })
  }
  const fileHandle = await dir.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}

export function SaveToFolderButton({ repo, token }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef(false)

  const supported = typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
  if (!supported) return null

  const start = async () => {
    setError(null)
    setPhase('picking')

    let root: FileSystemDirectoryHandle
    try {
      root = await window.showDirectoryPicker!({ mode: 'readwrite' })
    } catch {
      setPhase('idle')
      return
    }

    setPhase('listing')
    let files: { path: string; size: number }[]
    try {
      files = await fetchFileList(repo.owner.login, repo.name, repo.default_branch, '', token)
    } catch (err) {
      setError(err instanceof GitHubApiError ? err.message : 'Failed to list files.')
      setPhase('error')
      return
    }

    cancelRef.current = false
    setPhase('writing')
    setProgress({ done: 0, total: files.length })

    for (let i = 0; i < files.length; i++) {
      if (cancelRef.current) break
      const file = files[i]
      try {
        const blob = await fetchRawBlob(repo.owner.login, repo.name, file.path, repo.default_branch, token)
        await writeFile(root, file.path, blob)
      } catch {
        // skip files that fail to fetch/write, keep going
      }
      setProgress({ done: i + 1, total: files.length })
    }

    setPhase(cancelRef.current ? 'idle' : 'done')
  }

  const cancel = () => {
    cancelRef.current = true
  }

  const reset = () => {
    setPhase('idle')
    setError(null)
  }

  if (phase === 'idle') {
    return (
      <button type="button" className="link-button" onClick={start}>
        Save to folder
      </button>
    )
  }

  if (phase === 'picking') return <span className="status muted">Choose a folder…</span>
  if (phase === 'listing') return <span className="status muted">Listing files…</span>

  if (phase === 'writing') {
    return (
      <span className="download-all-confirm">
        <span>
          Saving {progress.done}/{progress.total}…
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
      <span>Saved {progress.total} files, real folder structure, no renaming.</span>
      <button type="button" className="link-button" onClick={reset}>
        Dismiss
      </button>
    </span>
  )
}
