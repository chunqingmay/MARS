import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import VueParticles from 'vue-particles'
Vue.use(VueParticles)
import './plugins/element.js'
import './assets/css/global.css'


// 导入axios
import axios from 'axios'

// 配置请求根路径 - 根据当前访问地址动态拼接，支持手机和电脑同时访问
axios.defaults.baseURL = `http://${window.location.hostname}:3000`
// 设置请求拦截器
// // 在request拦截器中展示进度条
// axios.interceptors.request.use(config=>{
//   NProgress.start()
//   // console.log(config)
//   // 需要授权的 API ，必须在请求头中使用 `Authorization` 字段提供 `token` 令牌
//   config.headers.Authorization = window.sessionStorage.getItem('token')
//   // 在最后必须return config
//   return config
// })
// // 在response中隐藏进度条
// axios.interceptors.response.use(config=>{
//   NProgress.done()
//   // 在最后必须return config
//   return config
// })
Vue.prototype.$http = axios

Vue.config.productionTip = false

// 全局时间格式化过滤器
Vue.filter('formatDateTime', function (value) {
  if (value) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
});

// global registration of viewer component


new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
