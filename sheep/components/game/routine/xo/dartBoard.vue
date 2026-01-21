<script setup>
import {
  onMounted,
  onUnmounted,
  ref,nextTick
} from 'vue';
import eventBus from "@/sheep/util/eventBus";

	const props = defineProps({
		// 射中区域的颜色
		hitColor: {
			type: String,
		},
		// 已命中的区域数组
		hitAreas: {
			type: Object,
			default: () => {}
		},
	});

// 初始化默认棋盘，避免渲染延迟
const initializeDefaultBoard = () => {
  const numbers = Array.from({ length: 20 }, (_, i) => i + 1);
  const stars = Array(5).fill('★');
  const allItems = [...numbers, ...stars];

  // Fisher-Yates Shuffle
  for (let i = allItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
  }

  // 填充5x5网格
  const board = [];
  let index = 0;
  for (let i = 0; i < 5; i++) {
    const row = [];
    for (let j = 0; j < 5; j++) {
      row.push(allItems[index++]);
    }
    board.push(row);
  }

  return board;
};

const boardNumbers = ref(initializeDefaultBoard());
const activeTeam = ref(0);
const oldBoardNumbers = ref(JSON.parse(JSON.stringify(boardNumbers.value)))

// 事件处理函数
const handleActiveTeamChange = (team) => {
  activeTeam.value = team;
};

// 绑定事件监听器
eventBus.on('xoActiveTeamChange', handleActiveTeamChange);

// 组件卸载时清理事件监听器
onUnmounted(() => {
  eventBus.off('xoActiveTeamChange', handleActiveTeamChange);
});

// 添加棋盘重新生成的动画状态
const isRegenerating = ref(false);

// 生成随机排列的数字和星号
const generateRandomBoard = () => {
  // 开始重新生成动画
  isRegenerating.value = true;

  // 立即开始生成新棋盘，不延迟
  // 定义空的5x5数组
  const newBoard = Array.from({ length: 5 }, () => Array(5).fill(null));

  const fixedPositions = []; // 用于存储五角星和已命中区域的位置

  // 1. 处理已命中的区域
  if (Object.keys(props.hitAreas).length > 0) {
    const hitAreasForActiveTeam = Object.entries(props.hitAreas)
        .filter(([key, value]) => value.team === activeTeam.value)
        .map(([key]) => key);

    oldBoardNumbers.value.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (hitAreasForActiveTeam.includes(cell.toString())) {
          fixedPositions.push({ id: cell, row: rowIndex, col: colIndex });
          newBoard[rowIndex][colIndex] = cell; // 复制到新数组
        }
      });
    });
  }

  // 2. 处理五角星 (★) 的位置 -  查找旧board中五角星所在的位置
  oldBoardNumbers.value.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === '★') {  // 假设 '★' 是五角星的表示
        const isAlreadyFixed = fixedPositions.some(pos => pos.row === rowIndex && pos.col === colIndex);
        if (!isAlreadyFixed) { // 避免重复添加（如果五角星恰好在已命中区域）
          fixedPositions.push({ id: '★', row: rowIndex, col: colIndex });
          newBoard[rowIndex][colIndex] = '★'; // 复制到新数组
        }
      }
    });
  });


  // 创建1-20的数组
  const numbers = Array.from({ length: 20 }, (_, i) => i + 1);
  // 创建五角星数组，并替换原有的星星数组
  const stars = Array(5).fill('★');  // 保持数组名称为stars，但填充为 ★
  // 合并数组
  const allItems = [...numbers, ...stars];

  // 提取未被固定的元素
  const unassignedItems = allItems.filter(item => {
    return !fixedPositions.some(pos => pos.id === item); // 检查是否在已固定的位置中
  });

  // Fisher-Yates Shuffle (只对未被固定的区域洗牌)
  for (let i = unassignedItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unassignedItems[i], unassignedItems[j]] = [unassignedItems[j], unassignedItems[i]];
  }

  // 填充空的位置
  let unassignedIndex = 0;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (newBoard[i][j] === null) {
        newBoard[i][j] = unassignedItems[unassignedIndex++];
      }
    }
  }

  // 延迟更新数据，让动画先开始
  setTimeout(() => {
    boardNumbers.value = newBoard;
    oldBoardNumbers.value = newBoard;
  }, 50); // 50ms后更新数据，让动画效果更自然

  // 结束重新生成动画，确保在所有动画完成后再重置状态
  // 最长动画时间：1.45s(单个动画) + 0.3s(最大延迟) = 1.75s
  setTimeout(() => {
    isRegenerating.value = false;
  }, 1700); // 1700ms，与1.75秒音效完美对应
};

