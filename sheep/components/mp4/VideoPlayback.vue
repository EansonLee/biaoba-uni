<template>
	<view v-if="isPlaying" class="video-container" :class="{'video-playing': isPlaying}" @click="handleVideoEnd">
		<video v-if="isPlayingType == 'video'" ref="videoPlayer" class="video-player" :src="videoSrc"
			@ended="handleVideoEnd" :autoplay="true" :enable-play-gesture="true" @pause="handleVideoEnd"
			controls="false" :show-progress="false" :show-fullscreen-btn="false" :show-play-btn="false"
			:show-center-play-btn="false" :show-loading="true" :enable-progress-gesture="false" playsinline></video>
		<view v-if="isPlayingType === 'gif' && isPlaying" class="gif-container">
			<image class="gif-image" :src="videoSrc"
                   :style="{ opacity: gifLoaded ? 1 : 0 }"
                   @load="onGifLoad" 
                   @error="onGifError"
                   :lazy-load="false"></image>
		</view>
		<view v-if="isPlayingType === 'image' && isPlaying" class="image-container">
			<image class="image-container" :src="videoSrc"></image>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		onMounted,
		onUnmounted,
		watch,
        nextTick
	} from "vue";
	import {
		getGifTimeLength
	} from "@/sheep/config/bluetoothConfig";
    import { useAudioPlayer } from '@/sheep/util/useAudioPlayer';

	import emitter from '@/sheep/util/eventBus'
	// 全局播放状态
	const isVideoPlaying = ref(false);
	const shoprovideourl = process.env.SHOPRO_VIDEO_URL;
    const gifLoaded = ref(false);
    const platform = uni.getSystemInfoSync().platform;
    const isAndroid = platform === 'android';
	const isIOS = platform === 'ios';
    const isMobile = isAndroid || isIOS;
    const gifCache = ref(new Map()); // 用于存储已加载的GIF

	const props = defineProps({
		closeOnClick: {
			type: Boolean,
			default: false,
		},
	});
	const videoSrc = ref()
	const emit = defineEmits(["videoEnded"]);
	const videoType = ref()
	const videoPlayer = ref(null);
	const videoSvgaRef = ref(null);
	const isPlaying = ref(false);
	let isPlayingType = ref("video");
	let playTimeout = null;

    // 常用GIF列表
    const commonGifs = [
        // 结算动画优先预加载，降低因首次加载失败导致无动画的问题
        '/static/gif/finish01.24s.gif',
        '/static/gif/lowton_1S.gif',
		'/static/gif/ROUND1-3s-(1)3.gif',
        '/static/gif/sbull_20f.gif',
        '/static/gif/ThreeinaBed.gif',
        '/static/gif/NEXT-PALYER-2S.gif',
        '/static/gif/HAT-TRICK-2S.gif',
        '/static/gif/bull_1S.gif',
        '/static/gif/t20-1.09S.gif',
        '/static/gif/bust02s.gif',
        '/static/gif/Ton80.gif',
        '/static/gif/HighCheckout3.06s.gif',
        '/static/gif/BONUS-2S.gif',
    ];

    // 预加载单个GIF
    const preloadGif = (src) => {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (gifCache.value.has(src)) {
                resolve();
                return;
            }
            // #ifdef H5
            const img = new Image();
            img.onload = () => {
                gifCache.value.set(src, true);
                console.log('GIF预加载成功:', src);
                resolve();
            };
            img.onerror = () => {
                console.error('GIF预加载失败:', src);
                reject();
            };
            img.src = src;
            // #endif
        });
    };

    // 预加载所有常用GIF
    const preloadCommonGifs = async () => {
        try {
            for (const gif of commonGifs) {
                await preloadGif(gif);
                // 减少间隔时间，提高加载速度
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        } catch (error) {
            console.error('GIF预加载过程出错:', error);
        }
    };

    // GIF加载成功处理
    const onGifLoad = () => {
        console.log('GIF loaded successfully:', videoSrc.value);
        gifLoaded.value = true;
        
        // 音画同步：在GIF加载成功后再播放音效
        if (videoSrc.value.includes('finish01.24s.gif')) {
            useAudioPlayer().playAudio('/static/mp3/finish.mp3');
        }

        // 清理旧的计时器
        if (playTimeout) {
            clearTimeout(playTimeout);
        }

        // 从URL中提取文件名
        const urlArr = videoSrc.value.split('/');
        const fileNameWithQuery = urlArr[urlArr.length - 1];
        const fileName = fileNameWithQuery.split('?')[0];
        
        // 获取GIF的应有播放时长
        let gifTime = getGifTimeLength(fileName);
        console.log('Setting GIF timer for:', gifTime, 'ms');

        // 启动新的计时器，在播放结束后调用handleVideoEnd
        playTimeout = setTimeout(() => {
            handleVideoEnd();
        }, Number(gifTime));
    };

    // GIF加载失败处理
    const onGifError = () => {
        console.error('GIF load failed:', videoSrc.value);
        gifLoaded.value = false;
        handleVideoEnd();
    };

	const handleClick = () => {
		// 点击关闭视频
		if (props.closeOnClick) {
			stopVideo();
		}
	};

	const handleVideoEnd = () => {
		// 视频播放结束事件
		stopVideo();
		emit("videoEnded");
	};

	// 手动停止音频的方法（供外部调用）
	const forceStopAudio = () => {
		console.log('手动停止音频');
		emitter.emit('stopAudio');
	};

	const stopVideo = () => {
		// 停止视频播放
		if (playTimeout) {
			clearTimeout(playTimeout);
			playTimeout = null;
		}

		if (videoPlayer.value && videoPlayer.value.pause) {
			videoPlayer.value.pause();
			videoPlayer.value.currentTime = 0;
		}
		isPlaying.value = false;
		isVideoPlaying.value = false;
        gifLoaded.value = false;

		// 智能停止音频：只在特定类型的视频结束时停止音频
		// 例如：结束动画、过场动画等需要停止背景音效
		// 但不要停止游戏音效（如round1.mp3等）
		const shouldStopAudio = videoSrc.value && (
			videoSrc.value.includes('finish') || 
			videoSrc.value.includes('Ton80') ||
			videoSrc.value.includes('ThreeinaBed_1') ||
			videoSrc.value.includes('T20') ||
			videoSrc.value.includes('PerfectGame') ||
			videoSrc.value.includes('LOWTON') ||
			videoSrc.value.includes('HighTon_1') ||
			videoSrc.value.includes('HATTRICK') ||
			videoSrc.value.includes('FVIntroSplash16by9Format') ||
			videoSrc.value.includes('BUST') ||
			videoSrc.value.includes('baima_3.05s') ||
			videoSrc.value.includes('bingdo')
		);
		
		if (shouldStopAudio) {
			console.log('视频结束，停止相关音频:', videoSrc.value);
			emitter.emit('stopAudio');
		}
	};

	function onFinished() {
		isPlaying.value = false;
	}

	function startVideo(newSrc) {
		if (!newSrc) {
			isPlaying.value = false;
			return;
		}

		videoSrc.value = newSrc;
		let pos = videoSrc.value.lastIndexOf(".");
		videoType.value = videoSrc.value.substring(pos, videoSrc.value.length);
		const urlArr = videoSrc.value.split('/');
		
		// 判断是URL还是本地文件
		if (urlArr[1] === 'Animation') {
			videoSrc.value = shoprovideourl + videoSrc.value;
		}

		if (videoType.value === '.json') {
			isPlayingType.value = "json";
			isPlaying.value = true;
		} else if (videoType.value === '.gif') {
			isPlayingType.value = "gif";
            // 重要：确保先设置状态，再触发界面更新
            nextTick(() => {
                isPlaying.value = true;
                gifLoaded.value = false; // 先隐藏，等待加载成功

                const baseGifPath = newSrc.split('?')[0];
                // 总是添加时间戳以避免缓存问题，确保@load事件触发
                videoSrc.value = `${baseGifPath}?t=${Date.now()}`;
                
                // 计时器逻辑已移至 onGifLoad
            });
		} else if (videoType.value === '.png' || videoType.value === '.jpg' || videoType.value === '.jpeg') {
			isPlayingType.value = "image";
			isPlaying.value = true;
			
			playTimeout = setTimeout(() => {
				isPlaying.value = false;
				isPlayingType.value = "";
			}, 1500);
		} else {
			isPlayingType.value = "video";
			stopVideo();
			if (!isVideoPlaying.value) {
				isPlaying.value = true;
				isVideoPlaying.value = true;
				if (videoPlayer.value) {
					videoPlayer.value.play();
				}
			}
		}
	}

onMounted(() => {
        // 无论平台，优先预加载结算动画，保证结束时的动画能及时显示
        preloadGif('/static/gif/finish01.24s.gif').catch(() => {});

        // PC 端：立即预加载常用GIF；移动端：延迟预加载，避免干扰初始渲染
        if (!isMobile) {
            preloadCommonGifs();
        } else {
            setTimeout(() => {
                preloadCommonGifs();
            }, 1500);
        }
    });

	onUnmounted(() => {
		stopVideo();
		if (playTimeout) {
			clearTimeout(playTimeout);
		}
	});
	
	defineExpose({
		startVideo,
		onFinished,
        isPlaying,
		forceStopAudio  // 导出手动停止音频的方法
	});
</script>

<style scoped>
	.video-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		overflow: hidden;
		z-index: 9999;
	}

	.gif-container {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

    .gif-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        transition: opacity 0.3s ease;
    }

	.image-container {
		width: 150rpx;
		height: 150rpx;
		display: flex;
		justify-content: center;
		align-items: center;
		/* min-height: 100vh; */
		margin: auto;
	}

	.video-player {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* 隐藏默认播放按钮 */
	video::-webkit-media-controls,
	video::-moz-media-controls,
	video::-o-media-controls,
	video::media-controls {
		display: none !important;
	}

	/* 移动端适配 */
	@media screen and (max-width: 768px) {
		.video-container {
			/* 确保在移动端正确显示 */
			width: 100% !important;
			height: 100% !important;
		}
	}
</style>