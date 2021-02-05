const state = {
  main: 0,
  connected: false,
  update_progress: 0
}

const getters = {
    connected: state => state.connected,
    update_progress: state => state.update_progress
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
  },
  UPDATE_PROGRESS_STATUS (state, progress) {
    state.update_progress = progress
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
  updateProgress({ commit }, progress) {
    commit('UPDATE_PROGRESS_STATUS', progress)
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
