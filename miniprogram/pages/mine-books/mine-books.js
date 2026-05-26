const app = getApp()
const { resolveCovers } = require('../../utils/cover.js')

const ONE_HOUR = 1000 * 60 * 60
const RESERVE_TTL = 24 * ONE_HOUR

Page({
  data: {
    currentType: 'holding',
    holdingList: [],
    readList: [],
    reservedList: [],
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
      const [holdingRes, passedRes, reservedRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'getBooks', data: { action: 'myHolding' } }),
        wx.cloud.callFunction({ name: 'getBooks', data: { action: 'myPassed' } }),
        wx.cloud.callFunction({ name: 'getBooks', data: { action: 'myReserved' } })
      ])

      const holdingBooks = (holdingRes.result && holdingRes.result.books) || []
      const passedBooks = (passedRes.result && passedRes.result.books) || []
      const reservedBooks = (reservedRes.result && reservedRes.result.books) || []

      const readListRaw = passedBooks.map(b => {
        const myHistory = (b.history || []).find(h => h.fromId === openid)
        return {
          ...b,
          passedTo: myHistory ? myHistory.toName : '',
          passedAt: myHistory ? this.formatDate(myHistory.handedAt) : ''
        }
      })

      const reservedListRaw = reservedBooks.map(b => ({
        ...b,
        timeLeft: this.formatTimeLeft(b.reservedAt)
      }))

      const [holdingList, readList, reservedList] = await Promise.all([
        resolveCovers(holdingBooks),
        resolveCovers(readListRaw),
        resolveCovers(reservedListRaw)
      ])

      this.setData({
        holdingList,
        readList,
        reservedList,
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

  formatTimeLeft(reservedAt) {
    if (!reservedAt) return '已锁定'
    const start = new Date(reservedAt).getTime()
    const expiresAt = start + RESERVE_TTL
    const remain = expiresAt - Date.now()
    if (remain <= 0) return '即将释放'
    const hours = Math.floor(remain / ONE_HOUR)
    if (hours <= 0) {
      const minutes = Math.max(1, Math.floor(remain / 60000))
      return `还剩 ${minutes} 分钟`
    }
    return `还剩 ${hours} 小时`
  },

  onSwitchTab(e) {
    this.setData({ currentType: e.currentTarget.dataset.type })
  },

  onTapBook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/book-detail/book-detail?id=${id}` })
  },

  onCoverError(e) {
    const { id, type } = e.currentTarget.dataset
    const listKey = type === 'holding' ? 'holdingList' : (type === 'reserved' ? 'reservedList' : 'readList')
    const list = this.data[listKey].map(b => b._id === id ? { ...b, coverFailed: true } : b)
    this.setData({ [listKey]: list })
  },

  onCopyOwnerWechat(e) {
    const wechat = e.currentTarget.dataset.wechat
    if (!wechat) {
      wx.showToast({ title: '未找到微信号', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: wechat,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  onCancelReserve(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消预约',
      content: '取消后这本书会重新开放给其他人预约。确定吗？',
      confirmText: '取消预约',
      confirmColor: '#d96666',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...', mask: true })
        try {
          const cloudRes = await wx.cloud.callFunction({
            name: 'cancelReserve',
            data: { bookId: id }
          })
          wx.hideLoading()
          if (!cloudRes.result.success) {
            wx.showToast({ title: cloudRes.result.error || '取消失败', icon: 'none' })
            return
          }
          wx.showToast({ title: '已取消预约', icon: 'success' })
          this.loadAll()
        } catch (err) {
          wx.hideLoading()
          console.error('cancelReserve failed', err)
          wx.showToast({ title: '取消失败', icon: 'none' })
        }
      }
    })
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
