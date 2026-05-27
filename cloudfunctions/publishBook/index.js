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

  const title = sanitize(event.title, LIMITS.title)
  const author = sanitize(event.author, LIMITS.author)
  const message = sanitize(event.message, LIMITS.message)
  const city = sanitize(event.city, LIMITS.city)
  const { cover, images } = event

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

  let finalImages = []
  if (Array.isArray(images) && images.length > 0) {
    finalImages = images
      .filter(u => typeof u === 'string' && u.startsWith('cloud://'))
      .slice(0, MAX_IMAGES)
  } else if (cover && typeof cover === 'string' && cover.startsWith('cloud://')) {
    finalImages = [cover]
  }
  const finalCover = finalImages[0] || ''

  const result = await db.collection('books').add({
    data: {
      title,
      author,
      cover: finalCover,
      images: finalImages,
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
