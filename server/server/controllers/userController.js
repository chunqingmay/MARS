const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
// 导入User模型
const User = require('../models/User')

class UserController {
  // 注册用户
  async register(req, res) {
    const { username, email, password } = req.body
    const existingUser = await User.findOne({ email })
    if(existingUser){
      return res.status(400).send({
        status:400,
        msg:"该邮箱已被注册！"
      })
    }
    // 生成随机id
    const userId = uuidv4();
    // 生成盐值
    const salt = await bcrypt.genSalt(10);
    // 哈希加密密码
    const hashedPassword = await bcrypt.hash(password, salt);
    // 创建用户并保存到数据库
    const userInfo = new User({ userId, username, email, password: hashedPassword });
    await userInfo.save()
    // 调用 res.send() 方法，向客户端响应结果
    res.send({
      status: 201,
      msg: '注册成功！',
      data: userInfo
    })

  }

  // 登录
  async login(req, res) {
    const { username, email, password } = req.body
    // 检查用户是否存在
    const userInfo = await User.findOne({ email })
    if(!userInfo){
      return res.status(404).send({
        status:404,
        msg:"用户不存在！"
      })
    }
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, userInfo.password);
    if (!isPasswordValid) {
      return res.status(401).send({
        status: 401,
        msg: '密码不正确！'
      });
    }
    // 生成token 
    const token = jwt.sign({ userId: userInfo._id }, 'nodejs', {  algorithm: 'HS256', expiresIn: '1h' });
    // 登录成功，返回用户信息
    res.send({
      status: 200,
      msg: '登录成功！',
      data: {
        userInfo,
        token
      }
    });
  }








  // 查询所有用户
  // async findUsers(req, res) {
  //   // 拿到查询的数据（不传page_num和page_size则默认查询全部）
  //   const query = req.query
  //   // 计算 skip 值
  //   let skip = (parseInt(query.page_num) - 1) * parseInt(query.page_size)
  //   // 使用分页查询方法
  //   const users = await User.find().skip(skip).limit(query.page_size)
  //   res.send({
  //     status: 201,
  //     msg: '查询成功！',
  //     data: users
  //   })
  // }

  // 根据 id 查询用户
  async getUserById(req, res) {
    try {
      const { userId } = req.query;
      const user = await User.findOne({ userId});
      if (user) {
          res.send({
          status: 200,
          msg: '查询成功！',
          data: user
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

  // 修改用户
  async updateUser(req, res) {
    const userInfo = req.body
    // 根据id，更新用户数据
    const result = await User.updateOne({_id:userInfo._id}, userInfo)
    console.log(result)
    res.send({ status: 201, msg: '更新成功！' })
  }

  // 删除用户
  async deleteUser(req, res) {
    const { _id } = req.params
    const result = await User.deleteOne({ _id })
    console.log(result)
    res.send({ status: 201, msg: '删除成功！' })
  }
}

module.exports = new UserController()