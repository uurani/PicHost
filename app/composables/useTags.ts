import type { ImageTag } from '~/types/image'

export interface TagListResponse {
  items: ImageTag[]
}

export interface TagResponse {
  tag: ImageTag
}

export function useTags() {
  const items = useState<ImageTag[]>('tags-list', () => [])
  const loading = ref(false)
  const loaded = ref(false)

  async function fetchTags(force = false) {
    if (loaded.value && !force) return items.value
    loading.value = true
    try {
      const data = await $fetch<TagListResponse>('/api/tags', {
        credentials: 'include'
      })
      items.value = data.items
      loaded.value = true
      return data.items
    } finally {
      loading.value = false
    }
  }

  async function createTag(name: string, color?: string | null) {
    const data = await $fetch<TagResponse>('/api/tags', {
      method: 'POST',
      credentials: 'include',
      body: { name, color }
    })
    await fetchTags(true)
    return data.tag
  }

  async function updateTag(id: number, patch: { name?: string, color?: string | null }) {
    const data = await $fetch<TagResponse>(`/api/tags/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: patch
    })
    await fetchTags(true)
    return data.tag
  }

  async function deleteTag(id: number) {
    await $fetch(`/api/tags/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    await fetchTags(true)
  }

  async function mergeTags(sourceIds: number[], targetId: number) {
    const data = await $fetch<TagResponse>('/api/tags/merge', {
      method: 'POST',
      credentials: 'include',
      body: { sourceIds, targetId }
    })
    await fetchTags(true)
    return data.tag
  }

  async function addTagsToImage(key: string, tagIds: number[]) {
    const data = await $fetch<{ tags: ImageTag[] }>('/api/images/tags', {
      method: 'POST',
      credentials: 'include',
      body: { key, tagIds }
    })
    return data.tags
  }

  async function setImageTags(key: string, tagIds: number[]) {
    const data = await $fetch<{ tags: ImageTag[] }>('/api/images/tags', {
      method: 'PATCH',
      credentials: 'include',
      body: { key, tagIds }
    })
    return data.tags
  }

  async function removeTagFromImage(key: string, tagId: number) {
    const data = await $fetch<{ tags: ImageTag[] }>('/api/images/tags', {
      method: 'DELETE',
      credentials: 'include',
      body: { key, tagId }
    })
    return data.tags
  }

  async function batchUpdateTags(
    keys: string[],
    tagIds: number[],
    action: 'add' | 'remove' = 'add'
  ) {
    return $fetch<{ success: boolean, updated: number }>('/api/images/batch-tags', {
      method: 'POST',
      credentials: 'include',
      body: { keys, tagIds, action }
    })
  }

  return {
    items,
    loading,
    loaded,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    mergeTags,
    addTagsToImage,
    setImageTags,
    removeTagFromImage,
    batchUpdateTags
  }
}
