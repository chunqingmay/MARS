<template>
    <div class="register_container">
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
      <div class="register_box">
        <div class="title_container">
          <h2>用户注册</h2>
        </div>
        <!-- 注册表单 -->
        <el-form ref="registerFormRef" :model="registerForm"  status-icon :rules="registerFormRules" class="register_form">
          <el-form-item prop="userName" label="用户名">
            <el-input
              ref="userName"
              v-model="registerForm.userName"
              placeholder="请输入用户名"
              name="userName"
              type="text"
              auto-complete="off"/>
          </el-form-item>
          <el-form-item prop="email" label="邮箱">
            <el-input
              ref="email"
              v-model="registerForm.email"
              placeholder="请输入邮箱"
              name="email"
              type="email"
              auto-complete="off">
            </el-input>
          </el-form-item>

          <el-form-item prop="verificationCode" label="验证码">
            <el-input
              ref="verificationCode"
              v-model="registerForm.verificationCode"
              placeholder="请输入验证码"
              name="verificationCode"
              auto-complete="off">
              <template slot="append">
                <el-button>验证邮箱</el-button>
              </template>
            </el-input>
          </el-form-item>


          <el-form-item prop="password" label="密码">
            <el-input
              ref="password"
              v-model="registerForm.password"
              type="password"
              placeholder="请输入密码"
              name="password"
              auto-complete="off"/>
          </el-form-item>
          <!-- 按钮 -->
          <el-form-item class="btns">
            <el-button type="primary" size="mini" @click="register">注册</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        // 注册表单
        registerForm: {
          userName: '',
          email:'',
          password: ''
        },
        // 注册表单验证规则
        registerFormRules: {
          userName: [{required: true, trigger: 'blur',message: '请输入用户名'}],
          email:[
            {required: true, trigger: 'blur',message: '请输入邮箱'},
            {pattern: /^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$/,trigger: 'blur',message: '请输入正确的邮箱'}
          ],
          password: [{required: true,trigger: 'blur',message: '请输入密码'},]
        },
      }
    },
    methods:{
      register(){
        this.$refs.registerFormRef.validate(async valid => {
          if(!valid) return
          // 通过预校验，发起添加用户的网络请求
          const reqData = new URLSearchParams()
          reqData.append('username',this.registerForm.userName)
          reqData.append('email',this.registerForm.email)
          reqData.append('password',this.registerForm.password)
          try{
            const{data:res} = await this.$http.post('/user/register',reqData)
            this.$message.success('注册成功，请登录')
            this.$router.push('/user/login')
          } catch(error) {
            if(error.response.data.status == 400){
              return this.$message.error('用户存在，请登录')
            }
          }
        })
      }
    }
  }
  </script>
  
  <style lang="less" scoped>
  // .register_container{
  //   width: 100%;
  //   height: 100%;
  //   position: fixed;
  //   background: url("../../assets/bg.jpg") no-repeat center center fixed;
  //   /*兼容浏览器版本*/
  //   -webkit-background-size: cover;
  //   -o-background-size: cover;
  //   background-size: cover;
  // }
  .register_box{
    width: 500px;
    height: 600px;
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
  .register_form{
    position: absolute;
    width: 100%;
    padding: 0 20px;
    box-sizing: border-box;
  }
  .el-button{
    margin-top: 15px;
    width: 100%;
    height: 35px;
    font-size: 15px;
    font-weight: 600;
  }
  </style>