const Model = require('../models/Model')
const fs = require('fs')
const path = require('path')


class ModelController{
    // 保存模型
    async saveModel(req, res) {
        try {
            const {  documentId, modeldata } = req.body;
            const existModel = await Model.findOne({ documentId })
            if(existModel){
                existModel.modeldata = modeldata
                const updatedModel = await existModel.save();
                    res.send({ 
                    status: 201, 
                    msg: '更新成功！', 
                    data: updatedModel 
                });
            } else{
                // 创建新的模型对象并设置文档 ID 和其他字段
                const modelObj = new Model({ 
                    documentId, 
                    modeldata 
                });
                const modelInfo = await modelObj.save();
                res.send({ 
                    status: 201, 
                    msg: '保存成功！', 
                    data: modelInfo 
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).send({ 
                status: 500, 
                msg: '服务器错误' 
            });
        }
    }

    // 获取模型
    async getModel(req, res) {
        try {
            const { documentId } = req.query;
            const model = await Model.findOne({ documentId });
            if (model) {
                res.send({
                status: 200,
                msg: '查询成功！',
                data: model
                });
            } else {
                res.send({
                status: 404,
                msg: '未找到匹配的数据！',
                data: null
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).send({ 
                status: 500, 
                msg: '服务器错误' 
            });
        }
    }

    // // gltf格式导出模型
    // async exportGltf(req, res) {
    //     const { data: gltfData, documentName } = req.body
    //     console.log(gltfData)
    //     // 从请求中获取GLTF数据
    //     if (gltfData) {
    //         // 将GLTF数据写入文件
    //         fs.writeFile(`${documentName}.gltf`, gltfData, 'binary', (err) => {
    //         if (err) {
    //             console.error(err);
    //             res.status(500).send({
    //             status: 500,
    //             msg: '服务器错误'
    //             });
    //         } else {
    //             // 读取文件并发送响应
    //             const file = fs.createReadStream(`${documentName}.gltf`);
    //             res.setHeader('Content-Type', 'application/octet-stream');
    //             res.setHeader('Content-Disposition', 'attachment; filename=model.gltf');
    //             file.pipe(res);
    //         }
    //         });
    //     } else {
    //         res.status(400).send({
    //             status: 400,
    //             msg: '缺少GLTF数据'
    //         });
    //     }
    // }

    // // stl格式导出模型
    // async exportStl(req, res) {
    //     const { data: stlData, documentName } = req.body;
      
    //     // 从请求中获取STL数据
    //     if (stlData) {
    //       // 将STL数据写入文件
    //       fs.writeFile(`${documentName}.stl`, stlData, 'binary', (err) => {
    //         if (err) {
    //           console.error(err);
    //           res.status(500).send({
    //             status: 500,
    //             msg: '服务器错误'
    //           });
    //         } else {
    //           // 读取文件并发送响应
    //           const file = fs.createReadStream(`${documentName}.stl`);
    //           res.setHeader('Content-Type', 'application/octet-stream');
    //           res.setHeader('Content-Disposition', `attachment; filename=${documentName}.stl`);
    //           file.pipe(res);
    //         }
    //       });
    //     } else {
    //       res.status(400).send({
    //         status: 400,
    //         msg: '缺少STL数据'
    //       });
    //     }
    //   }
      
    //   // obj格式导出模型
    //   async exportObj(req, res) {
    //     const { data: objData, documentName } = req.body;
      
    //     // 从请求中获取OBJ数据
    //     if (objData) {
    //       // 将OBJ数据写入文件
    //       fs.writeFile(`${documentName}.obj`, objData, 'binary', (err) => {
    //         if (err) {
    //           console.error(err);
    //           res.status(500).send({
    //             status: 500,
    //             msg: '服务器错误'
    //           });
    //         } else {
    //           // 读取文件并发送响应
    //           const file = fs.createReadStream(`${documentName}.obj`);
    //           res.setHeader('Content-Type', 'application/octet-stream');
    //           res.setHeader('Content-Disposition', `attachment; filename=${documentName}.obj`);
    //           file.pipe(res);
    //         }
    //       });
    //     } else {
    //       res.status(400).send({
    //         status: 400,
    //         msg: '缺少OBJ数据'
    //       });
    //     }
    // }




}

module.exports = new ModelController()


