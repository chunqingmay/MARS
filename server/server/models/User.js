const db = require('../connection/db')

// 指定集合名称，并对字段进行约束
const User = db.model('user', {
  userId: {
    type: String,
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
})

// 向外导出 User 模型，在数据控制层中会使用
module.exports = User
