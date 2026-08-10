const express = require('express')
const cors = require('cors')
const path = require('path')
const userRouter = require('./routers/user')
const modelRouter = require('./routers/model')
const documentRouter = require('./routers/document')
const modelFileRouter = require('./routers/modelFile')

const app = express()

// CORS 跨域
app.use(cors())

// 解析请求体（支持大文件上传）
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// 设置静态文件夹，用于访问上传的文件（使用绝对路径）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== 时钟同步接口 ==========
// NTP 简化算法：客户端通过此接口获取服务器时间，计算时钟偏移
app.get('/sync/time', (req, res) => {
  res.json({
    serverTime: Date.now(),
    // 也可以返回 process.hrtime 用于更高精度，但 Date.now() 足够用
  });
});

// 注册路由，并定义接口前缀为user
app.use('/user', userRouter)
app.use('/model', modelRouter)
app.use('/document', documentRouter)
app.use('/uploadModels', modelFileRouter)

app.listen(3000, () => {
  console.log('serve running at http://localhost:3000');
})
