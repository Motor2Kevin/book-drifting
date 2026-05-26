const app = getApp()

Page({
  data: {
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

  onChooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        this.setData({ 'form.cover': path })
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

    wx.showLoading({ title: '发布中...', mask: true })

    try {
      let coverFileID = ''
      if (this.data.form.cover) {
        const ts = Date.now()
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `book-covers/${ts}-${Math.random().toString(36).slice(2, 8)}.jpg`,
          filePath: this.data.form.cover
        })
        coverFileID = uploadRes.fileID
      }

      const res = await wx.cloud.callFunction({
        name: 'publishBook',
        data: {
          title: this.data.form.title.trim(),
          author: this.data.form.author.trim(),
          message: this.data.form.message.trim(),
          cover: coverFileID,
          city: (app.globalData.userInfo && app.globalData.userInfo.city) || ''
        }
      })

      wx.hideLoading()
      this.setData({ submitting: false })

      if (!res.result.success) {
        wx.showToast({ title: res.result.error || '发布失败', icon: 'none' })
        return
      }

      wx.showToast({ title: '发布成功', icon: 'success', duration: 1500 })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1500)
    } catch (e) {
      wx.hideLoading()
      this.setData({ submitting: false })
      console.error('publishBook failed', e)
      wx.showToast({ title: '发布失败', icon: 'none' })
    }
  }
})
