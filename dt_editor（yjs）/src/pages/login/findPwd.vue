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
          <h2>找回密码</h2>
        </div>
        <!-- 注册表单 -->
        <div class="forgot_password">
          <div class="content">
            <el-steps :active="active" finish-status="success" align-center>
              <el-step title="账号验证"></el-step>
              <el-step title="重置密码"></el-step>
              <el-step title="完成设置"></el-step>
            </el-steps>
            <div v-if="active=='0'">
              <el-form ref="verificationForm" :model="verificationForm"  :rules="verificationFormRules" class="demo-ruleForm" @submit.native.prevent>
                <!-- <el-form-item prop="userName" label="用户名">
                  <el-input v-model="verificationForm.userName" type="text" placeholder="请输入用户名" auto-complete="off" >
                  </el-input>
                </el-form-item> -->
                <el-form-item prop="email"  label="邮箱">
                  <el-input v-model="verificationForm.email" placeholder="请输入邮箱"/>
                </el-form-item>
                <el-form-item prop="captcha" label="验证码">
                  <el-input v-model="verificationForm.captcha" placeholder="请输入验证码">
                    <!-- 在输入框右侧添加获取验证码的按钮 -->
                    <template slot="append">
                      <el-button>验证邮箱</el-button>
                    </template>
                  </el-input>
                </el-form-item>
              </el-form>
              <div class="btn_wr">
                <button type="button" class="next_btn" @click.prevent="checkSecurityQuestion">下一步 <i class="el-icon-arrow-right" ></i></button>
              </div>
            </div>
            <div v-if="active=='1'">
              <el-form ref="forgotPasswordForm" :model="forgotPasswordForm" :rules="forgotPasswordFormRules"  class="demo_ruleForm" @submit.native.prevent>
                <el-form-item prop="pwd" label ="密码:">
                  <el-input v-model="forgotPasswordForm.pwd" type="password" placeholder="请输入新的密码" auto-complete="off" >
                  </el-input>
                </el-form-item>
                <el-form-item prop="confirmPwd" label ="确认密码:">
                  <el-input v-model="forgotPasswordForm.confirmPwd" placeholder="请再次输入密码" type="password">
                  </el-input>
                </el-form-item>
              </el-form>
              <div class="btn_wr">
                <button type="button" class="next_btn" @click.prevent="resetPassword">确认 <i class="el-icon-arrow-right" ></i></button>
              </div>
            </div>
            <div v-if="active=='2'">
            <div class="reset_success">
                <!-- <img src="../index/assets/images/success.png" alt=""> -->
              <p class="set_success">设置成功，去登录</p>
            </div>
              <div class="btn_wr">
                <button type="button" class="login_btn" @click="$router.push({path:'/login'})">登录 <i class="el-icon-arrow-right" ></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    data(){
      let validateConfirmPass = (rule, value, callback) => {
        if (value !== this.forgotPasswordForm.pwd) {
          callback(new Error('两次输入密码不一致,请重新输入'));
        } else {
          callback();
        }
      };
      return{
        active: 0,
        verificationForm:{
          userName:'',
          email:'',
        },
        forgotPasswordForm:{
          pwd:'',
          confirmPwd:'',
          account:''
        },
        options: [],
        verificationFormRules:{
          captcha: [{required: true, trigger: 'blur',message: '请输入验证码'}],
          email:[
            {required: true, trigger: 'blur',message: '请输入邮箱'},
            {pattern: /^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$/,trigger: 'blur',message: '请输入正确的邮箱'}
          ],
        },
        forgotPasswordFormRules: {
          pwd: [{ required: true, message: '请输入新的密码', trigger: 'blur' },],
          confirmPwd: [
            { required: true, message: '请再次输入密码', trigger: 'blur' },
            { validator: validateConfirmPass, trigger: 'blur' },
          ],
        }
      }
    },
    methods:{
      next() {
        if (this.active++ > 2) this.active = 0;
      },
      checkSecurityQuestion(){
        this.$refs.verificationForm.validate(valid => {
          if (valid) {
            // checkSecurityQuestion(this.verificationForm).then(res=>{
            //   if(res.code==200){
            //     this.forgotPasswordForm.account=this.verificationForm.account;
            //     this.active++
            //   }
            // })
            this.active++
          }
        })
      },
      resetPassword(){
        this.$refs.forgotPasswordForm.validate(valid => {
          if (valid) {
            // resetPassword(this.forgotPasswordForm).then(res=>{
            //     if(res.code==200){
            //       this.active++
            //     }
            // })
            this.active++
          }
        })
      },
    }
  }
  </script>
  
  <style lang="less" scoped>
//   .register_container{
//     width: 100%;
//     height: 100%;
//     position: fixed;
//     background: url("../../assets/bg.jpg") no-repeat center center fixed;
//     /*兼容浏览器版本*/
//     -webkit-background-size: cover;
//     -o-background-size: cover;
//     background-size: cover;
// }
  .register_box{
    width: 500px;
    height: 500px;
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
  .forgot_password{
    padding-top: 5px;
    /deep/.el-step.is-horizontal{
      .el-step__line{
        height: 2px;
        top: 20px;
      }
    }
    /deep/.el-step__icon{
      width: 42px;
      height: 42px;
      font-size: 18px;
    }
    /deep/.is-process{
      .el-step__icon{
        border: 2px solid rgb(64,158,255);
        color: rgb(64,158,255);
      }
    }
    /deep/.el-step__title.is-process{
      color: rgb(64,158,255);
      // text-align: center;
    }
    /deep/.el-form-item__label{
      width: 100%;
      text-align: left;
    }
    /deep/.el-form-item__content{
      display: inline-block;
      width: 100%;
      margin-left: 0px;
    }
  }
  .el-form{
    position: absolute;
    width: 100%;
    padding: 10px 20px;
    box-sizing: border-box;
  }
  .btn_wr{
    text-align: center;
  }
  .reset_success{
    text-align: center;
    margin: 60px 0;
  }
  .set_success{
    margin-top: 20px;
    font-weight: 600;
  }
  .next_btn{
    border: none;
    width: 200px;
    height:50px;
    line-height: 50px;
    margin-top: 230px;
    background: rgb(64,158,255);
    font-weight: 600;
    font-size: 16px;
    color: #FFFFFF;
    border-radius: 10px;
    margin-bottom: 10px;
    i{
      right: -50px;
      font-size: 27px;
      position: relative;
      vertical-align: middle;
    }
  }
  .login_btn{
    border: none;
    width: 200px;
    height:50px;
    line-height: 50px;
    background: rgb(64,158,255);
    font-weight: 600;
    font-size: 16px;
    color: #FFFFFF;
    border-radius: 10px;
    i{
      right: -50px;
      font-size: 27px;
      position: relative;
      vertical-align: middle;
    }
  }
  
  </style>