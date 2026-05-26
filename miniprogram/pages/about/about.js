Page({
  data: {},

  onTapQrcode() {
    wx.previewImage({
      urls: ['/images/admin-qrcode.jpg'],
      current: '/images/admin-qrcode.jpg'
    })
  }
})
