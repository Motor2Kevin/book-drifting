const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
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
