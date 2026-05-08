// const ModelFile = require('../models/ModelFile');

const multer = require('multer');

const path = require('path');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const baseName = file.originalname.replace(ext, '').replace(/[\s\W]+/g, '_');
        const safeFileName = baseName + '-' + uniqueSuffix + ext;
        req.safeFileName = safeFileName; // 将安全文件名添加到 req 对象
        cb(null, safeFileName);
    }
});

const upload = multer({ storage: storage }).single('file');

class UploadController {
    static uploadModelFile(req, res) {
        upload(req, res, function(err) {
            if (err instanceof multer.MulterError) {
                return res.status(500).json(err);
            } else if (err) {
                return res.status(500).json(err);
            }
            // 使用 req 中的 safeFileName
            const fileUrl = 'http://localhost:3000/uploads/' + encodeURIComponent(req.safeFileName);
            res.status(200).send({ message: '文件上传成功', fileUrl: fileUrl });
        });
    }
}

module.exports = UploadController;

