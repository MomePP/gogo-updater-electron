const state = {
  connected: false,
  update_progress: 0
}

const getters = {
    connected: state => state.connected,
    update_progress: state => state.update_progress
}

const mutations = {
  SET_CONNECTION_STATUS (state, status) {
    state.connected = status
  },
  UPDATE_PROGRESS_STATUS (state, progress) {
    state.update_progress = progress
  }
}

const actions = {
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
