import { useEffect, useState } from 'react'
import './App.css'
import { fetchUserRepos, GitHubApiError, repoZipUrl } from './api/github'
import { FileExplorer } from './components/FileExplorer'
import { FileViewer } from './components/FileViewer'
import { RepoList } from './components/RepoList'
import { SourceBar } from './components/SourceBar'
import { useLocalStorage } from './hooks/useLocalStorage'
import type { GitHubContentEntry, GitHubRepo } from './types'

function App() {
  const [owner, setOwner] = useLocalStorage('yad-fe:owner', '')
  const [token, setToken] = useLocalStorage('yad-fe:token', '')

  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [repoError, setRepoError] = useState<string | null>(null)

  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [path, setPath] = useState('')
  const [selectedFile, setSelectedFile] = useState<GitHubContentEntry | null>(null)

  const loadRepos = (ownerToLoad: string) => {
    if (!ownerToLoad) return
    setLoadingRepos(true)
    setRepoError(null)
    setSelectedRepo(null)
    setSelectedFile(null)
    setPath('')
    fetchUserRepos(ownerToLoad, token || null)
      .then(setRepos)
      .catch((err) => {
        setRepos([])
        setRepoError(err instanceof GitHubApiError ? err.message : 'Failed to load repositories.')
      })
      .finally(() => setLoadingRepos(false))
  }

  useEffect(() => {
    if (owner) loadRepos(owner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo)
    setPath('')
    setSelectedFile(null)
  }

  const navigate = (nextPath: string) => {
    setPath(nextPath)
    setSelectedFile(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Yad File Explorer</h1>
        <p className="subtitle">Browse GitHub repositories, view file contents, copy, and download.</p>
      </header>

      <SourceBar
        owner={owner}
        token={token}
        onOwnerChange={setOwner}
        onTokenChange={setToken}
        onLoad={loadRepos}
        loading={loadingRepos}
      />

      {repoError && <p className="status error top-level-error">{repoError}</p>}

      <div className="workspace">
        <aside className="sidebar">
          {repos.length > 0 ? (
            <RepoList repos={repos} selected={selectedRepo} onSelect={selectRepo} />
          ) : (
            !loadingRepos && <p className="status muted">Enter a GitHub user or org above to load their repositories.</p>
          )}
        </aside>

        <main className="content">
          {selectedRepo ? (
            <>
              <div className="repo-header">
                <div>
                  <h2>{selectedRepo.full_name}</h2>
                  {selectedRepo.description && <p>{selectedRepo.description}</p>}
                </div>
                <div className="repo-header-actions">
                  <a href={repoZipUrl(selectedRepo.owner.login, selectedRepo.name, selectedRepo.default_branch)}>
                    Download repo (.zip)
                  </a>
                </div>
              </div>

              <div className="explorer-layout">
                <FileExplorer
                  repo={selectedRepo}
                  path={path}
                  token={token || null}
                  selectedPath={selectedFile?.path ?? null}
                  onNavigate={navigate}
                  onSelectFile={setSelectedFile}
                />
                {selectedFile && (
                  <FileViewer
                    repo={selectedRepo}
                    entry={selectedFile}
                    token={token || null}
                    onClose={() => setSelectedFile(null)}
                  />
                )}
              </div>
            </>
          ) : (
            <p className="status muted">Select a repository from the list to browse its files.</p>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
