const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    isEdit: false,
    bookId: '',
    form: {
      cover: '',
      coverFileID: '',
      title: '',
      author: '',
      message: ''
    },
    canSubmit: false,
    submitting: false
  },

  async onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, bookId: options.id })
      wx.setNavigationBarTitle({ title: '修改书籍' })
      await this.loadBook(options.id)
    }
  },

  async loadBook(id) {
    wx.showLoading({ title: '加载中...', mask: true })
    try {
      const res = await db.collection('books').doc(id).get()
      const book = res.data
      this.setData({
        form: {
          cover: book.cover || '',
          coverFileID: book.cover && book.cover.startsWith('cloud://') ? book.cover : '',
          title: book.title || '',
          author: book.author || '',
          message: book.message || ''
        }
      })
      this.checkCanSubmit()
    } catch (e) {
      console.error('loadBook failed', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  onChooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        this.setData({ 'form.cover': path, 'form.coverFileID': '' })
        this.checkCanSubmit()
      }
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({ [`form.${field}`]: value })
    this.checkCanSubmit()
  },

  checkCanSubmit() {
    const { title, author, message } = this.data.form
    const canSubmit = !!(title.trim() && author.trim() && message.trim())
    this.setData({ canSubmit })
  },

  async onSubmit() {
    if (!this.data.canSubmit || this.data.submitting) return
    this.setData({ submitting: true })

    if (app.loginPromise) await app.loginPromise

    wx.showLoading({ title: this.data.isEdit ? '保存中...' : '发布中...', mask: true })

    try {
      let coverFileID = this.data.form.coverFileID
      const cover = this.data.form.cover
      const needsUpload = cover && !cover.startsWith('cloud://') && !cover.startsWith('https://')
      if (needsUpload) {
        const ts = Date.now()
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `book-covers/${ts}-${Math.random().toString(36).slice(2, 8)}.jpg`,
          filePath: cover
        })
        coverFileID = uploadRes.fileID
      }

      const payload = {
        title: this.data.form.title.trim(),
        author: this.data.form.author.trim(),
        message: this.data.form.message.trim(),
        cover: coverFileID || cover,
        city: (app.globalData.userInfo && app.globalData.userInfo.city) || ''
      }

      let res
      if (this.data.isEdit) {
        res = await wx.cloud.callFunction({
          name: 'updateBook',
          data: { ...payload, bookId: this.data.bookId }
        })
      } else {
        res = await wx.cloud.callFunction({
          name: 'publishBook',
          data: payload
        })
      }

      wx.hideLoading()
      this.setData({ submitting: false })

      if (!res.result.success) {
        wx.showToast({ title: res.result.error || '操作失败', icon: 'none' })
        return
      }

      wx.showToast({
        title: this.data.isEdit ? '已保存' : '发布成功',
        icon: 'success',
        duration: 1500
      })
      setTimeout(() => {
        if (this.data.isEdit) {
          wx.navigateBack()
        } else {
          wx.switchTab({ url: '/pages/index/index' })
        }
      }, 1500)
    } catch (e) {
      wx.hideLoading()
      this.setData({ submitting: false })
      console.error('submit failed', e)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  }
})
