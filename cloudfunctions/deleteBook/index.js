const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ⚠️ 管理员 openid 白名单。管理员可以删除任何用户发布的书（用于处理违禁内容）。
// 在小程序「我的 → 个人设置」底部能看到自己的 openid，复制后填到这里。
const ADMIN_OPENIDS = [
  // 'oXXXXX...' 在这里加管理员 openid
]

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { bookId, reason } = event
  if (!bookId) return { success: false, error: '缺少 bookId' }

  const bookRes = await db.collection('books').doc(bookId).get().catch(() => null)
  if (!bookRes || !bookRes.data) {
    return { success: false, error: '书籍不存在' }
  }
  const book = bookRes.data

  const isAdmin = ADMIN_OPENIDS.includes(openid)
  const isOwner = book.ownerId === openid

  if (!isAdmin && !isOwner) {
    return { success: false, error: '只能删除自己持有的书' }
  }

  if (!isAdmin && book.status !== 'available') {
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

  if (isAdmin && !isOwner) {
    console.log('[admin delete]', {
      adminOpenid: openid,
      bookId,
      bookTitle: book.title,
      bookOwnerId: book.ownerId,
      reason: reason || 'unspecified'
    })
  }

  return { success: true, byAdmin: isAdmin && !isOwner }
}
