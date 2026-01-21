import {
	ref,
	shallowRef
} from 'vue'
import keyCenter from "./KeyCenter.js";

export function usePublish({
	engine,
	appendActionInfo,
	appendCallbackInfo
}) {
	const publishStreamID = ref(keyCenter.streamID)
	const publishBtnName = ref("Start Publishing")
	const isPublishingStream = ref(false)
	const localVideoElem = shallowRef(null)
	const pubVideoMuted = ref(true)
	// 推流
	async function startPublishingStream(streamID, channel, config) {
		appendActionInfo(
			`Start Publishing Stream: streamID:${streamID}`
		);
		// 0 为channel
		await engine.value.startPublishingStream(streamID, channel, config);
	}
	// 停止推流
	function stopPublishingStream() {
		appendActionInfo(`Stop Publishing Stream`);
		stopPreview()
		engine.value.stopPublishingStream();
	}
	// 预览
	function startPreview() {
		appendActionInfo("Start Preview");
		// #ifdef H5
		engine.value.startPreview(
			localVideoElem.value
		);
		// #endif
		// #ifdef APP-PLUS
		engine.value.startPreview();
		// #endif
	}
	// 停止预览
	function stopPreview() {
		appendActionInfo("Stop Preview");
		engine.value?.stopPreview();
	}
	// 单击开始或停止推流
	async function onClickPublish() {
		if (isPublishingStream.value) {
			stopPublishingStream();
			publishBtnName.value = "Start Publishing";
		} else {
			await startPublishingStream(publishStreamID.value);
			publishBtnName.value = "Stop Publishing";
		}
		isPublishingStream.value = !isPublishingStream.value;
	}

	function addPublishListeners() {
		engine.value.on(
			"publisherStateUpdate",
			(streamID, state, errorCode, extendedData) => {
				appendCallbackInfo(
					`publisherStateUpdate:streamID:${streamID}, state:${state}, errorCode:${errorCode}, extendedData:${JSON.stringify(
						extendedData
					)}`
				);
				if (state === 2) {
					startPreview();
				} else if (state === 0) {
					stopPreview()
				}
			}
		);
	}

	// 通过返回值暴露所管理的状态
	return {
		publishStreamID,
		publishBtnName,
		isPublishingStream,
		localVideoElem,
		pubVideoMuted,
		startPublishingStream,
		stopPublishingStream,
		startPreview,
		stopPreview,
		onClickPublish,
		addPublishListeners,
	}
}