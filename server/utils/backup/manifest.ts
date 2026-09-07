export const BACKUP_FORMAT_VERSION = 1

export interface BackupManifest {
  formatVersion: number
  appVersion: string
  createdAt: string
  imageCount: number
  imageBytes: number
  includesDatabase: boolean
}

export interface BackupRestorePreview {
  imageCount: number
  imageBytes: number
  newImages: number
  conflictingImages: number
  formatVersion: number
  appVersion: string
  createdAt: string
}

export interface StorageBackendMetaExport {
  id: string
  name: string
  type: string
  config: Record<string, unknown>
  servingMode: string
  publicUrl: string
  quotaBytes: number | null
  enabled: boolean
  isDefault: boolean
  sortOrder: number
}
