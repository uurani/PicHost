export function getFileExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return '—'
  return base.slice(dot + 1).toLowerCase()
}

export function getUrlPathname(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''))
  } catch {
    return url
  }
}

export function getStorageKeyTail(key: string): string {
  const prefix = 'images/'
  return key.startsWith(prefix) ? key.slice(prefix.length) : key
}

export function formatImageDimensions(width: number | null, height: number | null): string | null {
  if (!width || !height) return null
  return `${width} × ${height} px`
}

export function buildImageBbcode(url: string): string {
  return `[img]${url}[/img]`
}
