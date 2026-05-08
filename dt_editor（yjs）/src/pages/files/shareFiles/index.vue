<template>
  <div>
    <!-- 搜索与添加区域 -->
    <el-row :gutter="20">
        <el-col :span="8">
          <el-input placeholder="请输入内容" v-model="queryInfo.query" clearable @clear="getShareDocsList">
            <el-button slot="append" icon="el-icon-search" @click="getShareDocsList"></el-button>
          </el-input>
        </el-col>
      </el-row>
      <!-- 与我分享列表区域 -->
      <el-table :data="shareDocsList" border stripe :header-cell-style="{'text-align':'center'}">
        <el-table-column type="index" align="center"></el-table-column>
        <el-table-column label="文档名称" prop="shareDocs_name"></el-table-column>
        <el-table-column label="管理者" prop="shareDocs_gov" width="350px"></el-table-column>
        <el-table-column label="最近更新时间" prop="upd_time" width="350px" align="center">
          <template v-slot="scope">
            {{scope.row.upd_time | dataFormat}}
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页区域 -->
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="queryInfo.pagenum"
        :page-sizes="[1, 2, 3, 4]"
        :page-size="queryInfo.pagesize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total">
      </el-pagination>
  </div>
</template>

<script>
export default {
  data() {
    return {
      // 查询参数对象
      queryInfo:{
        query:'', // 查询参数
        pagenum:1, // 当前页码
        pagesize:2 // 每页显示条数
      },
      // 与我分享文档列表
      shareDocsList:[],
      // 与我分享文档总条数
      total:0,
    }
  },
  created(){
    this.getShareDocsList()
  },
  methods:{
    // 根据分页获取对应的与我分享文档列表
    async getShareDocsList(){
      const {data:res} = await this.$http.get('getShareDocs',{params:this.queryInfo})
      if(res.meta.status !== 200){
        return this.$message.error('获取与我分享的列表失败')
      }
      console.log('获取数据成功')
      this.shareDocsList = res.data.shareDocs
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
    // 监听添加用户对话框的关闭事件
    addDialogClosed(){
      this.$refs.addFormRef.resetFields()
    },
  }
}
</script>

<style>

</style>