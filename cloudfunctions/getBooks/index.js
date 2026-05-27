const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const MAX_LIST_LIMIT = 50

// 在 list 场景中暴露给所有用户的字段（不含微信号、原始 openid 等敏感信息）
function sanitizeForList(book) {
  return {
    _id: book._id,
    title: book.title,
    author: book.author,
    cover: book.cover,
    images: book.images,
    message: book.message,
    ownerName: book.ownerName,
    ownerAvatar: book.ownerAvatar,
    city: book.city,
    status: book.status,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    history: (book.history || []).map(h => ({
      fromName: h.fromName,
      toName: h.toName,
      handedAt: h.handedAt
    }))
  }
}

// detail 场景：仅当请求者是该书相关方时才返回敏感字段
function sanitizeForDetail(book, viewerOpenid) {
  const base = sanitizeForList(book)
  const isOwner = book.ownerId === viewerOpenid
  const isReservedByMe = book.status === 'reserved' && book.reservedBy === viewerOpenid

  if (isOwner) {
    base.ownerId = book.ownerId
    base.reservedBy = book.reservedBy || null
    base.reservedAt = book.reservedAt || null
  } else if (isReservedByMe) {
    base.ownerWechat = book.ownerWechat
    base.reservedBy = book.reservedBy
  }
  // 其他人无法看到 ownerWechat / ownerId / reservedBy
  // 状态 reserved 但不告诉是谁预约的
  return base
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action = 'list', bookId } = event
  let limit = parseInt(event.limit, 10) || MAX_LIST_LIMIT
  if (limit > MAX_LIST_LIMIT) limit = MAX_LIST_LIMIT
  if (limit <= 0) limit = MAX_LIST_LIMIT

  try {
    if (action === 'detail') {
      if (!bookId) return { success: false, error: '缺少 bookId' }
      const res = await db.collection('books').doc(bookId).get().catch(() => null)
      if (!res || !res.data) return { success: false, error: '书籍不存在' }
      return { success: true, book: sanitizeForDetail(res.data, openid) }
    }

    if (action === 'list') {
      const res = await db.collection('books')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()
      return { success: true, books: res.data.map(sanitizeForList) }
    }

    // 以下三个 action 查询的都是调用者自己的书，可返回完整字段（含微信号便于复制）
    if (action === 'myHolding') {
      const res = await db.collection('books')
        .where({ ownerId: openid })
        .orderBy('createdAt', 'desc')
        .get()
      return { success: true, books: res.data }
    }

    if (action === 'myPassed') {
      const res = await db.collection('books')
        .where({ 'history.fromId': openid })
        .orderBy('updatedAt', 'desc')
        .get()
      return { success: true, books: res.data.map(sanitizeForList) }
    }

    if (action === 'myReserved') {
      const res = await db.collection('books')
        .where({ reservedBy: openid, status: 'reserved' })
        .orderBy('reservedAt', 'desc')
        .get()
      return { success: true, books: res.data }
    }

    if (action === 'stats') {
      const [holdingRes, passedRes, reservedRes] = await Promise.all([
        db.collection('books').where({ ownerId: openid }).count(),
        db.collection('books').where({ 'history.fromId': openid }).count(),
        db.collection('books').where({ reservedBy: openid, status: 'reserved' }).count()
      ])
      return {
        success: true,
        stats: {
          holding: holdingRes.total || 0,
          passed: passedRes.total || 0,
          reserved: reservedRes.total || 0
        }
      }
    }

    return { success: false, error: 'unknown action' }
  } catch (e) {
    console.error('getBooks failed', { action, openid, err: e.message })
    return { success: false, error: e.message || '查询失败' }
  }
}
