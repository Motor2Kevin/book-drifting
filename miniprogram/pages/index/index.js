const app = getApp()
const db = wx.cloud.database()
const { CITIES_WITH_ALL } = require('../../utils/cities.js')

Page({
  data: {
    allBooks: [],
    filteredBooks: [],
    currentCity: '全部',
    cityOptions: CITIES_WITH_ALL,
    cityIndex: 0,
    loading: true
  },

  onLoad() {
    this.loadBooks()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
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

  onCityChange(e) {
    const idx = parseInt(e.detail.value, 10)
    const city = CITIES_WITH_ALL[idx]
    this.setData({ currentCity: city, cityIndex: idx })
    this.filterByCity(city)
  },

  onClearFilter() {
    this.setData({ currentCity: '全部', cityIndex: 0 })
    this.filterByCity('全部')
  },

  filterByCity(city) {
    const list = city === '全部'
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
