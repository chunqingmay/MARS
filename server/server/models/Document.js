const db = require('../connection/db')

// 指定集合名称，并对字段进行约束
const Document = db.model('documents', {
    userId:{
        type: String,
        required: true
    },
    documentId:{
        type:String,
        required:true
    },
    documentName: {
        type: String,
        required: true
    },
    documentDes: {
        type: String,
        // required: true
    },
    documentCreator: {
        type: String,
        required: true
    },
    createTime: {
        type: Date,
        required: true
    },
    lastUpdateTime: {
        type: Date,
    },
})

// 向外导出 User 模型，在数据控制层中会使用
module.exports = Document
