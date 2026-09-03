import { useState, type FormEvent } from 'react'

interface Props {
  owner: string
  token: string
  onOwnerChange: (owner: string) => void
  onTokenChange: (token: string) => void
  onLoad: (owner: string) => void
  loading: boolean
}

export function SourceBar({ owner, token, onOwnerChange, onTokenChange, onLoad, loading }: Props) {
  const [ownerInput, setOwnerInput] = useState(owner)
  const [tokenInput, setTokenInput] = useState(token)
  const [showToken, setShowToken] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onOwnerChange(ownerInput.trim())
    onLoad(ownerInput.trim())
  }

  return (
    <form className="source-bar" onSubmit={submit}>
      <div className="field">
        <label htmlFor="owner">GitHub user or org</label>
        <input
          id="owner"
          placeholder="e.g. torvalds"
          value={ownerInput}
          onChange={(e) => setOwnerInput(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="field">
        <label htmlFor="token">
          Personal access token <span className="hint">(optional, for private repos &amp; higher rate limits)</span>
        </label>
        <div className="token-input">
          <input
            id="token"
            type={showToken ? 'text' : 'password'}
            placeholder="ghp_..."
            value={tokenInput}
            onChange={(e) => {
              setTokenInput(e.target.value)
              onTokenChange(e.target.value.trim())
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" className="ghost" onClick={() => setShowToken((s) => !s)}>
            {showToken ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <button type="submit" className="primary" disabled={loading || !ownerInput.trim()}>
        {loading ? 'Loading…' : 'Load repos'}
      </button>
    </form>
  )
}
