export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  owner: { login: string }
  private: boolean
  description: string | null
  default_branch: string
  updated_at: string
  stargazers_count: number
  language: string | null
  html_url: string
}

export interface GitHubContentEntry {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  download_url: string | null
  html_url: string
}

export interface GitHubFileContent extends GitHubContentEntry {
  content?: string
  encoding?: 'base64'
}

export interface LastCommit {
  sha: string
  message: string
  author: string | null
  date: string | null
}

export interface LatestCommitDetail extends LastCommit {
  htmlUrl: string
  files: { filename: string; status: string; additions: number; deletions: number }[]
}
