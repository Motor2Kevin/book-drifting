const tempUrlCache = new Map()
const CACHE_TTL_MS = 1000 * 60 * 50

async function resolveCovers(items, coverField = 'cover') {
  const cloudIds = []
  const seenIds = new Set()
  const now = Date.now()

  for (const item of items) {
    const url = item[coverField]
    if (url && url.startsWith('cloud://') && !seenIds.has(url)) {
      const cached = tempUrlCache.get(url)
      if (!cached || cached.expiresAt < now) {
        cloudIds.push(url)
        seenIds.add(url)
      }
    }
  }

  if (cloudIds.length > 0) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: cloudIds })
      for (const file of res.fileList || []) {
        if (file.tempFileURL) {
          tempUrlCache.set(file.fileID, {
            tempUrl: file.tempFileURL,
            expiresAt: now + CACHE_TTL_MS
          })
        } else {
          console.warn('[cover] getTempFileURL no url for', file.fileID, file.errMsg)
        }
      }
    } catch (e) {
      console.error('[cover] getTempFileURL failed', e)
    }
  }

  return items.map(item => {
    const url = item[coverField]
    if (url && url.startsWith('cloud://')) {
      const cached = tempUrlCache.get(url)
      return {
        ...item,
        [coverField]: cached ? cached.tempUrl : url
      }
    }
    return item
  })
}

module.exports = {
  resolveCovers
}
