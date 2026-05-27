// 前端管理员判断仅用于按钮显示控制，真正的权限校验在云函数 deleteBook 里。
// 此处保留硬编码是因为前端代码本就公开（任何小程序都能被反编译查看），
// openid 暴露只导致"知道谁是管理员"，无法用于权限提升（云函数侧仍从 wxContext 拿身份）。
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
