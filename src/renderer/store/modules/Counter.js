const state = {
  main: 0,
  connected: false
}

const getters = {
    connected: state => state.connected,
}

const mutations = {
  DECREMENT_MAIN_COUNTER (state) {
    state.main--
  },
  INCREMENT_MAIN_COUNTER (state) {
    state.main++
  },
  SET_CONNECTION_STATUS (state, status) {
    state.connected = status
  }
}

const actions = {
  someAsyncTask ({ commit }) {
    // do something async
    commit('INCREMENT_MAIN_COUNTER')
  },
  setConnected ({ commit }, status) {
    commit('SET_CONNECTION_STATUS', status)
  },
}

export default {
  state,
  getters,
  mutations,
  actions
}
