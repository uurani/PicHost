import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT_VERSION } from './manifest'
import { BACKUP_ARCHIVE_EXT, isSafeBackupFilename } from './paths'

describe('isSafeBackupFilename', () => {
  it('accepts valid backup archive names', () => {
    expect(isSafeBackupFilename(`pichost-abc123${BACKUP_ARCHIVE_EXT}`)).toBe(true)
  })

  it('rejects path traversal and wrong extension', () => {
    expect(isSafeBackupFilename('')).toBe(false)
    expect(isSafeBackupFilename('../secret.phost.tar.gz')).toBe(false)
    expect(isSafeBackupFilename('backup.tar.gz')).toBe(false)
    expect(isSafeBackupFilename('nested/pkg.phost.tar.gz')).toBe(false)
  })
})

describe('BACKUP_FORMAT_VERSION', () => {
  it('is v1', () => {
    expect(BACKUP_FORMAT_VERSION).toBe(1)
  })
})
