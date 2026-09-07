import { copyFile, mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { closeDb, getDb, setDbReplacing } from '../db'
import { getDataDir } from '../data-dir'

async function retireCurrentDatabaseFiles(dbPath: string, stamp: number): Promise<void> {
  const targets = [
    dbPath,
    `${dbPath}-wal`,
    `${dbPath}-shm`
  ]
  for (const path of targets) {
    try {
      await rename(path, `${path}.bak-${stamp}`)
    } catch {
      // Missing sidecar files are fine.
    }
  }
}

async function cleanupRetiredDatabaseFiles(dbPath: string, stamp: number): Promise<void> {
  const paths = [
    dbPath,
    `${dbPath}-wal`,
    `${dbPath}-shm`
  ]
  for (const path of paths) {
    await rm(`${path}.bak-${stamp}`, { force: true }).catch(() => {})
  }
}

function sqlitePathLiteral(path: string): string {
  return path.replace(/\\/g, '/').replace(/'/g, '\'\'')
}

export function checkpointDatabase(): void {
  getDb().exec('PRAGMA wal_checkpoint(TRUNCATE)')
}

/** Consistent snapshot while the app keeps the DB open (safe on Windows). */
export async function copyDatabaseSnapshot(targetPath: string): Promise<void> {
  await mkdir(join(targetPath, '..'), { recursive: true })
  checkpointDatabase()
  const escaped = sqlitePathLiteral(targetPath)
  getDb().exec(`VACUUM INTO '${escaped}'`)
}

export async function replaceDatabaseFromSnapshot(sourcePath: string): Promise<void> {
  const dataDir = getDataDir()
  const target = join(dataDir, 'pichost.db')
  const stamp = Date.now()

  checkpointDatabase()
  closeDb()
  setDbReplacing(true)

  try {
    await retireCurrentDatabaseFiles(target, stamp)
    await copyFile(sourcePath, target)
  } finally {
    setDbReplacing(false)
    const reopened = getDb()
    reopened.exec('PRAGMA journal_mode=WAL')
    void cleanupRetiredDatabaseFiles(target, stamp)
  }
}
