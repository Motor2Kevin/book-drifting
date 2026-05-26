Page({
  data: {},

  onContactAdmin() {
    wx.setClipboardData({
      data: 'mzw_pm',
      success: () => {
        wx.showToast({ title: '已复制管理员微信', icon: 'success' })
      }
    })
  }
})
