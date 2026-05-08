const Document = require('../models/Document'); // 假设你有一个文档模型
const { v4: uuidv4 } = require('uuid');

class DocumentController {
    // 获取文档列表
    async getDocumentList(req, res) {
        try {
          const { userId, query, pagenum, pagesize } = req.query;
          const document = await Document.findOne({ userId });
          if (document) {
            // 查询条件示例
            const condition = {};
      
            // 如果有查询参数 query，可以根据需要设置查询条件
            if (query) {
              condition.documentName = { $regex: query, $options: 'i' };
            }
      
            // 处理页码和每页记录数，确保它们是有效的正整数
            const pageNum = parseInt(pagenum) || 1;
            const pageSize = parseInt(pagesize) || 10;
      
            // 分页查询
            const totalRecords = await Document.countDocuments(condition); // 总记录数
            const totalPages = Math.ceil(totalRecords / pageSize); // 总页数
            console.log(totalPages)
            // 确保页码不超出范围
            const validPageNum = Math.max(1, Math.min(pageNum, totalPages));
      
            const startIndex = (validPageNum - 1) * pageSize;
            console.log(startIndex)
            const endIndex = startIndex + pageSize - 1;
            console.log(endIndex)
      
            const documentList = await Document.find(condition)
              .skip(startIndex)
              .limit(pageSize);
      
            res.send({
              status: 200,
              msg: '获取文档列表！',
              data: {
                total: totalRecords,
                pagenum: validPageNum,
                pagesize: pageSize,
                documentList,
              },
            });
          } else {
            res.send({
              status: 200,
              msg: '用户没有文档！',
              data: {
                totalpage: 0,
                pagenum: 0,
                documentList: [],
              },
            });
          }
        } catch (error) {
          console.error(error);
          res.status(500).send({
            status: 500,
            msg: '获取文档列表失败！',
          });
        }
    }
      
    // 创建文档
    async createDocument(req, res) {
        try {
            const { userId, documentName, documentDes, documentCreator } = req.body;
            // 获取当前时间
            const createTime = new Date();
            // 生成随机id
            const documentId = uuidv4();
            // 创建文档
            const document = new Document({
                userId,
                documentId,
                documentName,
                documentDes,
                documentCreator,
                createTime
            });
        
            // 保存文档到数据库
            const savedDocument = await document.save();
        
            res.status(201).send({
                status: 201,
                msg: '文档创建成功！',
                data: savedDocument
            });
        } catch (error) {
            console.error(error);
            res.status(500).send({
                status: 500,
                msg: '文档创建失败！',
                error: error.message
            });
        }
    }

    // 删除文档
    async deleteDocument(req, res) {
        try {
          const { documentIds } = req.body;
      
          // 在数据库中查找并删除文档
          const deletedDocuments = await Document.deleteMany({ documentId: { $in: documentIds } });
      
          if (deletedDocuments.deletedCount > 0) {
            res.send({
              status: 200,
              msg: '文档删除成功！',
            });
          } else {
            res.status(404).send({
              status: 404,
              msg: '未找到该文档！',
            });
          }
        } catch (error) {
            console.error(error);
            res.status(500).send({
                status: 500,
                msg: '删除文档失败！',
            });
        }
    }

    // 通过id获取单个文档
    async getDocumentById(req, res) {
        try {
          const { documentId } = req.query;
          // 查询数据库获取文档信息
          const document = await Document.findOne({ documentId });
          if (!document) {
            return res.status(404).send({
              status: 404,
              msg: '文档不存在！',
            });
          }
          res.status(200).send({
            status: 200,
            msg: '获取文档信息成功！',
            data: document,
          });
        } catch (error) {
          console.error(error);
          res.status(500).send({
            status: 500,
            msg: '获取文档信息失败！',
            error: error.message,
          });
        }
    }
      
    
      
}

module.exports = new DocumentController();