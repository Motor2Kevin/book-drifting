const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { title, author, cover, message, city } = event

  if (!title || !author || !message) {
    return { success: false, error: '书名、作者、留言都必填' }
  }

  const userRes = await db.collection('users').where({ _openid: openid }).get()
  if (userRes.data.length === 0) {
    return { success: false, error: '用户不存在' }
  }
  const user = userRes.data[0]

  if (!user.wechatId) {
    return { success: false, error: '请先在个人设置里填写微信号' }
  }

  const result = await db.collection('books').add({
    data: {
      title,
      author,
      cover: cover || '',
      message,
      ownerId: openid,
      ownerName: user.nickname,
      ownerAvatar: user.avatar,
      ownerWechat: user.wechatId,
      city: city || user.city || '',
      status: 'available',
      reservedBy: null,
      reservedAt: null,
      history: [],
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })

  return { success: true, bookId: result._id }
}
