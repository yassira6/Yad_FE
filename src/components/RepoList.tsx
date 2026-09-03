import { useMemo, useState } from 'react'
import type { GitHubRepo } from '../types'
import { formatDate } from '../utils/file'

interface Props {
  repos: GitHubRepo[]
  selected: GitHubRepo | null
  onSelect: (repo: GitHubRepo) => void
}

export function RepoList({ repos, selected, onSelect }: Props) {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return repos
    return repos.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q),
    )
  }, [repos, filter])

  return (
    <div className="repo-list">
      <input
        className="repo-filter"
        placeholder={`Filter ${repos.length} repositories…`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul>
        {filtered.map((repo) => (
          <li key={repo.id}>
            <button
              type="button"
              className={`repo-item ${selected?.id === repo.id ? 'active' : ''}`}
              onClick={() => onSelect(repo)}
            >
              <div className="repo-item-top">
                <span className="repo-name">{repo.name}</span>
                {repo.private && <span className="badge">private</span>}
              </div>
              {repo.description && <p className="repo-desc">{repo.description}</p>}
              <div className="repo-meta">
                {repo.language && <span>{repo.language}</span>}
                <span>★ {repo.stargazers_count}</span>
                <span>Updated {formatDate(repo.updated_at)}</span>
              </div>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="empty">No repositories match.</li>}
      </ul>
    </div>
  )
}
