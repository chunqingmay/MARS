const express = require('express');
const UploadController = require('../controllers/uploadController');
const router = express.Router();

// 使用 POST 请求处理模型文件的上传
router.post('/', UploadController.uploadModelFile);

module.exports = router;
