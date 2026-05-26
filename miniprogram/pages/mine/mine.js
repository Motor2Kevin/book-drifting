const app = getApp()
const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    userInfo: null,
    defaultAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    stats: {
      holding: 0,
      read: 0
    }
  },

  onLoad() {
    this.loadAll()
  },

  onShow() {
    this.loadAll()
  },

  async loadAll() {
    if (app.loginPromise) await app.loginPromise

    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    this.setData({ userInfo })

    const openid = app.globalData.openid || wx.getStorageSync('openid')
    if (!openid) return

    try {
      const [holdingRes, readRes] = await Promise.all([
        db.collection('books').where({ ownerId: openid }).count(),
        db.collection('books').where({ 'history.fromId': openid }).count()
      ])

      this.setData({
        stats: {
          holding: holdingRes.total || 0,
          read: readRes.total || 0
        }
      })
    } catch (e) {
      console.error('loadStats failed', e)
    }
  },

  onTapHolding() {
    wx.navigateTo({ url: '/pages/mine-books/mine-books?type=holding' })
  },

  onTapRead() {
    wx.navigateTo({ url: '/pages/mine-books/mine-books?type=read' })
  },

  onTapProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  onTapAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  }
})
