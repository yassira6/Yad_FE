import type {
  GitHubContentEntry,
  GitHubFileContent,
  GitHubRepo,
  LastCommit,
  LatestCommitDetail,
  RepoFileEntry,
} from '../types'

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

async function fetchRaw(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  token: string | null,
): Promise<Response> {
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  const res = await fetch(
    `/api/raw/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodePath(path)}${refQuery}`,
    { headers: authHeaders(token) },
  )
  if (!res.ok) throw new GitHubApiError(await parseError(res), res.status)
  return res
}

export async function fetchRawText(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  token: string | null,
): Promise<string> {
  const res = await fetchRaw(owner, repo, path, ref, token)
  return res.text()
}

export async function fetchRawBlob(
  owner: string,
  repo: string,
  path: string,
  ref: string | undefined,
  token: string | null,
): Promise<Blob> {
  const res = await fetchRaw(owner, repo, path, ref, token)
  return res.blob()
}

export function rawFileUrl(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  download: boolean,
  downloadName?: string,
): string {
  const params = new URLSearchParams({ ref })
  if (download) {
    params.set('download', '1')
    if (downloadName) params.set('name', downloadName)
  }
  return `/api/raw/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodePath(path)}?${params.toString()}`
}

export function repoZipUrl(owner: string, repo: string, ref: string, path?: string): string {
  const suffix = path ? `/${encodePath(path)}` : ''
  return `/api/zip/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}${suffix}`
}

export function fetchLastCommit(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token: string | null,
): Promise<LastCommit | null> {
  const params = new URLSearchParams({ ref })
  return request(
    `/last-commit/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodePath(path)}?${params.toString()}`,
    token,
  )
}

export function fetchFileList(
  owner: string,
  repo: string,
  ref: string,
  path: string,
  token: string | null,
): Promise<RepoFileEntry[]> {
  const suffix = path ? `/${encodePath(path)}` : ''
  return request(
    `/file-list/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}${suffix}`,
    token,
  )
}

export function fetchLatestCommitDetail(
  owner: string,
  repo: string,
  ref: string,
  token: string | null,
): Promise<LatestCommitDetail | null> {
  const params = new URLSearchParams({ ref })
  return request(
    `/latest-commit/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}?${params.toString()}`,
    token,
  )
}
