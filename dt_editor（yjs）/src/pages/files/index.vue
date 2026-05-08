<template>
    <div class="project_container">
      <el-container>
        <!-- 头部 -->
        <el-header>
          <myHeader :userId="userId" @getUserList="handleGetUserList"></myHeader>


        </el-header>
        <el-container>
          <!-- 侧边栏卡片，我的文档/与我分享的文档/回收站 -->
          <el-card class="aside_card">
            <el-aside  :width="isCollapse ? '64px' : '200px'">
              <!-- 控制侧边栏折叠 -->
              <div class="toggle-button" @click="toggleCollpse">|||</div>
              <el-menu
                :default-active="activePath"
                unique-opened
                :collapse="isCollapse"
                :collapse-transition="false"
                router
                >
                <el-menu-item :index="'/' + userId + '/' + item.path" v-for="item in navList" :key="item.id" @click="saveNavState('/' + userId + '/' + item.path)">
                  <i :class="item.icon"></i>
                  <template slot="title">
                    <span>{{item.navItem}}</span>
                  </template>
                </el-menu-item>
              </el-menu>
            </el-aside>
          </el-card>
          <!-- 文档列表卡片 -->
          <el-card class="main_card">
            <el-main>
              <router-view></router-view>
            </el-main>
          </el-card>
          
          
          <!-- <el-dialog
            title="查看/修改用户信息"
            :visible.sync="editDialogVisible" width="50%"
            @close="editDialogClosed"
          >
          
            <el-form :model="editForm" :rules="editFormRules" ref="editFormRef" label-width="70px">
              <el-form-item label="账号名" prop="username">
                <el-input v-model="editForm.username"></el-input>
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="editForm.email"></el-input>
              </el-form-item>
              <el-form-item label="密码" prop="password">
                <el-input v-model="editForm.password" show-password></el-input>
              </el-form-item>
            </el-form>
            
            <span slot="footer" class="dialog-footer">
              <el-button @click="editDialogVisible = false">取 消</el-button>
              <el-button type="primary" @click="editUserInfo">确 定</el-button>
            </span>
          </el-dialog> -->
        </el-container>
      </el-container>
    </div>
  </template>
  
  <script>
    import myHeader from '../../components/myHeader.vue'
    import store from '../../store/index'
    export default {
      components: {
        myHeader
      },
      data() {
          return {
            userId : this.$route.params.userId,
            userlist:[],
            navList: [
              { path:'document', navItem: "我的文档", icon:"el-icon-s-home", id:"1"},
              // { path:'shareFiles', navItem: "与我共享的文档", icon:"el-icon-share", id:"2"},
              // { path:'recycleBin', navItem: "回收站", icon:"el-icon-delete-solid", id:"3"},
            ],
            // 是否折叠
            isCollapse: false,
            // 被激活的链接地址
            activePath: " ",
            // // 当前登录用户信息列表
            // userlist:[],
            // // 控制修改用户对话框的显示与隐藏
            // editDialogVisible:false,
            // // 查询到的用户信息对象
            // editForm:{},
            // // 修改表单的验证规则对象
            // editFormRules:{
            //   username: [{required: true, trigger: 'blur',message: '请输入账号'}],
            //   email:[
            //     {required: true, trigger: 'blur',message: '请输入邮箱'},
            //     {pattern: /^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$/,trigger: 'blur',message: '请输入正确的邮箱'}
            //   ],
            //   password: [{required: true,trigger: 'blur',message: '请输入密码'},]
            // },
          };
      },
      created(){
        this.activePath = window.sessionStorage.getItem('activePath')
        // console.log(this.userId)
        // this.getUserList()
      },
      methods: {
          // 点击按钮切换菜单的折叠与展开
          toggleCollpse() {
              this.isCollapse = !this.isCollapse;
          },
          // // 注销账号
          // logout() {
          //   // 退出登录需要清空sessionStorage中登录时存储的token
          //   window.sessionStorage.clear()
          //   this.$router.push("/");
          // },
          // 保存链接的激活状态
          saveNavState(activePath){
            this.activePath = activePath
            window.sessionStorage.setItem('activePath',activePath)

          },

          handleGetUserList(userlist){
            // 将userlist保存到Vuex store中
            store.commit('updateUserlist', userlist);
          }
      //     async getUserList(){
      //       // 不带参数 axios.get('/url')
      //       // 带参数 axios.get('/url', {params: {id: xx}})  //请求的地址实际为 localhost:8080/url?id=xx
      //       const {data:res} = await this.$http.get('login')
      //       if(res.meta.status !== 200) return this.$message.error('获取用户列表失败')
      //       this.userlist=res.data
      //       // console.log(this.userlist)
      //     },
      //     // // 展示编辑用户的对话框
      //     showEditDialog(){
      //       this.editForm = this.userlist
      //       this.editDialogVisible = true
      //     },
      //     // 监听修改用户对话框的关闭事件
      //     editDialogClosed(){
      //       if (this.$refs.editForm!==undefined) {
      //         this.$refs.editForm.resetFields();
      //       }
      //       // this.$refs.editForm.resetFields()
      //     },
      //     // 修改用户信息并提交
      //     editUserInfo(){
      //       this.$refs.editFormRef.validate(async valid => {
      //         if(!valid) return
      //         // 发起修改用户信息的数据请求
      //         const{data:res} = await this.$http.put('login', {
      //           username:this.editForm.username,
      //           email:this.editForm.email,
      //           password:this.editForm.password
      //         })
      //         if(res.meta.status!==200){
      //           return this.$message.error('修改用户信息失败')
      //         }
      //         // 隐藏添加对话框
      //         this.editDialogVisible = false
      //         this.getUserList()
      //         this.$message.success('修改用户信息成功')
      //       })
      //     },
      },
    }
  </script>
  
  <style lang="less" scoped>
.el-header,.el-main{
    padding: 0;
  }
  .el-main{
    overflow: hidden;
  }
//   .el-card{
//     border: none;
//   }
//   .el-card.is-always-shadow, .el-card.is-hover-shadow:focus, .el-card.is-hover-shadow:hover{
//     box-shadow: none;
//   }
// .el-header{
//   padding: 0;
//   .header_left{
//     display: inline;
//     float: left;
//     padding-bottom: 20px;
//     p{
//       display: inline;
//       padding-left: 15px;
//       // color: #384259;
//       font-weight: bold;
//       font-size: 15px;
//       vertical-align:middle;
//     }
//     img{
//       display: inline;
//       width: 50px;
//       height: 50px;
//       vertical-align:middle;
//     }
//   }
//   .header_right{
//     display: inline;
//     float: right;
//     padding: 10px 0;
//     margin-right: 10px;
//     .el-dropdown{
//       float: right;
//       margin-bottom: 15px;
//     }
//     .el_dropdown_link {
//       cursor: pointer;
//       color: #409EFF;
//     }
//   }
// }

.aside_card{
  margin-top: 50px;
  height: 800px;
  padding-left: 0px !important;
  /deep/.el-card__body {
    padding-left: 0;
    padding-right: 0;
  }
}
.el-aside{
  overflow: hidden;
  .el-menu{
    color: #fafafa;
    border-right: none;
    padding: 0;
  }
  .toggle-button{
    font-size: 10px;
    line-height: 24px;
    padding-bottom: 20px;
    color: #384259;
    text-align: center;
    letter-spacing: 0.2em;
    cursor: pointer;
  }
}

.main_card{
  margin: 50px 20px 0 20px;
  height: 800px;
  width: 100%;
}
</style>