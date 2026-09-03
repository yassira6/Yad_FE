import type { GitHubContentEntry, GitHubFileContent, GitHubRepo } from '../types'

const API_ROOT = 'https://api.github.com'

export class GitHubApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function authHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = { Accept: 'application/vnd.github+json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function request<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(`${API_ROOT}${path}`, { headers: authHeaders(token) })
  if (!res.ok) {
    let message = `GitHub API error (${res.status})`
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining')
      message =
        remaining === '0'
          ? 'GitHub API rate limit exceeded. Add a personal access token to raise the limit.'
          : 'Access forbidden. The repo may be private — add a personal access token with repo access.'
    } else if (res.status === 404) {
      message = 'Not found. Check the owner/repo name, or add a token if this repo is private.'
    } else {
      try {
        const body = await res.json()
        if (body?.message) message = body.message
      } catch {
        // ignore
      }
    }
    throw new GitHubApiError(message, res.status)
  }
  return res.json() as Promise<T>
}

export function fetchUserRepos(owner: string, token: string | null): Promise<GitHubRepo[]> {
  return request<GitHubRepo[]>(
    `/users/${encodeURIComponent(owner)}/repos?per_page=100&sort=updated`,
    token,
  ).catch(async (err) => {
    if (err instanceof GitHubApiError && err.status === 404 && token) {
      return request<GitHubRepo[]>(`/orgs/${encodeURIComponent(owner)}/repos?per_page=100&sort=updated`, token)
    }
    throw err
  })
}

export function fetchAuthenticatedUserRepos(token: string): Promise<GitHubRepo[]> {
  return request<GitHubRepo[]>('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', token)
}

export async function fetchContents(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  token: string | null,
): Promise<GitHubContentEntry[] | GitHubFileContent> {
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  return request(`/repos/${owner}/${repo}/contents/${path}${refQuery}`, token)
}

export function decodeBase64Content(content: string): string {
  const cleaned = content.replace(/\n/g, '')
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

export function repoZipUrl(owner: string, repo: string, ref: string): string {
  return `https://github.com/${owner}/${repo}/archive/refs/heads/${ref}.zip`
}
