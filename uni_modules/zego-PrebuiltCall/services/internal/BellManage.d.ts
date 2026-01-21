/// <reference types="@dcloudio/types" />
export interface BellConfig {
    autoplay?: boolean;
    loop?: boolean;
    defaultUrl?: string;
}
declare enum PlayStateEnum {
    NULL = 0,
    PLAY = 1,
    PAUSE = 2,
    STOP = 3
}
declare class BellManage {
    innerAudioContext: UniNamespace.InnerAudioContext | null;
    playState: PlayStateEnum;
    config: BellConfig;
    constructor(bellSrc: string, config?: BellConfig);
    setBellSrc(src: string): void;
    private setConfig;
    private initEvent;
    private setDefaultBellUrl;
    private setPlayState;
    play(): void;
    pause(): void;
    stop(): void;
    destroy(): void;
}
export default BellManage;
