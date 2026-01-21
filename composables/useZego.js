import ZegoExpressEngine, {
	ZegoOrientation,ZegoVideoMirrorMode
} from "@/sheep/components/zego-ZegoExpressUniApp-JS/components/zego-ZegoExpressUniApp-JS/lib/ZegoExpressEngine";
import { ZegoScenario } from "@/sheep/components/zego-ZegoExpressUniApp-JS/components/zego-ZegoExpressUniApp-JS/lib/ZegoExpressDefines";
import { ref, shallowRef } from 'vue'
import keyCenter from "./KeyCenter.js";

import {
	onShow,
	onBackPress,
	onUnload
} from "@dcloudio/uni-app";
// 按照惯例，组合式函数名以“use”开头
export function useZego() {
	// 被组合式函数封装和管理的状态
	const info = ref('')
	const logHeight = ref(80)
	const engine = shallowRef(null)
	const userID = ref(keyCenter.getUserID())
	const userName = ref(keyCenter.getUserID())
	const isLogin = ref(false)
	const isRequest = ref(false)
	
	// 创建引擎
	async function createEngine() {
		appendActionInfo("create ZegoExpressEngine");
		let profile = {
			appID: keyCenter.getAppID(),
			// #ifdef APP-PLUS
			appSign: keyCenter.getAppSign(),
			// #endif
			scenario: ZegoScenario.General
		};
		engine.value = await ZegoExpressEngine.createEngineWithProfile(
			profile
		);
		engine.value.setVideoMirrorMode(ZegoVideoMirrorMode.NoMirror);
		let config = { encodeWith: 640, encodeHeight: 360 };
		await ZegoExpressEngine.instance().setVideoConfig(config);
		await ZegoExpressEngine.instance().setAppOrientation(ZegoOrientation.LandscapeLeft);

		appendSuccessInfo("createEngine");
		// #ifdef H5
		const result = await engine.value.zegoWebRTC.checkSystemRequirements()
		function isNotSupported(obj, keystr) {
			for (let key in obj) {
				if (!obj[key]) {
					keystr += key + '，'
				}
				if (obj[key] instanceof Object) {
					keystr += isNotSupported(obj[key], '')
				}
			}
			return keystr
		}
		// #endif
	}
	// 销毁引擎
	 function destroyEngine() {
		appendActionInfo("Destroy Engine");
		logoutRoom(roomID);
		engine.value = null
	}
	// 登录房间
	async function loginRoom(roomID, userID, userName) {
		let user = {
			userID: userID,
			userName: userName,
		};
		let token= keyCenter.getToken()
		const result = await engine.value.loginRoom(roomID, user, {
			token: token,
			isUserStatusNotify: true,
		});
		isLogin.value = result.errorCode == 0
	}
	// 退出房间
	function logoutRoom(roomID) {
		if (!isLogin.value) return
		appendActionInfo(`Logout Room: roomID:${roomID}`);
		engine.value?.logoutRoom(roomID);
	}
	// 预览
	function startPreview(channel) {
		appendActionInfo("Start Preview");
		// #ifdef H5
		// H5需要传入挂载节点
		engine.value.startPreview(document.querySelector('#local_video video'), channel)
		// #endif
		// #ifdef APP-PLUS
		engine.value.startPreview(channel)
		// #endif
	}
	// 停止预览
	function stopPreview() {
		appendActionInfo("Stop Preview");
		ZegoExpressEngine.instance().stopPreview();
	}
	function changeLogViewSize() {
		logHeight.value = logHeight.value == 80 ? 800 : 80;
	}
	function appendActionInfo(value) {
		info.value += "🚀";
		info.value += value;
		info.value += "\n";
	}
	function appendSuccessInfo(value) {
		info.value += "✅";
		info.value += value;
		info.value += "\n";
	}
	function appendFailureInfo(value) {
		info.value += "❌";
		info.value += value;
		info.value += "\n";
	}
	function appendCallbackInfo(value) {
		info.value += "📩";
		info.value += value;
		info.value += "\n";
	}

	onShow(() => {
	    userID.value = keyCenter.getUserID()
	})

  // 通过返回值暴露所管理的状态
	return {
		info,
		logHeight,
		userID,
		userName,
		isLogin,
		isRequest,
		engine,
		createEngine,
		loginRoom,
		logoutRoom,
		startPreview,
		stopPreview,
		changeLogViewSize,
		appendActionInfo,
		appendSuccessInfo,
		appendFailureInfo,
		appendCallbackInfo
	}
}