const app = getApp()

Page({
  data: {
    userInfo: null,
    defaultAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    stats: {
      holding: 0,
      read: 0,
      reserved: 0
    }
  },

  onLoad() {
    this.loadAll()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    this.loadAll()
  },

  async loadAll() {
    if (app.loginPromise) await app.loginPromise

    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    this.setData({ userInfo })

    const openid = app.globalData.openid || wx.getStorageSync('openid')
    if (!openid) return

    try {
      const res = await wx.cloud.callFunction({
        name: 'getBooks',
        data: { action: 'stats' }
      })
      if (res.result && res.result.success) {
        this.setData({
          stats: {
            holding: res.result.stats.holding || 0,
            read: res.result.stats.passed || 0,
            reserved: res.result.stats.reserved || 0
          }
        })
      }
    } catch (e) {
      console.error('loadStats failed', e)
    }
  },

  onTapHolding() {
    wx.navigateTo({ url: '/pages/mine-books/mine-books?type=holding' })
  },

  onTapReserved() {
    wx.navigateTo({ url: '/pages/mine-books/mine-books?type=reserved' })
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
