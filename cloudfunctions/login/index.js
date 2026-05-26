const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { nickname, avatar } = event

  const usersCol = db.collection('users')
  const existing = await usersCol.where({ _openid: openid }).get()

  if (existing.data.length === 0) {
    await usersCol.add({
      data: {
        _openid: openid,
        nickname: nickname || '匿名书友',
        avatar: avatar || '',
        wechatId: '',
        city: '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
  }

  const userDoc = await usersCol.where({ _openid: openid }).get()
  return {
    openid,
    user: userDoc.data[0]
  }
}
