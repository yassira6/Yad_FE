const API_ROOT = 'https://api.github.com'

export class GitHubUpstreamError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function headersFor(token?: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'yad-file-explorer' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function ghFetch(path: string, token?: string): Promise<Response> {
  const res = await fetch(`${API_ROOT}${path}`, { headers: headersFor(token) })
  if (!res.ok) {
    let message = `GitHub API error (${res.status})`
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining')
      message =
        remaining === '0'
          ? 'GitHub API rate limit exceeded. Configure a token to raise the limit.'
          : 'Access forbidden. The repo may be private — configure a token with repo access.'
    } else if (res.status === 404) {
      message = 'Not found. Check the owner/repo name, or configure a token if this repo is private.'
    } else {
      try {
        const body = (await res.json()) as { message?: string }
        if (body?.message) message = body.message
      } catch {
        // ignore
      }
    }
    throw new GitHubUpstreamError(message, res.status)
  }
  return res
}

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

export async function listRepos(owner: string, token?: string): Promise<GitHubRepo[]> {
  try {
    const res = await ghFetch(`/users/${encodeURIComponent(owner)}/repos?per_page=100&sort=updated`, token)
    return (await res.json()) as GitHubRepo[]
  } catch (err) {
    if (err instanceof GitHubUpstreamError && err.status === 404) {
      const res = await ghFetch(`/orgs/${encodeURIComponent(owner)}/repos?per_page=100&sort=updated`, token)
      return (await res.json()) as GitHubRepo[]
    }
    throw err
  }
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

export async function getContents(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  token?: string,
): Promise<GitHubContentEntry[] | GitHubFileContent> {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  const res = await ghFetch(`/repos/${owner}/${repo}/contents${encodedPath ? `/${encodedPath}` : ''}${refQuery}`, token)
  return (await res.json()) as GitHubContentEntry[] | GitHubFileContent
}

export async function getRawFile(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  token?: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const result = await getContents(owner, repo, path, ref, token)
  if (Array.isArray(result)) {
    throw new GitHubUpstreamError('Path is a directory, not a file.', 400)
  }
  const file = result as GitHubFileContent
  if (file.content && file.encoding === 'base64') {
    return { buffer: Buffer.from(file.content, 'base64'), filename: file.name }
  }
  if (file.download_url) {
    const res = await fetch(file.download_url)
    if (!res.ok) throw new GitHubUpstreamError(`Failed to fetch raw file (${res.status})`, res.status)
    return { buffer: Buffer.from(await res.arrayBuffer()), filename: file.name }
  }
  throw new GitHubUpstreamError('No content available for this file.', 404)
}

export async function getZipball(owner: string, repo: string, ref: string, token?: string): Promise<Response> {
  return ghFetch(`/repos/${owner}/${repo}/zipball/${encodeURIComponent(ref)}`, token)
}
