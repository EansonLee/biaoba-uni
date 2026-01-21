import { reactive } from 'vue'

export function useVideoWindow() {
  // 窗口状态
  const windowStates = reactive({
    local: {
      visible: true,
      large: false,
      dragMode: true,  // 默认开启拖拽
      scaleMode: true, // 默认开启缩放
      scale: 1.0,
      position: { left: '', right: '4%', top: '', bottom: '3%' },
      size: { width: '146rpx', height: '64rpx' },
      originalSize: { width: '146rpx', height: '64rpx' }
    },
    remote: {
      visible: true,
      large: false,
      dragMode: true,  // 默认开启拖拽
      scaleMode: true, // 默认开启缩放
      scale: 1.0,
      position: { left: '4%', right: '', top: '', bottom: '3%' },
      size: { width: '146rpx', height: '64rpx' },
      originalSize: { width: '146rpx', height: '64rpx' }
    }
  })

  // 预设尺寸配置
  const sizeConfigs = {
    small: {
      local: { width: '146rpx', height: '64rpx' },
      remote: { width: '146rpx', height: '64rpx' }
    },
    large: { width: '146rpx', height: '64rpx' }
  }

  // 获取窗口样式
  const getWindowStyle = (type) => {
    const state = windowStates[type]
    return {
      ...state.position,
      ...state.size,
      position: 'fixed',
      zIndex: state.large ? 1002 : 1001,
      transition: state.dragMode ? 'none' : 'all 0.3s ease',
      cursor: state.dragMode ? 'move' : 'default'
    }
  }

  // 切换窗口显示/隐藏
  const toggleWindowVisibility = (type) => {
    windowStates[type].visible = !windowStates[type].visible
    return windowStates[type].visible
  }

  // 切换窗口大小
  const toggleWindowSize = (type) => {
    const state = windowStates[type]
    state.large = !state.large

    if (state.large) {
      state.size = { ...sizeConfigs.large }
      // 大窗口时居中显示
      state.position = {
        left: '50%',
        right: '',
        top: '50%',
        bottom: '',
        transform: 'translate(-50%, -50%)'
      }
    } else {
      state.size = { ...sizeConfigs.small[type] }
      // 恢复到默认位置
      if (type === 'local') {
        state.position = { left: '', right: '4%', top: '', bottom: '3%', transform: '' }
      } else {
        state.position = { left: '3%', right: '', top: '', bottom: '3%', transform: '' }
      }
    }

    return state.large
  }

  // 切换拖拽模式
  const toggleDragMode = (type) => {
    windowStates[type].dragMode = !windowStates[type].dragMode
    return windowStates[type].dragMode
  }

  // 切换缩放模式
  const toggleScaleMode = (type) => {
    windowStates[type].scaleMode = !windowStates[type].scaleMode
    return windowStates[type].scaleMode
  }

  // 设置缩放比例
  const setScale = (type, scale) => {
    const state = windowStates[type]
    // 限制缩放范围：0.5x 到 3x
    const clampedScale = Math.max(0.5, Math.min(3.0, scale))
    state.scale = clampedScale

    // 根据缩放比例更新尺寸
    const originalWidth = parseInt(state.originalSize.width)
    const originalHeight = parseInt(state.originalSize.height)

    state.size = {
      width: `${Math.round(originalWidth * clampedScale)}rpx`,
      height: `${Math.round(originalHeight * clampedScale)}rpx`
    }

    return clampedScale
  }

  // 重置缩放
  const resetScale = (type) => {
    const state = windowStates[type]
    state.scale = 1.0
    state.size = { ...state.originalSize }
    return 1.0
  }

  // 处理拖拽开始
  const handleDragStart = (type, event) => {
    if (!windowStates[type].dragMode) return false
    
    const state = windowStates[type]
    const startX = event.touches ? event.touches[0].clientX : event.clientX
    const startY = event.touches ? event.touches[0].clientY : event.clientY
    
    // 获取当前位置
    const currentLeft = parseInt(state.position.left) || 0
    const currentTop = parseInt(state.position.top) || 0
    
    return {
      startX,
      startY,
      startLeft: currentLeft,
      startTop: currentTop
    }
  }

  // 处理拖拽移动
  const handleDragMove = (type, event, dragData) => {
    if (!windowStates[type].dragMode || !dragData) return
    
    const currentX = event.touches ? event.touches[0].clientX : event.clientX
    const currentY = event.touches ? event.touches[0].clientY : event.clientY
    
    const deltaX = currentX - dragData.startX
    const deltaY = currentY - dragData.startY
    
    const newLeft = dragData.startLeft + deltaX
    const newTop = dragData.startTop + deltaY
    
    // 边界检查
    const screenWidth = uni.getSystemInfoSync().screenWidth
    const screenHeight = uni.getSystemInfoSync().screenHeight
    const windowWidth = parseInt(windowStates[type].size.width)
    const windowHeight = parseInt(windowStates[type].size.height)
    
    const boundedLeft = Math.max(0, Math.min(newLeft, screenWidth - windowWidth))
    const boundedTop = Math.max(0, Math.min(newTop, screenHeight - windowHeight))
    
    // 更新位置
    windowStates[type].position = {
      left: `${boundedLeft}px`,
      right: '',
      top: `${boundedTop}px`,
      bottom: '',
      transform: ''
    }
  }

  // 处理拖拽结束
  const handleDragEnd = (type) => {
    // 可以在这里添加拖拽结束后的逻辑
    console.log(`${type} video drag ended`)
  }

  // 重置窗口位置
  const resetWindowPosition = (type) => {
    const state = windowStates[type]
    state.large = false
    state.size = { ...sizeConfigs.small[type] }

    if (type === 'local') {
      state.position = { left: '', right: '4%', top: '', bottom: '3%', transform: '' }
    } else {
      state.position = { left: '4%', right: '', top: '', bottom: '3%', transform: '' }
    }
  }

  // 应用样式到 subNVue 窗口
  const applyStyleToSubNVue = (subNVue, type) => {
    if (!subNVue || typeof subNVue.setStyle !== 'function') return

    const style = getWindowStyle(type)
    const nvueStyle = {}

    // rpx转px的转换函数
    const rpxToPx = (rpxValue) => {
      if (typeof rpxValue === 'string' && rpxValue.includes('rpx')) {
        const rpx = parseInt(rpxValue);
        const systemInfo = uni.getSystemInfoSync();
        return `${Math.round(rpx * systemInfo.screenWidth / 750)}px`; // uni-app的rpx转换公式
      }
      return rpxValue;
    };

    // 转换样式格式为 subNVue 可接受的格式
    if (style.left && style.left !== '') nvueStyle.left = style.left
    if (style.right && style.right !== '') nvueStyle.right = style.right
    if (style.top && style.top !== '') nvueStyle.top = style.top
    if (style.bottom && style.bottom !== '') nvueStyle.bottom = style.bottom
    if (style.width) nvueStyle.width = rpxToPx(style.width)
    if (style.height) nvueStyle.height = rpxToPx(style.height)

    // 临时调试：检查远程视频位置设置
    if (type === 'remote') {
      console.log('远程视频位置设置:', nvueStyle);
    }
    subNVue.setStyle(nvueStyle)
  }

  // 显示/隐藏 subNVue 窗口
  const toggleSubNVueVisibility = (subNVue, visible) => {
    if (!subNVue) return
    
    if (visible && typeof subNVue.show === 'function') {
      subNVue.show()
    } else if (!visible && typeof subNVue.hide === 'function') {
      subNVue.hide()
    }
  }

  return {
    windowStates,
    getWindowStyle,
    toggleWindowVisibility,
    toggleWindowSize,
    toggleDragMode,
    toggleScaleMode,
    setScale,
    resetScale,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    resetWindowPosition,
    applyStyleToSubNVue,
    toggleSubNVueVisibility
  }
}