// 获取单元格的背景图片
const getCellBackground = (cell) => {
  if (cell === '★') {
    return 'pink.png';
  }
  const hitArea = props.hitAreas?.[cell];
  if (hitArea?.team) {
    switch (hitArea.averageColor) {
      case '#659ff8':
        return 'blur.png';
      case '#95f274':
        return 'green.png';
      default:
        return null;
    }
  }
  // 默认未命中状态
  return 'goldenYellow.png';
};
// 是否闪烁
const isBlink = (cell) => {
  return props.hitAreas[cell]?.flash;
};

// 获取显示的文本
const getDisplayText = (value) => {
  return typeof value === 'number' ? value.toString() : value;
};
// 命中的区域闪烁
const checkWinCall = (call) => {
  // #ifdef APP-PLUS
  const query = uni.createSelectorQuery().in(this)
  query.select('#isCellBlink_' + call)
          .fields({
            node: true,
            size: true
          }, (res) => {
            if (res) {
              if (res.node) {
                res.node.style.animationDuration = '2s'
                res.node.style.animationName = 'blink-animation'
                // res.node.classList.add('isCellBlink')
              }
            }
          }).exec()
  // #endif

  // #ifdef H5
  const element = document.getElementById('isCellBlink_' + call)
  if (element) {
    element.classList.add('isCellBlink');
    setTimeout(() => {
      element.classList.remove('isCellBlink');
    }, 2000);
  }
  // #endif
}

// onMounted(() => {
//   generateRandomBoard();
// });

// 检查是否胜利，并返回对应状态
const checkWin = (team, requiredLines = 1) => {
  const size = 5; // 网格大小
  const board = boardNumbers.value;
  const hitCells = new Set();

  // 将命中的分区以及星号加入到集合
  Object.keys(props.hitAreas).forEach((cell) => {
    const hitArea = props.hitAreas[cell];
    if (hitArea.team === team && (hitArea?.team || hitArea?.flash)) {
      hitCells.add(parseInt(cell)); // 转为数字
    }
  });

  let lineCount = 0; // 连线计数

  // 检查每一行
  for (let i = 0; i < size; i++) {
    if (board[i].every((cell) => hitCells.has(cell) || cell === '★')) {
      lineCount++;
    }
  }

  // 检查每一列
  for (let i = 0; i < size; i++) {
    if (board.every((row) => hitCells.has(row[i]) || row[i] === '★')) {
      lineCount++;
    }
  }

  // 检查两条对角线
  const diagonal1 = board.every((row, idx) => hitCells.has(row[idx]) || row[idx] === '★');
  const diagonal2 = board.every((row, idx) => hitCells.has(row[size - 1 - idx]) || row[size - 1 - idx] === '★');
  if (diagonal1) lineCount++;
  if (diagonal2) lineCount++;

  // 根据连线数返回不同的状态
  if (lineCount > 0) {
    return lineCount; // 返回命中线条数
  }
  return 0; // 未命中
};

// 暴露方法给父组件
defineExpose({
  checkWin,
  generateRandomBoard,
  checkWinCall
});
</script>

