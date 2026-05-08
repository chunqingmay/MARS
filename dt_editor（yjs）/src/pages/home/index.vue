<template>
  
    <div class="index_container">
      <el-container>
        <!-- 头部 -->
        <el-header>
          <el-card>
            <div class="header_left">
              <img src="@/assets/logo.png" alt="">
              <p>基于Web的3D协同建模系统</p>
            </div>
            <div class="header_right">
              <el-button type="primary" size="medium" @click="login">登录</el-button>
            </div>
          </el-card>
        </el-header>
        <!-- 容器内容 -->
        <el-main>
          <!-- slogan + 登录按钮 + 注册按钮 -->
          <div class="main_top">
            <div class="main_top_left">
              <h1>3D协同建模系统</h1>
              <h2>让协作更高效，让建模更轻松。</h2>
              <div class="button_group">
                <el-button type="primary" plain @click="register">注册账号</el-button>
                <el-button type="primary" @click="login">快速开始</el-button>
              </div>
            </div>
            <div class="main_top_right">
              <img src="@/assets/logo.png" alt="">
            </div>
          </div>
          <!-- introduction -->
          <!-- <div class="block">
            <el-carousel height="400px">
              <el-carousel-item v-for="item in 4" :key="item">
                <h3 class="small">{{ item }}</h3>
              </el-carousel-item>
            </el-carousel>
          </div> -->
        </el-main>
      </el-container>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        
      }
    },
    methods:{
      login(){
        this.$router.push("/login")
      },
      register(){
        this.$router.push("/register")
      }
    }
  }
  </script>
  
  <style lang="less" scoped>
  .el-header,.el-main{
    padding: 0;
  }
  .el-card{
    border: none;
  }
  .el-card.is-always-shadow, .el-card.is-hover-shadow:focus, .el-card.is-hover-shadow:hover{
    box-shadow: none;
  }
  .el-card__body{
    padding: 10px;
  }
  .header_left{
    display: inline;
    float: left;
    padding-bottom: 20px;
    padding-left: 350px;
    p{
      display: inline;
      padding-left: 15px;
      // color: #384259;
      font-weight: bold;
      font-size: 25px;
      vertical-align:middle;
    }
    img{
      display: inline;
      width: 60px;
      height: 60px;
      vertical-align:middle;
    }
  }
  .header_right{
    display: inline;
    float: right;
    padding: 10px 350px 10px 0;
    margin-right: 10px;
  }
  .el-main{
    margin-top: 24px;
  }
  .main_top{
    width: 100%;
    // height: 400px;
    // padding-top: 12px;
    // display: inline;
    display: flex;
    justify-content: center;
    align-items: center;
    // float: left;
  }
  .main_top_left{
    // float: left;
    // width: 50%;
    padding: 70px 0 0 380px;
    h1{
      font-size: 50px;
    }
    .button_group{
      float: left;
      position: relative;
      margin-top: 20px;
      .el-button{
        width: 150px;
        height: 50px;
        font-size: 18px;
      }
    }
    .el-button{
      margin-right: 50px;
    }
  }
  .main_top_right{
    // float: right;
    padding: 70px 400px 0 0;
    // width: 50%;
    // img{
    //   // width: 300px;
    //   // height: 300px;
    //   // padding: 50px 50px;
    // }
  }
  .el-carousel{
    padding: 20px 380px 0 380px;
  }
  .el-carousel__item h3 {
    color: #475669;
    font-size: 14px;
    opacity: 0.75;
    line-height: 150px;
    margin: 0;
  }

  .el-carousel__item:nth-child(2n) {
     background-color: #aed2f0;
  }
  
  .el-carousel__item:nth-child(2n+1) {
     background-color: #9ed5ee;
  }
  </style>