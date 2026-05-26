const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { bookId } = event
  if (!bookId) return { success: false, error: '缺少 bookId' }

  const bookRes = await db.collection('books').doc(bookId).get().catch(() => null)
  if (!bookRes || !bookRes.data) {
    return { success: false, error: '书籍不存在' }
  }
  const book = bookRes.data

  if (book.status !== 'reserved' || book.reservedBy !== openid) {
    return { success: false, error: '你没有预约这本书' }
  }

  await db.collection('books').doc(bookId).update({
    data: {
      status: 'available',
      reservedBy: null,
      reservedAt: null,
      updatedAt: db.serverDate()
    }
  })

  return { success: true }
}
