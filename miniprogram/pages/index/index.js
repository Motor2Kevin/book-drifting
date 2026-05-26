const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    allBooks: [],
    filteredBooks: [],
    currentCity: 'all',
    loading: true
  },

  onLoad() {
    this.loadBooks()
  },

  onShow() {
    this.loadBooks()
  },

  onPullDownRefresh() {
    this.loadBooks().then(() => wx.stopPullDownRefresh())
  },

  async loadBooks() {
    this.setData({ loading: true })
    try {
      const res = await db.collection('books')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get()

      const books = res.data.map(b => ({
        ...b,
        statusText: b.status === 'available' ? '可漂' : '已约'
      }))

      this.setData({
        allBooks: books,
        loading: false
      })
      this.filterByCity(this.data.currentCity)
    } catch (e) {
      console.error('loadBooks failed', e)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onSelectCity(e) {
    const city = e.currentTarget.dataset.city
    this.setData({ currentCity: city })
    this.filterByCity(city)
  },

  filterByCity(city) {
    const list = city === 'all'
      ? this.data.allBooks
      : this.data.allBooks.filter(b => b.city === city)
    this.setData({ filteredBooks: list })
  },

  onTapBook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/book-detail/book-detail?id=${id}` })
  },

  async onTapPublish() {
    if (app.loginPromise) await app.loginPromise
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.wechatId) {
      wx.showModal({
        title: '完善信息',
        content: '发书前需要先填写你的微信号，方便下一位读者联系你',
        confirmText: '去填写',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/profile/profile' })
          }
        }
      })
      return
    }
    wx.navigateTo({ url: '/pages/book-publish/book-publish' })
  }
})
