<template>
  <div>
    <el-card class="header_card">
      <!-- 项目logo+名称，点击跳转文档管理页面 -->
      <div class="header_left">
        <el-link @click="goToFiles" :underline="false">
          <img src="@/assets/logo.png" alt="">
          <p>基于Web的3D协同建模系统</p>
        </el-link>
      </div>
      <!-- 用户账号下拉菜单，用于修改用户信息和退出登录 -->
      <div class="header_right">
        <el-dropdown>
        <span class="el_dropdown_link">
          {{userlist.username}}<i></i>
        </span>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item  @click.native="showEditDialog">我的信息</el-dropdown-item>
          <el-dropdown-item divided @click.native="logout">注销</el-dropdown-item>
        </el-dropdown-menu>
        </el-dropdown>
      </div>
    </el-card>
    <!-- 查看/修改用户信息对话框 -->
    <el-dialog
      title="查看/修改用户信息"
      :visible.sync="editDialogVisible" width="50%"
      @close="editDialogClosed"
    >
    <!-- @close="editDialogClosed" -->
      <!-- 内容主体区域 -->
      <el-form :model="editForm" :rules="editFormRules" ref="editFormRef" label-width="70px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editForm.username"></el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email"></el-input>
        </el-form-item>
        <!-- <el-form-item label="密码" prop="password">
          <el-input v-model="editForm.password" show-password></el-input>
        </el-form-item> -->
      </el-form>
      <!-- 底部区域 -->
      <span slot="footer" class="dialog-footer">
        <el-button @click="editDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="editUserInfo">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  props:{
    userId:String,
  },
  data(){
    return{
      // 当前登录用户信息列表
      userlist:{
        userId:'',
        username:'',
        email:''
      },
      // 控制修改用户对话框的显示与隐藏
      editDialogVisible:false,
      // 查询到的用户信息对象
      editForm:{},
      // 修改表单的验证规则对象
      editFormRules:{
        username: [{required: true, trigger: 'blur',message: '请输入用户名'}],
        email:[
        {required: true, trigger: 'blur',message: '请输入邮箱'},
        {pattern: /^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$/,trigger: 'blur',message: '请输入正确的邮箱'}
        ],
        // password: [{required: true,trigger: 'blur',message: '请输入密码'},]
      },
    }
  },
  created(){
    this.getUserList()
    this.emitUserlist()
  },
  methods:{
    goToFiles(){
      this.$router.push({
        path: `/${userId}/files`,
      })
    },

    // 注销账号
    logout() {
        // 退出登录需要清空sessionStorage中登录时存储的token
        window.sessionStorage.clear()
        this.$router.push("/");
    },
    // 获取当前登录用户信息 
    async getUserList(){
        // 不带参数 axios.get('/url')
        // 带参数 axios.get('/url', {params: {id: xx}})  //请求的地址实际为 localhost:8080/url?id=xx
        const {data:res} = await this.$http.get('/user/getUser',{
          params:{
            userId: this.userId
          }
        })
        if(res.status !== 200) return 
        console.log(res.data)
        this.userlist.userId = res.data.userId
        this.userlist.username = res.data.username
        this.userlist.email = res.data.email
    },

    // 触发自定义事件，将userlist传递给父组件
    emitUserlist() {
      this.$emit('getUserList', this.userlist);
    },

    // 展示编辑用户的对话框
    showEditDialog(){
        this.editForm = this.userlist
        this.editDialogVisible = true
    },
    // 监听修改用户对话框的关闭事件
        editDialogClosed(){
        if (this.$refs.editForm!==undefined) {
            this.$refs.editForm.resetFields();
        }
        // this.$refs.editForm.resetFields()
    },
    // 修改用户信息并提交
    editUserInfo(){
      this.$refs.editFormRef.validate(async valid => {
          if(!valid) return
          // 发起修改用户信息的数据请求
          const{data:res} = await this.$http.put('login', {
          username:this.editForm.username,
          email:this.editForm.email,
          password:this.editForm.password
          })
          if(res.meta.status!==200){
          return this.$message.error('修改用户信息失败')
          }
          // 隐藏添加对话框
          this.editDialogVisible = false
          this.getUserList()
          this.$message.success('修改用户信息成功')
      })
    },
  }
}
</script>

<style lang="less" scoped>
.header_card{
  padding: 0;
  .header_left{
    display: inline;
    float: left;
    padding-bottom: 20px;
    p{
      display: inline;
      padding-left: 15px;
      // color: #384259;
      font-weight: bold;
      font-size: 15px;
      vertical-align:middle;
    }
    img{
      display: inline;
      width: 50px;
      height: 50px;
      vertical-align:middle;
    }
  }
  .header_right{
    display: inline;
    float: right;
    padding: 10px 0;
    margin-right: 10px;
    .el-dropdown{
      float: right;
      margin-bottom: 15px;
    }
    .el_dropdown_link {
      cursor: pointer;
      color: #409EFF;
    }
  }
}
</style>