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
      const res = await wx.cloud.callFunction({
        name: 'getImageUrls',
        data: { fileList: needFetch }
      })
      const fileList = (res.result && res.result.fileList) || []
      for (const file of fileList) {
        if (file.tempFileURL) {
          tempUrlCache.set(file.fileID, {
            tempUrl: file.tempFileURL,
            expiresAt: now + CACHE_TTL_MS
          })
        } else {
          console.warn('[cover] no temp url for', file.fileID, file.errMsg)
        }
      }
    } catch (e) {
      console.error('[cover] getImageUrls failed', e)
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

async function resolveCovers(items, fields = ['cover']) {
  const fieldList = Array.isArray(fields) ? fields : [fields]
  const allUrls = []
  for (const item of items) {
    for (const f of fieldList) {
      if (item[f]) allUrls.push(item[f])
    }
  }
  const resolved = await resolveUrls(allUrls)
  const resolvedMap = new Map()
  allUrls.forEach((orig, i) => resolvedMap.set(orig, resolved[i]))
  return items.map(item => {
    let changed = false
    const next = { ...item }
    for (const f of fieldList) {
      const url = item[f]
      if (url && resolvedMap.has(url) && resolvedMap.get(url) !== url) {
        next[f] = resolvedMap.get(url)
        changed = true
      }
    }
    return changed ? next : item
  })
}

async function resolveSingleUrl(url) {
  if (!url || !url.startsWith('cloud://')) return url
  const [resolved] = await resolveUrls([url])
  return resolved || url
}

async function resolveBookImages(book) {
  if (!book) return book
  let rawImages = []
  if (Array.isArray(book.images) && book.images.length > 0) {
    rawImages = book.images
  } else if (book.cover) {
    rawImages = [book.cover]
  }
  const urlsToFetch = [...rawImages]
  if (book.ownerAvatar) urlsToFetch.push(book.ownerAvatar)

  await resolveUrls(urlsToFetch)

  const resolvedImages = await resolveUrls(rawImages)
  const resolvedAvatar = await resolveSingleUrl(book.ownerAvatar)

  return {
    ...book,
    images: resolvedImages,
    cover: resolvedImages[0] || book.cover || '',
    ownerAvatar: resolvedAvatar
  }
}

module.exports = {
  resolveCovers,
  resolveUrls,
  resolveBookImages,
  resolveSingleUrl
}
