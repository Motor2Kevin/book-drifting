const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

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
    return { success: false, error: '只有持有人可以确认交接' }
  }

  if (book.status !== 'reserved' || !book.reservedBy) {
    return { success: false, error: '当前没有人申请这本书' }
  }

  const newOwnerRes = await db.collection('users').where({ _openid: book.reservedBy }).get()
  if (newOwnerRes.data.length === 0) {
    return { success: false, error: '新持有人信息不存在' }
  }
  const newOwner = newOwnerRes.data[0]

  const historyEntry = {
    fromId: book.ownerId,
    fromName: book.ownerName,
    toId: newOwner._openid,
    toName: newOwner.nickname,
    handedAt: new Date()
  }

  await db.collection('books').doc(bookId).update({
    data: {
      ownerId: newOwner._openid,
      ownerName: newOwner.nickname,
      ownerAvatar: newOwner.avatar,
      ownerWechat: newOwner.wechatId,
      city: newOwner.city || book.city,
      status: 'available',
      reservedBy: null,
      reservedAt: null,
      history: _.push([historyEntry]),
      updatedAt: db.serverDate()
    }
  })

  return { success: true }
}
