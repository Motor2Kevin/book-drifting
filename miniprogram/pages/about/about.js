Page({
  data: {},

  onContactAdmin() {
    wx.setClipboardData({
      data: 'mzw2i3',
      success: () => {
        wx.showToast({ title: '已复制微信号', icon: 'success' })
      }
    })
  }
})
