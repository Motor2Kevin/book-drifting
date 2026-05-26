const app = getApp()
const db = wx.cloud.database()

const MAX_IMAGES = 5

Page({
  data: {
    isEdit: false,
    bookId: '',
    form: {
      images: [],
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
      let images = []
      if (Array.isArray(book.images) && book.images.length > 0) {
        images = book.images.slice(0, MAX_IMAGES)
      } else if (book.cover) {
        images = [book.cover]
      }
      this.setData({
        form: {
          images,
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

  onAddImages() {
    const remaining = MAX_IMAGES - this.data.form.images.length
    if (remaining <= 0) return
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath)
        const merged = [...this.data.form.images, ...newPaths].slice(0, MAX_IMAGES)
        this.setData({ 'form.images': merged })
        this.checkCanSubmit()
      }
    })
  },

  onRemoveImage(e) {
    const idx = parseInt(e.currentTarget.dataset.index, 10)
    const next = this.data.form.images.filter((_, i) => i !== idx)
    this.setData({ 'form.images': next })
    this.checkCanSubmit()
  },

  onPreviewImage(e) {
    const idx = parseInt(e.currentTarget.dataset.index, 10)
    wx.previewImage({
      current: this.data.form.images[idx],
      urls: this.data.form.images
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

  async uploadImage(path) {
    if (path.startsWith('cloud://')) return path
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath: `book-covers/${ts}-${rand}.jpg`,
      filePath: path
    })
    return uploadRes.fileID
  },

  async onSubmit() {
    if (!this.data.canSubmit || this.data.submitting) return
    this.setData({ submitting: true })

    if (app.loginPromise) await app.loginPromise

    wx.showLoading({ title: this.data.isEdit ? '保存中...' : '发布中...', mask: true })

    try {
      const uploadedImages = []
      for (const path of this.data.form.images) {
        const url = await this.uploadImage(path)
        uploadedImages.push(url)
      }

      const payload = {
        title: this.data.form.title.trim(),
        author: this.data.form.author.trim(),
        message: this.data.form.message.trim(),
        images: uploadedImages,
        cover: uploadedImages[0] || '',
        city: (app.globalData.userInfo && app.globalData.userInfo.city) || ''
      }

      const res = this.data.isEdit
        ? await wx.cloud.callFunction({
            name: 'updateBook',
            data: { ...payload, bookId: this.data.bookId }
          })
        : await wx.cloud.callFunction({
            name: 'publishBook',
            data: payload
          })

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
