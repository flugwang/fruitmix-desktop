const defaultState = {
	upload: [],
	download: [],
	uploadFinish: true,
	downloadFinish: true,
	uploadingTasks: [],
	uploadedTasks: [],
	downloadingTasks: [],
	downloadedTasks:[]
}

const transmission = (state = defaultState, action)=>{
	switch(action.type) {
		case 'LOGIN_OFF':
			return Object.assign({}, state, {
				upload:[],
				download: [],
				uploadFinish: true,
				downloadFinish: true
			})

		case 'UPDATE_UPLOAD':
			return Object.assign({}, state, {
				uploadingTasks: action.userTasks,
				uploadedTasks: action.finishTasks
			})

		case 'UPDATE_DOWNLOAD':
			return Object.assign({}, state, {
				downloadingTasks: action.userTasks,
				downloadedTasks: action.finishTasks
			})

		default:
			return state
	}
}

export default transmission