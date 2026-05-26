// 管理员 openid 白名单，需要与 cloudfunctions/deleteBook/index.js 中的 ADMIN_OPENIDS 保持一致
// 仅用于前端控制按钮是否显示，真正的权限校验在云函数里
const ADMIN_OPENIDS = [
  'ofG6k6wGgggp1udLpAlJPeQK8od4'
]

function isAdmin(openid) {
  return !!openid && ADMIN_OPENIDS.includes(openid)
}

module.exports = {
  ADMIN_OPENIDS,
  isAdmin
}
