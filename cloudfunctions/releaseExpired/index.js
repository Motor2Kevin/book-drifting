const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 允许的调用来源：定时触发器 + 管理员手动测试
const ALLOWED_SOURCES = ['wx_server']
const ADMIN_OPENIDS = (process.env.ADMIN_OPENIDS || '').split(',').map(s => s.trim()).filter(Boolean)

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const source = wxContext.SOURCE || ''
  const openid = wxContext.OPENID || ''

  const isAllowedSource = ALLOWED_SOURCES.some(s => source.includes(s))
  const isAdmin = ADMIN_OPENIDS.includes(openid)

  if (!isAllowedSource && !isAdmin) {
    console.warn('[releaseExpired] denied', { source, openid })
    return { success: false, error: 'forbidden' }
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const expired = await db.collection('books').where({
    status: 'reserved',
    reservedAt: _.lt(cutoff)
  }).get()

  let released = 0
  for (const book of expired.data) {
    await db.collection('books').doc(book._id).update({
      data: {
        status: 'available',
        reservedBy: null,
        reservedAt: null,
        updatedAt: db.serverDate()
      }
    })
    released++
  }

  return { success: true, released }
}
