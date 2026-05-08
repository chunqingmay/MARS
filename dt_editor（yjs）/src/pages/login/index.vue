<template>
    <div class="login_container">
      <vue-particles
        color="#dedede"
        :particleOpacity="1.5"
        :particlesNumber="80"
        shapeType="circle"
        :particleSize="5"
        linesColor="#dedede"
        :linesWidth="1"
        :lineLinked="true"
        :lineOpacity="1"
        :linesDistance="150"
        :moveSpeed="3"
        :hoverEffect="true"
        hoverMode="grab"
        :clickEffect="true"
        clickMode="push"
      >
      </vue-particles>
      <div id="particles-js"></div>
      <div class="login_box">
        <div class="title_container">
          <h2>欢迎使用3D协同建模系统
          </h2>
        </div>
        <!-- 登录表单 -->
        <el-form ref="loginFormRef" :model="loginForm" :rules="loginFormRules" class="login_form">
          <el-form-item prop="username">
            <el-input
              ref="username"
              v-model="loginForm.username"
              placeholder="请输入用户名"
              name="username"
              type="text"
              auto-complete="off"
              prefix-icon="el-icon-user"/>
          </el-form-item>
          <el-form-item prop="email">
            <el-input
              ref="email"
              v-model="loginForm.email"
              placeholder="请输入邮箱"
              name="email"
              type="email"
              auto-complete="off"
              prefix-icon="el-icon-message"/>
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              ref="password"
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              name="password"
              auto-complete="off"
              prefix-icon="el-icon-lock"/>
          </el-form-item>
          <!-- 按钮 -->
          <el-form-item class="btns">
            <el-button type="primary" size="mini" @click="login">登录</el-button>
          </el-form-item>
        </el-form>
        <!-- 注册 + 找回密码 -->
        <div class="register_container">
          <p class="find_password">
            <router-link to="/recovery" type="primary">还没注册？</router-link>
          </p>
          <p class="register">
            <router-link to="/register" type="primary">忘记密码？</router-link>
          </p>
        </div>
      </div>
    </div>
  </template>
  
  <script>

    export default {
      data() {
        return {
          // 登录表单
          loginForm: {
            username: '',
            email:'',
            password: ''
          },
          // 登录表单验证规则
          loginFormRules: {
            username: [{required: true, trigger: 'blur',message: '请输入用户名'}],
            email:[
              {required: true, trigger: 'blur',message: '请输入邮箱'},
              {pattern: /^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$/,trigger: 'blur',message: '请输入正确的邮箱'}
            ],
            password: [{required: true,trigger: 'blur',message: '请输入密码'},]
          },
        }
      },
      methods:{
        // 登录
        login(){
            this.$refs.loginFormRef.validate(async validate=>{  //async将箭头函数修饰成异步函数 async-await 简化promise操作
            // 判断表单是否合法
            if(!validate) return
            // 表单合法，发送请求
            // data重名为res
            const reqData = new URLSearchParams()
            reqData.append('username',this.loginForm.username)
            reqData.append('email',this.loginForm.email)
            reqData.append('password',this.loginForm.password)
            console.log(this.loginForm)
            console.log(reqData)
            try {
              const { data: res } = await this.$http.post('/user/login', reqData);
              console.log(res);
              console.log(res.status);
              this.$message.success('登录成功');
              window.localStorage.setItem('token', res.data.token);
              const userId = res.data.userInfo.userId;
              console.log(userId);
              this.$router.push({
                path: `/${userId}`,
              });
              const attemptedUrl = localStorage.getItem('attemptedUrl') || `/${userId}/document`;
              localStorage.removeItem('attemptedUrl'); // 清除已保存的URL
              this.$router.push(attemptedUrl);
            } catch (error) {
              if(error.response.data.status == 404){
                return this.$message.error('邮箱不存在，请注册账号！')
              }
              if(error.response.data.status == 401){
                return this.$message.error('密码错误，请重新输入！')
              }
            }
          })
        }
      }
    }
  </script>
  
  <style lang="less" scoped>
//  .login_container{
//     width: 100%;
//     height: 100%;
//     position: fixed;
//     background: url("../../assets/bg1.jpg") no-repeat center center fixed;
//     /*兼容浏览器版本*/
//     -webkit-background-size: cover;
//     -o-background-size: cover;
//     background-size: cover;
//   }
#particles-js {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

 .login_box{
    width: 450px;
    height: 400px;
    background-color: rgba(255, 255, 255, 0.4);
    border: 1px solid #dedede;
    border-radius: 10px;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%,-50%);
    box-shadow: 0 0 10px 5px #dedede;
  }
  .title_container{
    text-align: center;
    padding-top: 25px;
  }
  .login_form{
    position: absolute;
    width: 100%;
    padding: 15px 20px 0 20px;
    box-sizing: border-box;
  }
  .el-button{
    width: 100%;
    height: 35px;
    margin-top: 30px;
    font-size: 15px;
    font-weight: 600;
  }
  .register_container{
    display: flow-root;
    // float: left;
    padding-top: 190px;
    font-size: 13px;
    margin: 0 20px;
    a:link { color: rgb(64, 158, 255); text-decoration: none; }
    a:visited { color: rgb(64, 158, 255); text-decoration: none; }
    a:hover { color: rgb(64, 158, 255); text-decoration: none; }
    .find_password{
      float: left;
    }
    .register{
      float: right;
    }
  }
  .team_des{
    position: absolute;
    left: 50%;
    top: 80%;
    transform: translate(-50%,-50%);
    color: rgb(128, 125, 125);
  }
  </style>