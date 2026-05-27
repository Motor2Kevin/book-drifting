const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 管理员 openid 白名单。从云函数环境变量 ADMIN_OPENIDS 读取（逗号分隔）。
// 配置位置：云开发控制台 → 云函数 → deleteBook → 环境变量 → ADMIN_OPENIDS
// 这样硬编码不会进入公开 git 仓库，且不同环境可配不同管理员。
const ADMIN_OPENIDS = (process.env.ADMIN_OPENIDS || '').split(',').map(s => s.trim()).filter(Boolean)

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

  const allImages = []
  if (Array.isArray(book.images)) allImages.push(...book.images)
  if (book.cover && !allImages.includes(book.cover)) allImages.push(book.cover)
  const cloudImages = allImages.filter(url => url && url.startsWith('cloud://'))
  if (cloudImages.length > 0) {
    try {
      await cloud.deleteFile({ fileList: cloudImages })
    } catch (e) {
      console.warn('delete book images failed', e)
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
