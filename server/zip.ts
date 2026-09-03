import { ZipArchive } from 'archiver'
import type { Response } from 'express'
import { getBlob, getRecursiveTree } from './githubClient.js'

export class ZipBuildError extends Error {}

export async function streamFolderZip(
  res: Response,
  owner: string,
  repo: string,
  ref: string,
  folderPath: string,
  token: string | undefined,
): Promise<void> {
  const tree = await getRecursiveTree(owner, repo, ref, token)
  const prefix = folderPath ? `${folderPath}/` : ''
  const blobs = tree.filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix))
  if (blobs.length === 0) {
    throw new ZipBuildError('Folder is empty or does not exist.')
  }

  const archive = new ZipArchive({ zlib: { level: 9 } })
  archive.on('warning', (err: Error) => console.warn('zip warning:', err.message))
  archive.on('error', (err: Error) => {
    console.error('zip error:', err)
    res.destroy(err)
  })
  archive.pipe(res)

  const CONCURRENCY = 6
  let cursor = 0
  async function worker() {
    while (cursor < blobs.length) {
      const entry = blobs[cursor++]
      const buffer = await getBlob(owner, repo, entry.sha, token)
      archive.append(buffer, { name: entry.path.slice(prefix.length) })
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, blobs.length) }, worker))
  await archive.finalize()
}
