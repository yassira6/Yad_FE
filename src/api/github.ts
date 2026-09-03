import type { GitHubContentEntry, GitHubFileContent, GitHubRepo } from '../types'

export class GitHubApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function authHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = {}
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function encodePath(path: string): string {
  return path.split('/').filter(Boolean).map(encodeURIComponent).join('/')
}

async function parseError(res: Response): Promise<string> {
  let message = `Request failed (${res.status})`
  try {
    const body = await res.json()
    if (body?.message) message = body.message
  } catch {
    // ignore
  }
  return message
}

async function request<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: authHeaders(token) })
  if (!res.ok) throw new GitHubApiError(await parseError(res), res.status)
  return res.json() as Promise<T>
}

export function fetchUserRepos(owner: string, token: string | null): Promise<GitHubRepo[]> {
  return request<GitHubRepo[]>(`/repos/${encodeURIComponent(owner)}`, token)
}

export async function fetchContents(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  token: string | null,
): Promise<GitHubContentEntry[] | GitHubFileContent> {
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  return request(
    `/contents/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodePath(path)}${refQuery}`,
    token,
  )
}

export async function fetchRawText(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  token: string | null,
): Promise<string> {
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  const res = await fetch(
    `/api/raw/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodePath(path)}${refQuery}`,
    { headers: authHeaders(token) },
  )
  if (!res.ok) throw new GitHubApiError(await parseError(res), res.status)
  return res.text()
}

export function rawFileUrl(owner: string, repo: string, path: string, ref: string, download: boolean): string {
  const params = new URLSearchParams({ ref })
  if (download) params.set('download', '1')
  return `/api/raw/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodePath(path)}?${params.toString()}`
}

export function repoZipUrl(owner: string, repo: string, ref: string): string {
  return `/api/zip/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}`
}
