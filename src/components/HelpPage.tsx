import { useState } from 'react'
import { FLATTEN_RESTORE_SCRIPT, FLATTEN_RESTORE_SCRIPT_NAME } from '../help/scripts'

interface Props {
  onClose: () => void
}

export function HelpPage({ onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const copyScript = async () => {
    await navigator.clipboard.writeText(FLATTEN_RESTORE_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const downloadScript = () => {
    const blob = new Blob([FLATTEN_RESTORE_SCRIPT], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = FLATTEN_RESTORE_SCRIPT_NAME
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="help-page">
      <div className="help-header">
        <h2>Help</h2>
        <button type="button" className="link-button" onClick={onClose}>
          ← Back to explorer
        </button>
      </div>

      <section className="help-section">
        <h3>Downloading files</h3>
        <ul>
          <li>
            <strong>Save to folder</strong> (Chrome, Edge, Brave) — pick a local folder once; every file is written
            with its real name into real subfolders matching the repo, exactly as it looks on GitHub.
          </li>
          <li>
            <strong>Download all files</strong> (any browser) — a fallback for browsers without folder access.
            Browsers strip <code>/</code> from a downloaded file's name, so there's no way to make this create real
            subfolders — instead each file is saved flat, with its path joined by <code>__</code> in place of{' '}
            <code>/</code> (e.g. <code>src__components__FileExplorer.tsx</code> means{' '}
            <code>src/components/FileExplorer.tsx</code>).
          </li>
        </ul>
      </section>

      <section className="help-section">
        <h3>Scripts</h3>
        <div className="help-script">
          <div className="help-script-header">
            <div>
              <h4>Folders for flattened names</h4>
              <p>
                A Windows Command Prompt script. Run it inside the folder where "Download all files" saved its
                files, and it recreates the folders and moves/renames each file back into its original location.
              </p>
            </div>
            <div className="help-script-actions">
              <button type="button" onClick={copyScript}>
                {copied ? 'Copied!' : 'Copy script'}
              </button>
              <button type="button" onClick={downloadScript}>
                Download .cmd
              </button>
            </div>
          </div>
          <pre className="help-script-body">
            <code>{FLATTEN_RESTORE_SCRIPT}</code>
          </pre>
        </div>
      </section>
    </div>
  )
}
