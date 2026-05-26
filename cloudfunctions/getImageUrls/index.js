const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { fileList } = event
  if (!Array.isArray(fileList) || fileList.length === 0) {
    return { fileList: [] }
  }

  const seen = new Set()
  const validFiles = []
  for (const url of fileList) {
    if (url && typeof url === 'string' && url.startsWith('cloud://') && !seen.has(url)) {
      seen.add(url)
      validFiles.push(url)
    }
  }

  if (validFiles.length === 0) {
    return { fileList: [] }
  }

  try {
    const res = await cloud.getTempFileURL({ fileList: validFiles })
    return { fileList: res.fileList || [] }
  } catch (e) {
    console.error('getImageUrls failed', e)
    return { fileList: [], error: e.message || '获取临时 URL 失败' }
  }
}
