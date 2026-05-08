const express = require('express')

// 导入用户数据控制器
const UserController = require('../controllers/userController')

// 创建路由对象
const router = express.Router()

// 设置路由
// 该接口需要提供表单数据，所以使用post请求
// 参数说明：router.post(api请求地址, 执行控制器里面的注册方法)
router.post('/register', UserController.register) 
router.post('/login', UserController.login) 

// router.get('/users', UserController.findUsers)  // 查询全部用户接口

router.get('/getUser', UserController.getUserById)  // 查询具体用户接口

router.put('/update', UserController.updateUser)  // 更新用户接口

router.delete('/:_id', UserController.deleteUser) // 删除具体用户接口
// 导入路由对象
module.exports = router
