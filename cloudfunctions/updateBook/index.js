const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const MAX_IMAGES = 5
const LIMITS = {
  title: 50,
  author: 30,
  message: 200,
  city: 10
}

function sanitize(value, max) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { bookId, cover, images } = event
  const title = sanitize(event.title, LIMITS.title)
  const author = sanitize(event.author, LIMITS.author)
  const message = sanitize(event.message, LIMITS.message)
  const city = event.city !== undefined ? sanitize(event.city, LIMITS.city) : undefined

  if (!bookId) return { success: false, error: '缺少 bookId' }
  if (!title || !author || !message) {
    return { success: false, error: '书名、作者、留言都必填' }
  }

  const bookRes = await db.collection('books').doc(bookId).get().catch(() => null)
  if (!bookRes || !bookRes.data) {
    return { success: false, error: '书籍不存在' }
  }
  const book = bookRes.data

  if (book.ownerId !== openid) {
    return { success: false, error: '只能修改自己持有的书' }
  }
  if (book.status !== 'available') {
    return { success: false, error: '该书已被申请，无法修改' }
  }

  const updates = {
    title,
    author,
    message,
    updatedAt: db.serverDate()
  }

  if (Array.isArray(images)) {
    const finalImages = images
      .filter(u => typeof u === 'string' && u.startsWith('cloud://'))
      .slice(0, MAX_IMAGES)
    updates.images = finalImages
    updates.cover = finalImages[0] || ''
  } else if (cover !== undefined) {
    const validCover = typeof cover === 'string' && cover.startsWith('cloud://') ? cover : ''
    updates.cover = validCover
    updates.images = validCover ? [validCover] : []
  }
  if (city !== undefined) updates.city = city

  if (Array.isArray(updates.images)) {
    const oldImages = Array.isArray(book.images) && book.images.length > 0
      ? book.images
      : (book.cover ? [book.cover] : [])
    const removedImages = oldImages.filter(
      url => url && url.startsWith('cloud://') && !updates.images.includes(url)
    )
    if (removedImages.length > 0) {
      try {
        await cloud.deleteFile({ fileList: removedImages })
      } catch (e) {
        console.warn('delete removed images failed', e)
      }
    }
  }

  await db.collection('books').doc(bookId).update({ data: updates })

  return { success: true }
}
