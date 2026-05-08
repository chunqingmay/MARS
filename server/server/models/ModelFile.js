
const db = require('../connection/db')

// 指定集合名称，并对字段进行约束
const ModelFile = db.model('modelFiles', {
    filename:{
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
})

// 向外导出 User 模型，在数据控制层中会使用
module.exports = ModelFile

  
