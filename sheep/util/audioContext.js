import emitter from '@/sheep/util/eventBus';
// 使用 IIFE 封装单例
const AudioContextSingleton = (() => {
  let instance = null;
  let isDestroyed = false;
  let isLoading = false;
  let lastPlayTime = 0; // 记录上次播放同一音频的时间
  let lastPlayUrl = ''; // 记录上次播放的音频URL

  const initializeInstance = (inst) => {
    inst.loop = false;
    inst.autoplay = false;
    inst.volume = 1.0; // 确保音量设置为最大

    inst.onPlay(() => {
      console.log('音频开始播放, 音量:', inst.volume, '时长:', inst.duration);
    });

    inst.onEnded(() => {
      console.log('音频播放结束');
      try { emitter.emit('audio:ended', { src: inst.src, duration: inst.duration }); } catch(e) {}
    });

    inst.onError((res) => {
      console.error('音频播放错误:', res.errMsg, res.errCode);
    });

    inst.onPause(() => {
      console.log('音频被暂停');
    });

    inst.onStop(() => {
      console.log('音频被停止');
    });

    inst.onTimeUpdate(() => {
      // 只在调试时启用
      // console.log('播放进度:', inst.currentTime, '/', inst.duration);
    });

    // 恢复全局 onCanplay 监听器，但不执行播放逻辑
    inst.onCanplay(() => {
      console.log('音频准备就绪, 时长:', inst.duration, '音量:', inst.volume);
      try { emitter.emit('audio:canplay', { src: inst.src, duration: inst.duration }); } catch(e) {}
    });
  };

  return {
    /**
     * 获取音频上下文实例
     * @returns {Object} uni.createInnerAudioContext 实例
     */
    getInstance() {
      if (!instance || isDestroyed) {
        if (instance) {
          // 先销毁旧的实例
          instance.destroy();
        }
        instance = uni.createInnerAudioContext();
        initializeInstance(instance);
        isDestroyed = false;
      }
      return instance;
    },

    /**
     * 销毁音频上下文实例
     */
    destroy() {
      if (instance) {
        instance.destroy();
        isDestroyed = true;
        instance = null;
      }
    },

    /**
     * 播放音频
     * @param {string} url - 音频文件路径
     */
    play(url) {
      if (!url) {
        console.warn('音频URL为空，已忽略播放请求。');
        return;
      }
      
      const currentTime = Date.now();
      const audio = this.getInstance();

      // 如果当前正在加载相同音频，则忽略本次请求
      if (isLoading && audio.src === url) {
        console.warn('音频正在加载中，已忽略重复的播放请求。');
        return;
      }

      // 如果是同一个音频源
      if (audio.src === url) {
        // 检查音频是否正在播放
        if (audio.paused === false) {
          // 如果音频正在播放且在很短时间内重复调用（可能是代码bug），则忽略
          if (url === lastPlayUrl && (currentTime - lastPlayTime) < 100) {
            console.warn(`音频 '${url}' 正在播放中且在100ms内重复调用，已忽略。时间差: ${currentTime - lastPlayTime}ms`);
            return;
          }
          console.log(`音频 '${url}' 正在播放中，忽略重复播放请求`);
          return;
        }
        // 如果音频已暂停或播放完毕，则重新播放
        console.log('重新播放相同音频源');
        lastPlayTime = currentTime;
        lastPlayUrl = url;
        audio.seek(0);
        audio.play();
        return;
      }

      // 立即更新时间戳，防止在异步加载期间的重复调用
      lastPlayTime = currentTime;
      lastPlayUrl = url;

      // 处理不同的音频源或首次播放
      console.log(`处理新音频源: ${url}`);
      
      // 只有当前音频源不同时才停止
      if (audio.src && audio.src !== url) {
        console.log('停止当前不同的音频源:', audio.src);
        audio.stop();
      }
      
      isLoading = true; // 设置加载状态锁

      // 使用标志位确保回调只执行一次
      let callbackExecuted = false;

      // 定义一个一次性的 onCanplay 回调
      const canPlayCallback = () => {
        if (callbackExecuted) {
          return; // 重复触发直接忽略
        }
        callbackExecuted = true;
        
        console.log(`音频 '${url}' 准备完成，音量: ${audio.volume}, 时长: ${audio.duration}`);
        isLoading = false; // 加载完成，解锁
        
        // 确保音量设置
        audio.volume = 1.0;
        
        // 延迟播放音频
        setTimeout(() => {
          console.log('开始播放音频，当前音量:', audio.volume);
          audio.play();
        }, 10);
        
        // 播放后立即移除监听，避免重复触发
        audio.offCanplay(canPlayCallback);
      };

      // 监听 onCanplay 事件
      audio.onCanplay(canPlayCallback);
      
      // 处理可能的错误
      const errorCallback = (res) => {
        console.error(`加载或播放音频 '${url}' 出错:`, res.errMsg);
        isLoading = false; // 出错了也要解锁
        audio.offError(errorCallback);
      };
      audio.onError(errorCallback);

      // 设置音频源，这将触发加载
      audio.src = url;
    },

    /**
     * 停止播放
     */
    stop() {
      if (instance) {
        instance.stop();
      }
    },

    /**
     * 切换音频源
     * @param {string} url - 新音频文件路径
     */
    switchSource(url) {
      instance.src = url;
    },
  };
})();

export default AudioContextSingleton;