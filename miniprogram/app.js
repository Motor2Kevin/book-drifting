App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('当前微信版本过低，无法使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud1-d5gapkl6615f7b76a',
      traceUser: true
    })
    this.globalData.isCloudReady = true

    const cached = wx.getStorageSync('userInfo')
    if (cached) {
      this.globalData.userInfo = cached
    }

    this.loginPromise = this.doLogin()
  },

  async doLogin() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          nickname: (this.globalData.userInfo && this.globalData.userInfo.nickname) || '',
          avatar: (this.globalData.userInfo && this.globalData.userInfo.avatar) || ''
        }
      })
      if (res.result && res.result.user) {
        this.globalData.userInfo = res.result.user
        this.globalData.openid = res.result.openid
        wx.setStorageSync('userInfo', res.result.user)
        wx.setStorageSync('openid', res.result.openid)
      }
      return res.result
    } catch (e) {
      console.error('login failed', e)
      return null
    }
  },

  globalData: {
    userInfo: null,
    openid: '',
    isCloudReady: false,
    cloudEnv: 'cloud1-d5gapkl6615f7b76a'
  }
})
