const db = require('../connection/db')

// 指定集合名称，并对字段进行约束
const Model = db.model('models', {
  documentId:{
    type: String,
    required: true
  },
  modeldata: {
    type: String,
    required: true
  }
})

// 向外导出 User 模型，在数据控制层中会使用
module.exports = Model
