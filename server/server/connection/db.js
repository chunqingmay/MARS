const mongoose = require('mongoose')

// 1. 连接数据库
const db = mongoose
.createConnection('mongodb://localhost:27017/dtEditor', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
},
err => {
    if (err) {
      return console.log('数据库连接失败：', err)
    }
    console.log('数据库连接成功！')
  }
)

// 向外导出，在模型层需要使用
module.exports = db
