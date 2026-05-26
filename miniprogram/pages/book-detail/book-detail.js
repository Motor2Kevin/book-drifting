const app = getApp()
const db = wx.cloud.database()
const { resolveCovers } = require('../../utils/cover.js')

Page({
  data: {
    book: null,
    bookId: ''
  },

  onLoad(options) {
    const id = options.id
    this.setData({ bookId: id })
    this.loadBook(id)
  },

  onShow() {
    if (this.data.bookId) {
      this.loadBook(this.data.bookId)
    }
  },

  async loadBook(id) {
    try {
      const res = await db.collection('books').doc(id).get()
      const [book] = await resolveCovers([res.data])
      this.setData({ book })
    } catch (e) {
      console.error('loadBook failed', e)
      wx.showToast({ title: '书籍不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
    }
  },

  async onWantBook() {
    if (app.loginPromise) await app.loginPromise
    const userInfo = app.globalData.userInfo
    if (!userInfo || !userInfo.wechatId) {
      wx.showModal({
        title: '完善信息',
        content: '需要先填写你的微信号，方便和持有人沟通交接',
        confirmText: '去填写',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/profile/profile' })
          }
        }
      })
      return
    }

    wx.showLoading({ title: '锁定中...' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'reserveBook',
        data: { bookId: this.data.bookId }
      })
      wx.hideLoading()

      if (!res.result.success) {
        wx.showToast({ title: res.result.error || '申请失败', icon: 'none' })
        return
      }

      const { ownerWechat, ownerName } = res.result
      wx.showModal({
        title: '已为你锁定 24 小时',
        content: `请添加 ${ownerName} 的微信沟通交接：\n\n${ownerWechat}`,
        confirmText: '复制微信号',
        cancelText: '稍后再说',
        success: (modalRes) => {
          if (modalRes.confirm) {
            wx.setClipboardData({
              data: ownerWechat,
              success: () => wx.showToast({ title: '已复制', icon: 'success' })
            })
          }
          this.loadBook(this.data.bookId)
        }
      })
    } catch (e) {
      wx.hideLoading()
      console.error('reserveBook failed', e)
      wx.showToast({ title: '申请失败', icon: 'none' })
    }
  }
})
