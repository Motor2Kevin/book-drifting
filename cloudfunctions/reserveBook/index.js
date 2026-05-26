const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { bookId } = event
  if (!bookId) return { success: false, error: '缺少 bookId' }

  const userRes = await db.collection('users').where({ _openid: openid }).get()
  if (userRes.data.length === 0 || !userRes.data[0].wechatId) {
    return { success: false, error: '请先填写微信号' }
  }

  const bookRes = await db.collection('books').doc(bookId).get().catch(() => null)
  if (!bookRes || !bookRes.data) {
    return { success: false, error: '书籍不存在' }
  }
  const book = bookRes.data

  if (book.ownerId === openid) {
    return { success: false, error: '不能申请自己发布的书' }
  }

  if (book.status !== 'available') {
    return { success: false, error: '该书已被他人预约或正在交接中' }
  }

  await db.collection('books').doc(bookId).update({
    data: {
      status: 'reserved',
      reservedBy: openid,
      reservedAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })

  return {
    success: true,
    ownerWechat: book.ownerWechat,
    ownerName: book.ownerName
  }
}
