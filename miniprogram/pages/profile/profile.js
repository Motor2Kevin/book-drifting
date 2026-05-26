const app = getApp()
const db = wx.cloud.database()
const { CITIES } = require('../../utils/cities.js')

Page({
  data: {
    form: {
      avatar: '',
      avatarFileID: '',
      nickname: '',
      wechatId: '',
      city: ''
    },
    openid: '',
    cityOptions: CITIES,
    cityIndex: -1,
    defaultAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    saving: false
  },

  onCopyOpenid() {
    wx.setClipboardData({
      data: this.data.openid,
      success: () => wx.showToast({ title: '已复制 openid', icon: 'success' })
    })
  },

  onCityChange(e) {
    const idx = parseInt(e.detail.value, 10)
    this.setData({
      cityIndex: idx,
      'form.city': CITIES[idx]
    })
  },

  async onLoad() {
    if (app.loginPromise) await app.loginPromise
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {}
    const city = userInfo.city || ''
    const openid = app.globalData.openid || wx.getStorageSync('openid') || ''
    this.setData({
      form: {
        avatar: userInfo.avatar || '',
        avatarFileID: userInfo.avatarFileID || '',
        nickname: userInfo.nickname === '匿名书友' ? '' : (userInfo.nickname || ''),
        wechatId: userInfo.wechatId || '',
        city
      },
      openid,
      cityIndex: city ? CITIES.indexOf(city) : -1
    })
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        this.setData({ 'form.avatar': res.tempFiles[0].tempFilePath })
      }
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  async onSave() {
    if (this.data.saving) return
    const { nickname, wechatId, avatar, city } = this.data.form
    if (!nickname.trim()) {
      wx.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }
    if (!wechatId.trim()) {
      wx.showToast({ title: '请填写微信号', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...', mask: true })

    try {
      let avatarFileID = this.data.form.avatarFileID
      const isLocalFile = avatar && !avatar.startsWith('cloud://') && !avatar.startsWith('https://') && !avatar.startsWith('http://api')
      if (isLocalFile) {
        const ts = Date.now()
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${ts}-${Math.random().toString(36).slice(2, 8)}.jpg`,
          filePath: avatar
        })
        avatarFileID = uploadRes.fileID
      }

      const openid = app.globalData.openid || wx.getStorageSync('openid')
      const updates = {
        nickname: nickname.trim(),
        wechatId: wechatId.trim(),
        city: city.trim(),
        avatar: avatarFileID || avatar,
        avatarFileID: avatarFileID,
        updatedAt: db.serverDate()
      }

      await db.collection('users').where({ _openid: openid }).update({
        data: updates
      })

      const newUserInfo = { ...app.globalData.userInfo, ...updates, _openid: openid }
      app.globalData.userInfo = newUserInfo
      wx.setStorageSync('userInfo', newUserInfo)

      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      wx.hideLoading()
      this.setData({ saving: false })
      console.error('save profile failed', e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
})
