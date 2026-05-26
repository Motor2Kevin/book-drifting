const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    currentType: 'holding',
    holdingList: [],
    readList: [],
    loading: true
  },

  onLoad(options) {
    const type = options.type || 'holding'
    this.setData({ currentType: type })
    this.loadAll()
  },

  onShow() {
    this.loadAll()
  },

  async loadAll() {
    if (app.loginPromise) await app.loginPromise
    const openid = app.globalData.openid || wx.getStorageSync('openid')
    if (!openid) return

    this.setData({ loading: true })

    try {
      const [holdingRes, passedRes] = await Promise.all([
        db.collection('books').where({ ownerId: openid }).orderBy('createdAt', 'desc').get(),
        db.collection('books').where({ 'history.fromId': openid }).orderBy('updatedAt', 'desc').get()
      ])

      const readList = passedRes.data.map(b => {
        const myHistory = (b.history || []).find(h => h.fromId === openid)
        return {
          ...b,
          receivedFrom: myHistory ? myHistory.fromName : '',
          receivedAt: myHistory ? this.formatDate(myHistory.handedAt) : ''
        }
      })

      this.setData({
        holdingList: holdingRes.data,
        readList,
        loading: false
      })
    } catch (e) {
      console.error('mine-books load failed', e)
      this.setData({ loading: false })
    }
  },

  formatDate(d) {
    if (!d) return ''
    const date = new Date(d)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  onSwitchTab(e) {
    this.setData({ currentType: e.currentTarget.dataset.type })
  },

  onConfirmHandover(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认交接',
      content: '确认这本书已经交给申请人了吗？此操作会把书的归属转移给对方。',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...', mask: true })
        try {
          const cloudRes = await wx.cloud.callFunction({
            name: 'confirmHandover',
            data: { bookId: id }
          })
          wx.hideLoading()
          if (cloudRes.result.success) {
            wx.showToast({ title: '已完成交接', icon: 'success' })
            this.loadAll()
          } else {
            wx.showToast({ title: cloudRes.result.error || '操作失败', icon: 'none' })
          }
        } catch (err) {
          wx.hideLoading()
          console.error('confirmHandover failed', err)
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    })
  }
})
