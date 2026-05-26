const app = getApp()
const { resolveBookImages } = require('../../utils/cover.js')
const { isAdmin } = require('../../utils/admin.js')

Page({
  data: {
    book: null,
    bookId: '',
    showAdminDelete: false,
    isOwner: false,
    isReservedByMe: false,
    currentOpenid: ''
  },

  onLoad(options) {
    const id = options.id
    this.setData({ bookId: id })
    this.loadBook(id)
  },

  async onShow() {
    if (app.loginPromise) await app.loginPromise
    const openid = app.globalData.openid || wx.getStorageSync('openid')
    this.setData({
      showAdminDelete: isAdmin(openid),
      currentOpenid: openid
    })
    if (this.data.bookId) {
      this.loadBook(this.data.bookId)
    }
  },

  refreshBookState(book) {
    const openid = this.data.currentOpenid
    this.setData({
      book,
      isOwner: !!openid && book.ownerId === openid,
      isReservedByMe: !!openid && book.status === 'reserved' && book.reservedBy === openid
    })
  },

  async loadBook(id) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getBooks',
        data: { action: 'detail', bookId: id }
      })
      if (!res.result || !res.result.success) {
        throw new Error((res.result && res.result.error) || '加载失败')
      }
      const book = await resolveBookImages(res.result.book)
      this.refreshBookState(book)
    } catch (e) {
      console.error('loadBook failed', e)
      wx.showToast({ title: '书籍不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
    }
  },

  onPreviewImage(e) {
    const idx = parseInt(e.currentTarget.dataset.index, 10)
    const urls = (this.data.book && this.data.book.images) || []
    if (urls.length === 0) return
    wx.previewImage({
      current: urls[idx] || urls[0],
      urls
    })
  },

  onAdminDelete() {
    wx.showModal({
      title: '管理员删除',
      content: `确认删除《${this.data.book.title}》？\n\n仅当书籍内容违规时使用，删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#d96666',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...', mask: true })
        try {
          const cloudRes = await wx.cloud.callFunction({
            name: 'deleteBook',
            data: { bookId: this.data.bookId, reason: 'admin: violated content' }
          })
          wx.hideLoading()
          if (cloudRes.result.success) {
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1200)
          } else {
            wx.showToast({ title: cloudRes.result.error || '删除失败', icon: 'none' })
          }
        } catch (err) {
          wx.hideLoading()
          console.error('admin delete failed', err)
          wx.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
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

    wx.showLoading({ title: '预约中...' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'reserveBook',
        data: { bookId: this.data.bookId }
      })
      wx.hideLoading()

      if (!res.result.success) {
        wx.showToast({ title: res.result.error || '预约失败', icon: 'none' })
        return
      }

      const { ownerWechat, ownerName } = res.result

      const updatedBook = {
        ...this.data.book,
        status: 'reserved',
        reservedBy: this.data.currentOpenid,
        ownerWechat: ownerWechat || this.data.book.ownerWechat
      }
      this.refreshBookState(updatedBook)

      wx.showModal({
        title: '预约成功 ✅',
        content: `已为你锁定 24 小时\n请加 ${ownerName} 的微信沟通交接：\n\n${ownerWechat}`,
        confirmText: '复制微信号',
        cancelText: '稍后再说',
        success: (modalRes) => {
          if (modalRes.confirm) {
            wx.setClipboardData({
              data: ownerWechat,
              success: () => wx.showToast({ title: '已复制', icon: 'success' })
            })
          }
        }
      })
    } catch (e) {
      wx.hideLoading()
      console.error('reserveBook failed', e)
      wx.showToast({ title: '预约失败', icon: 'none' })
    }
  },

  onCopyOwnerWechat() {
    const wechat = this.data.book && this.data.book.ownerWechat
    if (!wechat) {
      wx.showToast({ title: '未找到微信号', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: wechat,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  onCancelReserve() {
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
            data: { bookId: this.data.bookId }
          })
          wx.hideLoading()
          if (!cloudRes.result.success) {
            wx.showToast({ title: cloudRes.result.error || '取消失败', icon: 'none' })
            return
          }
          wx.showToast({ title: '已取消预约', icon: 'success' })
          const updatedBook = {
            ...this.data.book,
            status: 'available',
            reservedBy: null
          }
          this.refreshBookState(updatedBook)
        } catch (err) {
          wx.hideLoading()
          console.error('cancelReserve failed', err)
          wx.showToast({ title: '取消失败', icon: 'none' })
        }
      }
    })
  }
})