<template>
  <view class="dart-board">
    <view class="board-grid" :class="{ 'regenerating': isRegenerating }">
      <view v-for="(row, rowIndex) in boardNumbers" :key="rowIndex" class="board-row">
        <view v-for="(cell, colIndex) in row" :key="colIndex" class="board-cell " :id="'isCellBlink_'+cell"
              :class="{blink: isBlink(cell), 'cell-regenerating': isRegenerating}" :style="{
                backgroundImage: `url('/static/images/game/xo/${getCellBackground(cell)}')`,
                '--bubble-delay': rowIndex * 2 + colIndex * 0.5
              }">
          <text class="cell-text"><!--{{hitColor}}-->{{ getDisplayText(cell) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.dart-board {
  width: 100%;
  height: 94%;
  padding: 10rpx;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.board-grid {
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}

.board-row {
  display: flex;
  justify-content: center;
  gap: 5rpx;
}

.board-cell {
  width: 55rpx;
  height: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-sizing: border-box;
  transform: scale(1.15);
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  /* 防止白屏闪烁 */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.cell-text {
  color: white;
  font-size: 24rpx;
  font-weight: bold;
  text-shadow: 0 0 8rpx rgba(255, 255, 255, 0.8);
  z-index: 1;
}

@keyframes blink-animation {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.isCellBlink {
  animation-name: blink-animation;
  animation-duration: 2s;
}

.board-cell.blink {
  animation: blink-animation 1s infinite;
}

/* 水泡冒泡动画效果 */
@keyframes bubble-float {
  0% {
    transform: scale(1.15) translateY(25rpx);
    opacity: 0.2;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.5);
  }
  15% {
    transform: scale(1.2) translateY(18rpx);
    opacity: 0.4;
    border-radius: 45%;
    box-shadow: 0 0 8rpx 3rpx rgba(255, 255, 255, 0.4);
  }
  30% {
    transform: scale(1.28) translateY(10rpx);
    opacity: 0.6;
    border-radius: 40%;
    box-shadow: 0 0 12rpx 6rpx rgba(255, 255, 255, 0.3);
  }
  45% {
    transform: scale(1.35) translateY(2rpx);
    opacity: 0.75;
    border-radius: 35%;
    box-shadow: 0 0 16rpx 8rpx rgba(255, 255, 255, 0.25);
  }
  60% {
    transform: scale(1.38) translateY(-3rpx);
    opacity: 0.85;
    border-radius: 25%;
    box-shadow: 0 0 18rpx 9rpx rgba(255, 255, 255, 0.2);
  }
  75% {
    transform: scale(1.32) translateY(-5rpx);
    opacity: 0.92;
    border-radius: 15%;
    box-shadow: 0 0 15rpx 7rpx rgba(255, 255, 255, 0.15);
  }
  90% {
    transform: scale(1.2) translateY(-2rpx);
    opacity: 0.98;
    border-radius: 8%;
    box-shadow: 0 0 8rpx 3rpx rgba(255, 255, 255, 0.08);
  }
  100% {
    transform: scale(1.15) translateY(0);
    opacity: 1;
    border-radius: 0%;
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
  }
}

@keyframes board-ripple {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

.board-grid.regenerating {
  animation: board-ripple 1.75s ease-in-out;
  position: relative;
}

.board-grid.regenerating::before {
  content: '';
  position: absolute;
  top: -10rpx;
  left: -10rpx;
  right: -10rpx;
  bottom: -10rpx;
  background: radial-gradient(circle at 50% 100%,
    rgba(173, 216, 230, 0.3) 0%,
    rgba(135, 206, 235, 0.2) 30%,
    rgba(176, 224, 230, 0.1) 60%,
    transparent 100%);
  border-radius: 20rpx;
  z-index: -1;
  animation: bubble-background 1.75s ease-out;
}

@keyframes bubble-background {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 0;
    transform: scale(1);
  }
}

.board-cell.cell-regenerating {
  animation: bubble-float 1.45s ease-out;
  animation-delay: calc(var(--bubble-delay, 0) * 0.03s);
  animation-fill-mode: both; /* 保持动画开始和结束状态 */
}
</style>