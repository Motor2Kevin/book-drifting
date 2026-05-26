const mockBooks = [
  {
    _id: 'b001',
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    cover: 'https://img1.doubanio.com/view/subject/l/public/s27814883.jpg',
    message: '这本书改变了我看待世界的方式，希望你也能从中找到属于自己的思考。',
    ownerId: 'u002',
    ownerName: '阿杰',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jay',
    ownerWechat: 'jay_reader_2024',
    city: '北京',
    status: 'available',
    createdAt: '2026-05-20',
    history: [
      { fromName: '老王', toName: '阿杰', handedAt: '2026-04-10' },
      { fromName: '小林', toName: '老王', handedAt: '2026-02-15' }
    ]
  },
  {
    _id: 'b002',
    title: '原子习惯',
    author: '詹姆斯·克利尔',
    cover: 'https://img2.doubanio.com/view/subject/l/public/s33829249.jpg',
    message: '每天 1% 的改变，一年后是 37 倍。送给正在迷茫的你。',
    ownerId: 'u003',
    ownerName: '小雨',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rain',
    ownerWechat: 'rain_2025',
    city: '北京',
    status: 'available',
    createdAt: '2026-05-18',
    history: []
  },
  {
    _id: 'b003',
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    cover: 'https://img9.doubanio.com/view/subject/l/public/s24533161.jpg',
    message: '系统 1 和系统 2，看完之后你会更了解自己。',
    ownerId: 'u004',
    ownerName: 'Aria',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aria',
    ownerWechat: 'aria_books',
    city: '上海',
    status: 'reserved',
    reservedBy: 'u005',
    createdAt: '2026-05-15',
    history: [
      { fromName: '陈先生', toName: 'Aria', handedAt: '2026-03-20' }
    ]
  },
  {
    _id: 'b004',
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    cover: 'https://img1.doubanio.com/view/subject/l/public/s6384944.jpg',
    message: '魔幻现实主义经典，慢慢读，会有惊喜。',
    ownerId: 'u006',
    ownerName: '默',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mo',
    ownerWechat: 'mo_silent',
    city: '杭州',
    status: 'available',
    createdAt: '2026-05-12',
    history: []
  },
  {
    _id: 'b005',
    title: '深度工作',
    author: '卡尔·纽波特',
    cover: 'https://img9.doubanio.com/view/subject/l/public/s29516490.jpg',
    message: '在这个分心的时代，专注力是稀缺品。',
    ownerId: 'u007',
    ownerName: '哲',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhe',
    ownerWechat: 'zhe_focus',
    city: '北京',
    status: 'available',
    createdAt: '2026-05-10',
    history: [
      { fromName: '林子', toName: '哲', handedAt: '2026-04-01' }
    ]
  },
  {
    _id: 'b006',
    title: '小王子',
    author: '圣埃克苏佩里',
    cover: 'https://img2.doubanio.com/view/subject/l/public/s1103152.jpg',
    message: '只有用心才能看清事物本质，重要的东西用眼睛是看不见的。',
    ownerId: 'u008',
    ownerName: '糖糖',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tang',
    ownerWechat: 'tang_sweet',
    city: '深圳',
    status: 'available',
    createdAt: '2026-05-08',
    history: []
  }
]

const currentUser = {
  _openid: 'u001',
  nickname: '马子文',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mzw',
  wechatId: 'mzw_pm',
  city: '北京',
  holdingBooks: ['b007'],
  readBooks: ['b008', 'b009']
}

const myBooks = {
  holding: [
    {
      _id: 'b007',
      title: '蛤蟆先生去看心理医生',
      author: '罗伯特·戴博德',
      cover: 'https://img2.doubanio.com/view/subject/l/public/s33890546.jpg',
      message: '愿你也能找到属于自己的力量。',
      status: 'available',
      createdAt: '2026-05-22'
    }
  ],
  read: [
    {
      _id: 'b008',
      title: '被讨厌的勇气',
      author: '岸见一郎',
      cover: 'https://img1.doubanio.com/view/subject/l/public/s29448888.jpg',
      receivedFrom: '小林',
      receivedAt: '2026-03-15'
    },
    {
      _id: 'b009',
      title: '活着',
      author: '余华',
      cover: 'https://img9.doubanio.com/view/subject/l/public/s29053580.jpg',
      receivedFrom: '老王',
      receivedAt: '2026-01-20'
    }
  ]
}

module.exports = {
  mockBooks,
  currentUser,
  myBooks
}
