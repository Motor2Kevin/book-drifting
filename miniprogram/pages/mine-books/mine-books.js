const app = getApp()
const { resolveCovers } = require('../../utils/cover.js')

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
        wx.cloud.callFunction({ name: 'getBooks', data: { action: 'myHolding' } }),
        wx.cloud.callFunction({ name: 'getBooks', data: { action: 'myPassed' } })
      ])

      const holdingBooks = (holdingRes.result && holdingRes.result.books) || []
      const passedBooks = (passedRes.result && passedRes.result.books) || []

      const readListRaw = passedBooks.map(b => {
        const myHistory = (b.history || []).find(h => h.fromId === openid)
        return {
          ...b,
          passedTo: myHistory ? myHistory.toName : '',
          passedAt: myHistory ? this.formatDate(myHistory.handedAt) : ''
        }
      })

      const [holdingList, readList] = await Promise.all([
        resolveCovers(holdingBooks),
        resolveCovers(readListRaw)
      ])

      this.setData({
        holdingList,
        readList,
        loading: false
      })
    } catch (e) {
      console.error('mine-books load failed', e)
      this.setData({ loading: false })
    }
  },

  onCoverError(e) {
    const { id, type } = e.currentTarget.dataset
    console.warn('[mine-books] cover load failed', { id, type, errMsg: e.detail.errMsg })
    const listKey = type === 'holding' ? 'holdingList' : 'readList'
    const list = this.data[listKey].map(b => b._id === id ? { ...b, coverFailed: true } : b)
    this.setData({ [listKey]: list })
  },

  formatDate(d) {
    if (!d) return ''
    const date = new Date(d)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  onSwitchTab(e) {
    this.setData({ currentType: e.currentTarget.dataset.type })
  },

  onShowActions(e) {
    const id = e.currentTarget.dataset.id
    const status = e.currentTarget.dataset.status

    if (status === 'reserved') {
      wx.showToast({ title: '已被申请的书无法修改/删除', icon: 'none' })
      return
    }

    wx.showActionSheet({
      itemList: ['修改', '删除'],
      itemColor: '#2c2825',
      success: (res) => {
        if (res.tapIndex === 0) {
          this.onEditBook(id)
        } else if (res.tapIndex === 1) {
          this.onDeleteBook(id)
        }
      }
    })
  },

  onEditBook(id) {
    wx.navigateTo({ url: `/pages/book-publish/book-publish?id=${id}` })
  },

  onDeleteBook(id) {
    wx.showModal({
      title: '确认删除',
      content: '删除后这本书将从书架移除，且无法恢复。',
      confirmText: '删除',
      confirmColor: '#d96666',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...', mask: true })
        try {
          const cloudRes = await wx.cloud.callFunction({
            name: 'deleteBook',
            data: { bookId: id }
          })
          wx.hideLoading()
          if (cloudRes.result.success) {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadAll()
          } else {
            wx.showToast({ title: cloudRes.result.error || '删除失败', icon: 'none' })
          }
        } catch (err) {
          wx.hideLoading()
          console.error('deleteBook failed', err)
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
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
