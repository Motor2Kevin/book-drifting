Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '书架',
        icon: '📚'
      },
      {
        pagePath: '/pages/mine/mine',
        text: '我的',
        icon: '👤'
      }
    ]
  },

  methods: {
    switchTab(e) {
      const index = parseInt(e.currentTarget.dataset.index, 10)
      const url = this.data.list[index].pagePath
      wx.switchTab({ url })
    }
  }
})
