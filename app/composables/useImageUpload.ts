import type {
  UploadProgressItem,
  UploadResponse
} from '~/types/image'
import { isUnauthorizedError } from './useAuth'
import { prepareFilesForUpload } from './useClipboardImage'

const MAX_FILES = 10

export function useImageUpload() {
  const toast = useToast()
  const { t } = useI18n()
  const { compressEnabled, clientWebpQuality, lastTagIds } = useUploadPreferences()
  const uploading = ref(false)
  const progressItems = ref<UploadProgressItem[]>([])
  const lastUploadResult = ref<UploadResponse | null>(null)

  async function uploadFiles(
    files: File[],
    options?: { notify?: boolean, tagIds?: number[] }
  ) {
    if (uploading.value) return

    if (!files.length) {
      toast.add({ title: t('upload.selectImages'), color: 'warning' })
      return
    }

    if (files.length > MAX_FILES) {
      toast.add({
        title: t('upload.maxFiles', { n: MAX_FILES }),
        color: 'warning'
      })
      return
    }

    uploading.value = true
    progressItems.value = files.map(file => ({
      name: file.name,
      status: 'pending',
      progress: 0
    }))

    try {
      const prepared = await prepareFilesForUpload(files, {
        enabled: compressEnabled.value,
        quality: clientWebpQuality.value / 100
      })

      progressItems.value = prepared.map((file, index) => ({
        name: file.name,
        status: 'uploading',
        progress: Math.round(((index + 1) / prepared.length) * 50)
      }))

      const formData = new FormData()
      for (const file of prepared) {
        formData.append('files', file, file.name)
      }

      const tagIds = options?.tagIds ?? lastTagIds.value
      if (tagIds.length) {
        formData.append('tagIds', JSON.stringify(tagIds))
        lastTagIds.value = tagIds
      }

      const response = await $fetch<UploadResponse>('/api/images/upload', {
        method: 'POST',
        body: formData
      })

      lastUploadResult.value = response

      progressItems.value = prepared.map((file) => {
        const failed = response.errors.find(error => error.name === file.name)
        return {
          name: file.name,
          status: failed ? 'error' : 'success',
          progress: 100,
          error: failed?.error.message
        }
      })

      if (response.items.length && options?.notify !== false) {
        toast.add({
          title: t('upload.uploadSuccess', { n: response.items.length }),
          color: 'success'
        })
      }

      if (response.errors.length) {
        toast.add({
          title: t('upload.uploadPartialFail', { n: response.errors.length }),
          color: 'warning'
        })
      }

      return response
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        throw error
      }
      const message = error instanceof Error ? error.message : t('upload.uploadFailed')
      progressItems.value = progressItems.value.map(item => ({
        ...item,
        status: 'error',
        progress: 100,
        error: message
      }))
      toast.add({ title: message, color: 'error' })
      throw error
    } finally {
      uploading.value = false
    }
  }

  return {
    uploading,
    progressItems,
    lastUploadResult,
    uploadFiles
  }
}
