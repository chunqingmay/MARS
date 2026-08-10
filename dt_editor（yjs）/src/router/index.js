import Vue from 'vue'
import VueRouter from 'vue-router'
import home from '../pages/home'
import login from '../pages/login/index.vue'
import findPwd from '../pages/login/findPwd.vue'
import register from '../pages/register'
import files from '../pages/files/index.vue'
import modeling from '../pages/modeling'
import document from '../pages/files/document'
import shareFiles from '../pages/files/shareFiles'
import recycleBin from '../pages/files/recycleBin'

const originalPush = VueRouter.prototype.push

VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch(err => {
    if (err.name !== 'NavigationDuplicated') throw err
  })
}

function isAuthenticated() {
  return localStorage.getItem('token') !== null;
}

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: home
  },
  {
    path: '/login',
    name: 'login',
    component: login
  },
  {
    path: '/recovery',
    name: 'findPwd',
    component: findPwd
  },
  {
    path: '/register',
    name: 'register',
    component: register
  },
  {
    path: '/:userId/files',
    name: 'files',
    component: files,
    redirect:'/:userId/document',
    beforeEnter: (to, from, next) => {
      if (!isAuthenticated()) {
        alert("您尚未登录，请先登录后再尝试访问。");
        localStorage.setItem('attemptedUrl', to.fullPath);
        next('/login');
      } else {
        next();
      }
    },
    children:[
      {
        path:'/:userId/document',
        name: 'document',
        component:document,
      },
      {
        path:'/:userId/shareFiles',
        component:shareFiles
      },
      {
        path:'/:userId/recycleBin',
        component:recycleBin
      },
    ]
  },
  {
    path: '/:userId/:documentId/modeling',
    name: 'modeling',
    component: modeling,
    beforeEnter: (to, from, next) => {
      if (!isAuthenticated()) {
        alert("您尚未登录，请先登录后再尝试访问。");
        localStorage.setItem('attemptedUrl', to.fullPath);
        next('/login');
      } else {
        next();
      }
    },
  },
]

const router = new VueRouter({
  routes
})

export default router
