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

  if (book.ownerId !== openid) {
    return { success: false, error: '只能删除自己持有的书' }
  }
  if (book.status !== 'available') {
    return { success: false, error: '该书已被申请，无法删除' }
  }

  if (book.cover && book.cover.startsWith('cloud://')) {
    try {
      await cloud.deleteFile({ fileList: [book.cover] })
    } catch (e) {
      console.warn('delete cover failed', e)
    }
  }

  await db.collection('books').doc(bookId).remove()

  return { success: true }
}
