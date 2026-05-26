const tempUrlCache = new Map()
const CACHE_TTL_MS = 1000 * 60 * 50

async function resolveUrls(cloudUrls) {
  const now = Date.now()
  const needFetch = []
  const seen = new Set()

  for (const url of cloudUrls) {
    if (url && url.startsWith('cloud://') && !seen.has(url)) {
      seen.add(url)
      const cached = tempUrlCache.get(url)
      if (!cached || cached.expiresAt < now) {
        needFetch.push(url)
      }
    }
  }

  if (needFetch.length > 0) {
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: needFetch })
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

  return cloudUrls.map(url => {
    if (url && url.startsWith('cloud://')) {
      const cached = tempUrlCache.get(url)
      return cached ? cached.tempUrl : url
    }
    return url
  })
}

async function resolveCovers(items, coverField = 'cover') {
  const allUrls = items.map(item => item[coverField]).filter(Boolean)
  const resolvedMap = new Map()
  const resolved = await resolveUrls(allUrls)
  allUrls.forEach((orig, i) => resolvedMap.set(orig, resolved[i]))
  return items.map(item => {
    const url = item[coverField]
    if (url && resolvedMap.has(url)) {
      return { ...item, [coverField]: resolvedMap.get(url) }
    }
    return item
  })
}

async function resolveBookImages(book) {
  if (!book) return book
  let rawImages = []
  if (Array.isArray(book.images) && book.images.length > 0) {
    rawImages = book.images
  } else if (book.cover) {
    rawImages = [book.cover]
  }
  const resolved = await resolveUrls(rawImages)
  return {
    ...book,
    images: resolved,
    cover: resolved[0] || book.cover || ''
  }
}

module.exports = {
  resolveCovers,
  resolveUrls,
  resolveBookImages
}
