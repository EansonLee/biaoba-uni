import { Platform, zlogerror, zloginfo } from "@/uni_modules/zego-UIKitCore";
import { urlReg } from "../../utils/Regexp";
import { isBoolean } from "@/uni_modules/zego-UIKitCore/utils/types";
var PlayStateEnum;
(function (PlayStateEnum) {
    PlayStateEnum[PlayStateEnum["NULL"] = 0] = "NULL";
    PlayStateEnum[PlayStateEnum["PLAY"] = 1] = "PLAY";
    PlayStateEnum[PlayStateEnum["PAUSE"] = 2] = "PAUSE";
    PlayStateEnum[PlayStateEnum["STOP"] = 3] = "STOP";
})(PlayStateEnum || (PlayStateEnum = {}));
const TAG = '[BellManage]';
const defaultConfig = {
    autoplay: false,
    loop: true,
};
class BellManage {
    innerAudioContext = null;
    playState = PlayStateEnum.NULL;
    config = {
        ...defaultConfig
    };
    constructor(bellSrc, config) {
        zloginfo(TAG, `[constructor] bellSrc: ${bellSrc}`);
        this.innerAudioContext = uni.createInnerAudioContext();
        this.initEvent();
        this.setConfig(config);
        this.setBellSrc(bellSrc);
    }
    setBellSrc(src) {
        if (!this.innerAudioContext)
            return;
        if (!urlReg.test(src)) {
            this.setDefaultBellUrl();
            zlogerror(TAG, 'bell url illegal');
            return;
        }
        this.innerAudioContext.src = src;
    }
    setConfig(config) {
        if (!this.innerAudioContext)
            return;
        this.config = {
            ...this.config,
            ...config,
        };
        const { autoplay, loop } = this.config;
        isBoolean(autoplay) && (this.innerAudioContext.autoplay = autoplay);
        isBoolean(loop) && (this.innerAudioContext.loop = loop);
    }
    initEvent() {
        if (!this.innerAudioContext)
            return;
        this.innerAudioContext.onCanplay(() => {
            zloginfo(TAG, `[onCanplay]`);
        });
        this.innerAudioContext.onPlay(() => {
            zloginfo(TAG, `[onPlay]`);
        });
        this.innerAudioContext.onPause(() => {
            zloginfo(TAG, `[onPause]`);
        });
        this.innerAudioContext.onError(({ errCode, errMsg }) => {
            zlogerror(TAG, `[onError] errCode: ${errCode}, errMsg: ${errMsg}`);
            // ios端会出现{"errMsg":"MediaError","errCode":-5}报错，先忽略 https://ask.dcloud.net.cn/article/41087
            if (Platform.isIos && errCode === -5)
                return;
            this.setDefaultBellUrl();
        });
    }
    setDefaultBellUrl() {
        const url = this.config.defaultUrl;
        if (!url || !this.innerAudioContext)
            return;
        this.innerAudioContext.src = url;
        this.playState === PlayStateEnum.PLAY && this.play();
    }
    setPlayState(state) {
        this.playState = state;
    }
    play() {
        zloginfo(TAG, `play`);
        this.setPlayState(PlayStateEnum.PLAY);
        this.innerAudioContext?.play();
    }
    pause() {
        zloginfo(TAG, `pause`);
        this.setPlayState(PlayStateEnum.PAUSE);
        this.innerAudioContext?.pause();
    }
    stop() {
        zloginfo(TAG, `stop`);
        this.setPlayState(PlayStateEnum.STOP);
        this.innerAudioContext?.stop();
    }
    destroy() {
        zloginfo(TAG, `destroy`);
        this.innerAudioContext?.pause();
        this.innerAudioContext?.destroy();
        this.setPlayState(PlayStateEnum.NULL);
        this.innerAudioContext = null;
    }
}
export default BellManage;
