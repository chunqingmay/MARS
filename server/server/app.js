const express = require('express')
const cors = require('cors')
const userRouter = require('./routers/user')
const modelRouter = require('./routers/model')
const documentRouter = require('./routers/document')
const modelFileRouter = require('./routers/modelFile')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors())
app.use(express.urlencoded({ extended: false }))
// 增加请求体的限制大小为 100mb
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
// CORS设置跨域访问
app.all('*', (req, res, next) => {
  // 响应头的设置，我的后台支持跨域请求
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Content-Type', 'application/json;charset=utf-8');
  next();
});

// 设置静态文件夹，用于访问上传的文件
app.use('/uploads', express.static('uploads'));

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
