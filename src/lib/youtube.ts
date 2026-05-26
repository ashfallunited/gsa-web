/** Extract YouTube video ID from common URL formats or raw ID. */
export function parseYoutubeId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (/^[\w-]{11}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v
      const embed = url.pathname.match(/\/embed\/([\w-]{11})/)
      if (embed?.[1]) return embed[1]
      const shorts = url.pathname.match(/\/shorts\/([\w-]{11})/)
      if (shorts?.[1]) return shorts[1]
    }
  } catch {
    return null
  }

  return null
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}
