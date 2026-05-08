import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    userlist: null,
  },

  getters: {
    
  },
  mutations: {
    updateUserlist(state, userlist) {
      state.userlist = userlist;
    },
  },
  actions: {
  },
  modules: {
  }
})
