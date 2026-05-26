const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action = 'list', bookId, limit = 50 } = event

  try {
    if (action === 'detail') {
      if (!bookId) return { success: false, error: '缺少 bookId' }
      const res = await db.collection('books').doc(bookId).get().catch(() => null)
      if (!res || !res.data) return { success: false, error: '书籍不存在' }
      return { success: true, book: res.data }
    }

    if (action === 'list') {
      const res = await db.collection('books')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()
      return { success: true, books: res.data }
    }

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
      return { success: true, books: res.data }
    }

    if (action === 'stats') {
      const [holdingRes, passedRes] = await Promise.all([
        db.collection('books').where({ ownerId: openid }).count(),
        db.collection('books').where({ 'history.fromId': openid }).count()
      ])
      return {
        success: true,
        stats: {
          holding: holdingRes.total || 0,
          passed: passedRes.total || 0
        }
      }
    }

    return { success: false, error: 'unknown action' }
  } catch (e) {
    console.error('getBooks failed', e)
    return { success: false, error: e.message || '查询失败' }
  }
}
