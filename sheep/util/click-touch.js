// 为按键音创建一个专用的、独立的音频播放器实例
const clickAudioPlayer = uni.createInnerAudioContext();
// 先设置好音频源，避免每次点击都重新加载
clickAudioPlayer.src = '/static/mp3/anjianyin.mp3';
clickAudioPlayer.autoplay = false;

clickAudioPlayer.onError((res) => {
  console.error('按键音播放器错误:', res.errMsg, res.errCode);
  // 尝试重新加载音频资源
  clickAudioPlayer.src = '/static/mp3/anjianyin.mp3';
});

const clickSoundDirective = {
  mounted(el) {
    const handleClick = () => {
      // 每次点击时，先停止上一次的播放（如果还没播完），然后立即从头开始播放
      // 这是处理快速、重复点击音效的最佳方式
      clickAudioPlayer.stop();
      clickAudioPlayer.play();
    };

    // // 绑定点击事件
    el.addEventListener('click', ($event) => {
      // console.log('[ClickSound] 元素点击事件触发', $event);
      handleClick()
    });

    // 将处理器存储在元素上，以便在卸载时移除
    el.__vueClickSoundHandler__ = handleClick;
  },

  unmounted(el) {
    // 组件卸载时，清理事件监听器
    if (el.__vueClickSoundHandler__) {
      el.removeEventListener('click', el.__vueClickSoundHandler__);
      delete el.__vueClickSoundHandler__;
    }
  },
};

export default {
  install: (app) => {
    app.directive('clickSound', clickSoundDirective);
  },
};
