<template>
    <div>
      <!-- 搜索与添加区域 -->
      <el-row :gutter="20">
        <el-col :span="8">
          <el-input placeholder="请输入内容" v-model="queryInfo.query" clearable @clear="getMydocsList">
            <el-button slot="append" icon="el-icon-search" @click="getMydocsList"></el-button>
          </el-input>
        </el-col>
        <el-button type="primary" @click="addDialogVisible = true" icon="el-icon-circle-plus-outline">新建文档</el-button>
        <!-- <el-button type="success" @click="uploadDialogVisible = true" icon="el-icon-upload2">导入文档</el-button>
        <el-button type="warning" icon="el-icon-download" @click.native="exportDocument">导出文档</el-button> -->
        <!-- <el-dropdown>
          <el-button type="warning">导出</el-button>
          <el-dropdown-menu slot="dropdown">
              <el-dropdown-item @click.native="exportGltfData">导出Gltf格式</el-dropdown-item>
              <el-dropdown-item @click.native="exportStlData">导出Stl格式</el-dropdown-item>
              <el-dropdown-item @click.native="exportObjData">导出Obj格式</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown> -->
        <el-button type="danger" icon="el-icon-delete" @click="deleteSelectDoc">删除文档</el-button>
      </el-row>
      <!-- 我的文档列表区域 -->
      <el-table 
        :data="mydocsList" 
        border 
        stripe 
        :header-cell-style="{'text-align':'center'}"
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" align="center"></el-table-column>
        <el-table-column label="文档名称" prop="documentName" width="150px"></el-table-column>
        <el-table-column label="文档描述" prop="documentDes"></el-table-column>
        <el-table-column label="文档创建时间" prop="createTime" width="250px" align="center">
          <template v-slot="scope">
            {{scope.row.createTime | formatDateTime}}
          </template>
        </el-table-column>
        <el-table-column label="最近更新时间" prop="lastUpdateTime" width="250px" align="center">
          <template v-slot="scope">
            {{scope.row.lastUpdateTime | formatDateTime}}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="350px" align="center">
          <template v-slot="scope">
            <!-- v-slot="scope" -->
            <el-button type="primary" icon="el-icon-edit" size="mini" @click="goToModeling(scope.row.documentId)"></el-button>
            <el-button type="success" icon="el-icon-share" size="mini" @click.native="inviteDialogVisible = true"></el-button>
            <!-- <el-button type="warning" icon="el-icon-setting" size="mini"  @click.native="setDialogVisible = true"></el-button> -->
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页区域 -->
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="queryInfo.pagenum"
        :page-sizes="[3, 6, , 9]"
        :page-size="queryInfo.pagesize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total">
      </el-pagination>
      <!-- 新建文档对话框 -->
      <el-dialog
        title="新建文档"
        :visible.sync="addDialogVisible" width="50%"
        @close="addDialogClosed"
      >
        <el-form :model="addForm" :rules="addFormRules" ref="addFormRef" label-width="80px">
          <el-form-item label="文档名称" prop="documentName">
            <el-input v-model="addForm.documentName"></el-input>
          </el-form-item>
          <el-form-item label="文档描述" prop="documentDes">
            <el-input v-model="addForm.documentDes"></el-input>
          </el-form-item>
        </el-form>
        <span slot="footer" class="dialog-footer">
          <el-button @click="addDialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="addDoc">确 定</el-button>
        </span>
      </el-dialog>
      <!-- 上传文档对话框 -->
      <el-dialog
        title="上传文档"
        :visible.sync="uploadDialogVisible" width="50%"
        @close="uploadDialogClosed"
      >
        <el-upload
          :style="{'text-align':'center'}"
          class="upload-demo"
          drag
          action=" /modelFile/uploadModels "
          multiple>
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">
            <p>将文件拖到此处，或<em>点击上传</em>
              <br/>
              支持文件有GLTF文件、OBJ文件、MTL文件和STL文件
            </p>
          </div>
        </el-upload>
        <span slot="footer" class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="uploadFile">确 定</el-button>
        </span>
      </el-dialog>
      <!-- 邀请对话框 -->
      <el-dialog
        class="inviteDialog"
        title="邀请用户加入协作"
        :visible.sync="inviteDialogVisible" width="40%"
        @close="inviteDialogClosed"
      >
        <el-form ref="mydocsList" :model="mydocsList" label-width="80px">
          <el-row>
            <el-col :span="11">
              <el-form-item label="文档名称">
                <el-input v-model="mydocsList.documentName"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="创建者">
                <el-input v-model="mydocsList.documentCreator"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="分享链接">
            <el-input v-model="mydocsList.url" :style="{ width: '521px' }"></el-input>
            <el-button type="primary" @click="copyURL" style="margin-left: 10px;">复制</el-button>
          </el-form-item>
        </el-form>
      </el-dialog>
      <!-- 修改文档信息对话框 -->
      <el-dialog
        title="修改文档信息"
        :visible.sync="setDialogVisible" width="50%"
        @close="setDialogClosed"
      >
        <!-- 内容主体区域 -->
        <el-form :model="setForm" ref="setFormRef" label-width="80px">
          <el-form-item label="文档名称" prop="documentName">
            <el-input v-model="setForm.documentName"></el-input>
          </el-form-item>
          <el-form-item label="文档描述" prop="documentDes">
            <el-input v-model="setForm.documentDes"></el-input>
          </el-form-item>
        </el-form>
        <!-- 底部区域 -->
        <span slot="footer" class="dialog-footer">
          <el-button @click="setDialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="setDocument">确 定</el-button>
        </span>
      </el-dialog>
    </div>
  </template>
  
  <script>
  import { mapState } from 'vuex'
  import * as THREE from 'three'
  import {GLTFExporter} from "three/examples/jsm/exporters/GLTFExporter"
  import {OBJExporter} from "three/examples/jsm/exporters/OBJExporter"
  import {STLExporter} from "three/examples/jsm/exporters/STLExporter"
  export default {
    name:'document',
    data() {
      return {
        userId : this.$route.params.userId,
        // 查询参数对象
        queryInfo:{
          query:'', // 查询参数
          pagenum:1, // 当前页码
          pagesize:3 // 每页显示条数
        },
        // 我的文档列表
        mydocsList:[],
        // 我的文档列表总条数
        total:0,
        // 控制新建文档对话框的显示与隐藏
        addDialogVisible:false,
        // 新建文档的表单数据
        addForm:{
          documentName:'',
          documentDes:'',
        },
        // 新建文档表单的验证规则对象
        addFormRules:{
          documentName:[
            { required: true, message: '请输入文档名称', trigger: 'blur' },
            // { min: 3, max: 10, message: '长度在 3 到 5 个字符', trigger: 'blur' }
          ],
          documentDes:[
            { message: '请输入文档描述', trigger: 'blur' },
            // { min: 3, max: 10, message: '长度在 3 到 5 个字符', trigger: 'blur' }
          ],
        },
        // // 多选框选中状态存储
        multipleSelection:[],
        // // 控制上传文档对话框的显示与隐藏
        uploadDialogVisible:false,
        // //上传后的文件列表
        // fileList: [],
        // // 允许的文件类型
        // fileType: [ "pdf", "doc", "docx", "xls", "xlsx","txt","png", "jpg", "bmp", "jpeg"],
        // // 运行上传文件大小，单位 M
        // fileSize: 50,
        // // 附件数量限制
        // fileLimit: 5,
        // //请求头
        // headers: { "Content-Type": "multipart/form-data" },
        fileList: [],
        inviteDialogVisible:false,
        inviteForm:{},
        // 修改文档信息对话框
        setDialogVisible:false,
        setForm:{
          documentName:'',
          documentDes:'',
        },
      }
    },
    created(){
      this.getMydocsList()
    },
    computed: {
      ...mapState(['userlist']),
    },
    methods:{
      // 根据分页获取对应的我的文档列表
      async getMydocsList(){
        // const reqData = new URLSearchParams()
        // reqData.append('query',this.queryInfo.query)
        // reqData.append('pagenum',this.queryInfo.pagenum)
        // reqData.append('pagesize',this.queryInfo.pagesize)
        const {data:res} = await this.$http.get('/document/getDoc',{
          params:{
            userId:this.userId,
            query:this.queryInfo.query,
            pagenum:this.queryInfo.pagenum,
            pagesize:this.queryInfo.pagesize,
          }
        })
        if(res.status !== 200){
          return this.$message.error('获取我的文档列表失败')
        }
        console.log('获取列表数据成功')
        console.log(res)
        this.mydocsList = res.data.documentList
        console.log(this.mydocsList)
        this.setForm.documentName=this.mydocsList.documentName
        this.setForm.documentDes=this.mydocsList.documentDes
        this.total = res.data.total
      },
      // 监听pagesize改变的事件
      handleSizeChange(newSize){
        this.queryInfo.pagesize = newSize
        this.getMydocsList()
      },
      // 监听页码值改变的事件
      handleCurrentChange(newPage){
        this.queryInfo.pagenum = newPage
        this.getMydocsList()
      },
      // 监听新建文档对话框的关闭事件
      addDialogClosed(){
        if (this.$refs.addForm!==undefined) {
          this.$refs.addForm.resetFields();
        }
        // this.$refs.addFormRef.resetFields()
      },
      // 点击按钮,新建文档
      addDoc(){
        this.$refs.addFormRef.validate(async valid => {
          if(!valid) return
          // 通过预校验，发起添加用户的网络请求
          const reqData = new URLSearchParams()
          reqData.append('userId',this.userId)
          reqData.append('documentName', this.addForm.documentName)
          reqData.append('documentDes', this.addForm.documentDes)
          reqData.append('documentCreator', this.userlist.username)
          console.log(reqData)
          const{data:res} = await this.$http.post('/document/createDoc',reqData)
          if(res.status!== 201){
            return this.$message.error('新建文档失败')
          }
          this.$message.success('新建文档成功')
          // 隐藏添加对话框
          this.addDialogVisible = false
          this.addForm = {}
          this.getMydocsList()
        })
      },
      // 上传文档
      uploadFile(){

      },

      // // 导出gltf格式
      // exportGltfData() {
      //   console.log(this.multipleSelection)
      //   const sceneData = sessionStorage.getItem('sceneData')
      //   const loader = new THREE.ObjectLoader()
      //   const scene = loader.parse(JSON.parse(sceneData))
      //   const exporter = new GLTFExporter();
      //   const documentName = this.mydocsList.documentName
      //   const options = {
      //     trs: false,
      //     onlyVisible: true,
      //     truncateDrawRange: true,
      //     binary: false,
      //     maxTextureSize: Infinity
      //   };
      //   exporter.parse(scene, function (result) {
      //     if (result instanceof ArrayBuffer) {
      //       // GLB模型
      //       const blob = new Blob([result], { type: 'application/octet-stream' });
      //       saveAs(blob, documentName + '模型' + '.glb');
      //     } else {
      //       // GLTF模型
      //       const output = JSON.stringify(result, null, 2);
      //       const blob = new Blob([output], { type: 'application/octet-stream' });
      //       saveAs(blob, documentName + '模型' + '.gltf');
      //     }
      //   }, options);
      // },

      // // 导出stl格式
      // exportStlData() {
      //   const exporter = new STLExporter();
      //   const stlData = exporter.parse(this.objects);

      //   const documentName = this.documentInfo.documentName; // 获取文件名

      //   const blob = new Blob([stlData], { type: 'application/octet-stream' });
      //   saveAs(blob, documentName + '模型' + '.stl'); // 使用文件名
      // },

      // // 导出obj格式
      // exportObjData() {
      //   const exporter = new OBJExporter();
      //   const objData = exporter.parse(this.objects);

      //   const documentName = this.documentInfo.documentName; // 获取文件名

      //   const blob = new Blob([objData], { type: 'application/octet-stream' });
      //   saveAs(blob, documentName + '模型' + '.obj'); // 使用文件名
      // },
      
      // 监听上传文档对话框的关闭事件
      uploadDialogClosed(){
        if (this.$refs.editForm!==undefined) {
          this.$refs.editForm.resetFields();
        }
      },
      
      //获取多选的数据
      handleSelectionChange(val) {
        this.multipleSelection = val;//存储选中的数据
        console.log(val);
      },

      // 多选删除文档
      async deleteSelectDoc() {
        if (this.multipleSelection.length === 0) {
          this.$message.error("没有选中任何文档");
          return;
        }
        const documentIds = this.multipleSelection.map(item => item.documentId);
        // 弹框询问用户是否删除数据
        const confirmResult = await this.$confirm('此操作将永久删除所选文档，是否继续?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).catch(err => err);
        if (confirmResult !== 'confirm') {
          return this.$message.info('已取消删除');
        }
        try {
          const { data } = await this.$http.delete('/document/deleteDoc', {
            data: { documentIds }
          });
          if (data.status === 200) {
            this.$message.success('删除文档成功');
            this.getMydocsList();
          } else {
            this.$message.error('删除文档失败');
          }
        } catch (error) {
          console.error(error);
          this.$message.error('删除文档出错');
        }
      },

      // 跳转到文档编辑
      goToModeling(documentId){
        this.$router.push({
          path: `/${this.userId}/${documentId}/modeling`,
        })
      },
      copyURL() {
        const el = document.createElement('textarea');
        el.value = this.inviteForm.url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        this.$message.success('复制成功');
      },
      inviteDialogClosed(){
        console.log('邀请对话框关闭')
      },
      setDocument(){

      },
      setDialogClosed(){
        console.log('修改文档信息对话框关闭')
      },

    }
  }
  </script>
  
  <style lang="less" scoped>
  /deep/ .el-upload-dragger{
    width: 500px;
  }
  </style>