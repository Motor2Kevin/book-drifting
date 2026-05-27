const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const LIMITS = {
  nickname: 20,
  wechatId: 30,
  city: 10,
  avatar: 500
}

const WECHAT_ID_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{5,29}$/

function sanitize(value, max) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return { success: false, error: '未识别用户身份' }

  const nickname = sanitize(event.nickname, LIMITS.nickname)
  const wechatId = sanitize(event.wechatId, LIMITS.wechatId)
  const city = sanitize(event.city, LIMITS.city)
  const avatar = sanitize(event.avatar, LIMITS.avatar)

  if (!nickname) return { success: false, error: '请填写昵称' }
  if (!wechatId) return { success: false, error: '请填写微信号' }
  if (!WECHAT_ID_REGEX.test(wechatId)) {
    return { success: false, error: '微信号格式不正确（字母开头，6-30 位字母数字下划线减号）' }
  }

  const updates = {
    nickname,
    wechatId,
    city,
    avatar,
    updatedAt: db.serverDate()
  }

  try {
    const existing = await db.collection('users').where({ _openid: openid }).get()
    if (existing.data.length === 0) {
      await db.collection('users').add({
        data: {
          _openid: openid,
          ...updates,
          createdAt: db.serverDate()
        }
      })
    } else {
      await db.collection('users').where({ _openid: openid }).update({ data: updates })
    }
    console.log('[updateProfile]', { openid, nickname, wechatId, city })
    return { success: true, user: { _openid: openid, ...updates } }
  } catch (e) {
    console.error('updateProfile failed', { openid, err: e.message })
    return { success: false, error: '保存失败' }
  }
}
