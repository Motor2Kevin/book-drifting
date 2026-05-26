# 书籍漂流小程序

让一本书，遇见更多人 📚

## 项目状态

- ✅ MVP 前端 UI 完成（7 个页面，使用本地 mock 数据）
- ⏳ 待接入云开发（需要 AppID 后进行）
- ⏳ 待接入订阅消息通知

## 项目结构

```
book-drifting/
├── miniprogram/              # 小程序前端
│   ├── pages/
│   │   ├── index/           # ① 书架首页（Tab）
│   │   ├── book-detail/     # ② 书籍详情
│   │   ├── book-publish/    # ③ 发布书籍
│   │   ├── mine/            # ④ 我的（Tab）
│   │   ├── mine-books/      # ⑤ 我的书列表
│   │   ├── profile/         # ⑥ 个人设置
│   │   └── about/           # ⑦ 加群/关于
│   ├── components/          # 共享组件（暂空）
│   ├── utils/               # 工具函数
│   ├── mock/                # 本地假数据
│   ├── app.js
│   ├── app.json
│   └── app.wxss
├── cloudfunctions/           # 云函数（接云开发后用）
├── project.config.json
└── README.md
```

## 如何预览

### 1. 下载微信开发者工具

https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 2. 导入项目

- 打开开发者工具
- 点击「导入项目」
- 项目目录选择：`~/Documents/VibeCoding/book-drifting/`
- AppID 选择「测试号」即可（没有 AppID 也能本地预览）
- 后端服务选择「不使用云服务」

### 3. 开始浏览

进入后默认在「书架」Tab，可以体验：

- 浏览书籍列表 + 按城市筛选
- 点击书籍查看详情、申请「我想要」（弹窗会模拟复制持有人微信号）
- 点击 + 发书按钮（首次会引导填写微信号）
- 「我的」Tab 查看个人主页、持有书、已读书

## 关键设计决策

1. **沟通完全靠微信** —— 不做站内信，申请书后直接暴露持有人微信号
2. **运营靠 300 人微信群** —— 小程序只做「书目展示 + 撮合」
3. **MVP 不做扫码识别** —— 用户手填书名作者，封面拍照上传
4. **状态机简化** —— 不要"申请-同意"流程，先到先得 + 24h 超时释放

## 待办（接 AppID 后）

- [ ] 注册微信小程序 AppID（[mp.weixin.qq.com](https://mp.weixin.qq.com)）
- [ ] 替换 `project.config.json` 中的 `appid` 字段
- [ ] 在开发者工具中开通「云开发」
- [ ] 把 mock 数据迁移到云数据库（books / users 两个集合）
- [ ] 实现云函数：
  - `login` —— 微信登录获取 openid
  - `publishBook` —— 发布书籍
  - `reserveBook` —— 申请锁定 24h
  - `confirmHandover` —— 确认完成交接
  - `releaseExpired` —— 定时任务，释放超时未交接的预约
- [ ] 接入订阅消息（申请提醒、交接完成提醒）

## 颜色规范

- 主色：`#8b6f47`（书皮棕）
- 背景：`#f5f3ee`（米白）
- 文字：`#2c2825`（深棕黑）
- 次要文字：`#999`

## 字段说明

### Book

| 字段 | 类型 | 说明 |
|------|------|------|
| `_id` | string | 书籍 ID |
| `title` | string | 书名 |
| `author` | string | 作者 |
| `cover` | string | 封面图 URL |
| `message` | string | 给下一位读者的话 |
| `ownerId` | string | 当前持有人 openid |
| `ownerName` | string | 持有人昵称（冗余） |
| `ownerWechat` | string | 持有人微信号（冗余） |
| `city` | string | 城市 |
| `status` | string | available / reserved / handed_over |
| `reservedBy` | string | 申请人 openid（reserved 时有值） |
| `history` | array | 漂流历史 |

### User

| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 微信 openid（主键） |
| `nickname` | string | 昵称 |
| `avatar` | string | 头像 URL |
| `wechatId` | string | 微信号（核心字段，用于交接） |
| `city` | string | 所在城市 |
