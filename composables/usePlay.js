import {
	ref,
	shallowRef,
	computed
} from 'vue'
import keyCenter from "./KeyCenter.js";

export function usePlay({engine,
	appendActionInfo,
	appendCallbackInfo,
	appendSuccessInfo
}) {
	const playStreamID = computed(() => {
		return keyCenter.getStreamID()
	})
	const playVideoElem = shallowRef(null)
	const isPlayingStream = ref(false)
	const playBtnName = ref("Start Playing")
	const playVideoMuted = ref(true)
	const playStream = shallowRef(null)

	// 单击拉流操作
	async function onClickPlay() {
		if (isPlayingStream.value) {
			stopPlayingStream(playStreamID.value);
			playBtnName.value = "Start Playing";
		} else {
			// await loginRoom(roomID, userID, userName);
			startPlayingStream(playStreamID.value);
			playBtnName.value = "Stop Playing";
		}
		isPlayingStream.value = !isPlayingStream.value;
	}
	// 开始拉流
	async function startPlayingStream(streamID, config) {
		appendActionInfo(`Start Playing Stream: streamID:${streamID}`);
		const result = await engine.value.startPlayingStream(streamID, config);
		// #ifdef H5
		console.warn(result)
		playVideoElem.value.srcObject = result;
		// playStream = result
		// #endif
		return result
	}
	// 停止拉流
	function stopPlayingStream(streamID) {
		appendActionInfo(`Stop Playing Stream: streamID:${streamID}`);
		engine.value.stopPlayingStream(streamID);
		// #ifdef H5
		playVideoElem.value.srcObject = null;
		// playStream = null
		// #endif
	}
	function addPlayListeners() {
		engine.value.on("roomStreamUpdate", (roomID, updateType, streamList) => {
			console.log("roomStreamUpdate", streamList)
			appendActionInfo(updateType)
			appendActionInfo(streamList)
			// 0 为add, 1 为delete
			if (updateType == 0) {
				let streamID = null,userID = uni.getStorageSync("userInfo").playerOnly;
				console.log(userID)
				// 排除自己的回传
				for (let i = 0; i < streamList.length; i++) {
					if (!streamList[i].streamID.includes(userID)) {
						streamID = streamList[i].streamID;
					}
				}
				if(streamID) {
					keyCenter.setStreamID(streamID);
					startPlayingStream(streamID)
				}
			}
		});
	}
	function playError(error) {
		console.warn('play error')
	}

	// 通过返回值暴露所管理的状态
	return {
		playStreamID,
		playVideoElem,
		isPlayingStream,
		playBtnName,
		playVideoMuted,
		playStream,
		onClickPlay,
		startPlayingStream,
		stopPlayingStream,
		addPlayListeners,
		playError
	}
}