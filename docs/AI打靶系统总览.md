# AI打靶系统总览

## 📋 概述
https://docs.qq.com/doc/DRXpLbnhGcGNEZmVY
本文档汇总了标靶APP中所有游戏的AI对战系统，包括米老鼠游戏和01游戏。所有AI系统均严格遵循后台管理"二、AI模式管理"的配置规范。

## 🎯 系统架构

```
┌─────────────────────────────────────────┐
│        后台管理 - AI模式管理             │
│  配置难度参数：命中率、分区、倍区、空靶   │
└──────────────────┬──────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────┐
│     hitAlgorithm.js - 统一命中算法       │
│  ├─ getHitRate() - 通用算法 (01游戏)     │
│  └─ getMickeyMouseHit() - 专用 (米老鼠)  │
└──────────────┬────────────┬─────────────┘
               │            │
       ┌───────┴────┐   ┌──┴──────────┐
       │ 01游戏     │   │ 米老鼠游戏   │
       │ AI系统     │   │ AI系统       │
       └────────────┘   └──────────────┘
```

## 🎮 游戏对比

| 项目 | 01游戏 | 米老鼠游戏 |
|-----|--------|-----------|
| **有效区域** | 1-20 + 牛眼 | 15-20 + 牛眼 |
| **AI函数** | `get01AITarget()` | `getMickeyMouseAITarget()` |
| **命中算法** | `getHitRate()` | `getMickeyMouseHit()` |
| **智能策略** | ✅ 一镖清零+替代方案 | ❌ 随机均匀分布 |
| **开局条件** | ✅ 二倍区/倍数区 | ❌ 无 |
| **结束条件** | ✅ 二倍区/倍数区 | ❌ 无 |
| **胜负判定** | 先归零 | 开区数+分数 |
| **文档位置** | `docs/01游戏AI打靶逻辑说明.md` | `docs/米老鼠AI打靶逻辑说明.md` |

## 🔧 统一配置参数

### 后台配置项

所有游戏共享以下配置参数（由后台"AI模式管理"统一管理）：

```javascript
{
  airTarget: 0,           // 是否允许空镖 (0=允许, 1=不允许)
  hittingAccuracy: 85,    // 命中率 (1-100)
  partitionDiff: 3,       // 分区难度 (1=简单, 2=中等, 3=困难, 4=专家)
  multiple: 2             // 倍区难度 (1=简单, 2=中等, 3=困难)
}
```

### 难度等级映射

#### 分区难度 (lowOrhighConfig)

| 等级 | 低分区(1-14) | 高分区(15-20) | 牛眼 | 说明 |
|-----|-------------|--------------|------|------|
| **1 - 简单** | 70% | 25% | 5% | 新手友好 |
| **2 - 中等** | 50% | 40% | 10% | 均衡分布 |
| **3 - 困难** | 30% | 55% | 15% | 偏向高分 |
| **4 - 专家** | 10% | 70% | 20% | 高手级别 |

**米老鼠特殊处理**：抽到低分区(1-14)自动转换为高分区(15-20)

#### 倍区难度 (multipleConfig)

| 等级 | 单倍(1x) | 双倍(2x) | 三倍(3x) | 说明 |
|-----|---------|---------|---------|------|
| **1 - 简单** | 80% | 15% | 5% | 以单倍为主 |
| **2 - 中等** | 60% | 30% | 10% | 适度倍数 |
| **3 - 困难** | 40% | 40% | 20% | 高倍数多 |

#### 牛眼配置 (centerConfig)

| 等级 | 外牛眼(BULL) | 内牛眼(DBULL) | 说明 |
|-----|------------|--------------|------|
| **1 - 简单** | 70% | 30% | 外眼为主 |
| **2 - 中等** | 50% | 50% | 均等分布 |
| **3 - 困难** | 30% | 70% | 内眼为主 |

## 📂 文件结构

```
biaoba-uniap-self-build/
├── sheep/
│   ├── config/
│   │   └── hitAlgorithm.js          # 🔥 AI命中算法核心
│   │       ├── getHitRate()         # 通用算法(01游戏)
│   │       └── getMickeyMouseHit()  # 米老鼠专用算法
│   └── ...
├── pages/
│   └── game/
│       ├── 01/
│       │   └── index.vue            # 01游戏 + get01AITarget()
│       └── mickeyMouse/
│           └── index.vue            # 米老鼠游戏 + getMickeyMouseAITarget()
└── docs/                            # 📚 AI文档
    ├── AI打靶系统总览.md             # 本文档
    ├── 01游戏AI打靶逻辑说明.md
    └── 米老鼠AI打靶逻辑说明.md
```

## 🎯 核心API

### 1. hitAlgorithm.js - 命中算法

#### getHitRate(options) - 通用算法

```javascript
/**
 * 通用AI命中算法（01游戏使用）
 * 支持1-20所有分区 + 牛眼
 */
const options = {
  airTarget: 0,           // 是否允许空镖
  hittingAccuracy: 85,    // 命中率
  partitionDiff: 3,       // 分区难度
  multiple: 2             // 倍区难度
};

const result = getHitRate(options);
// 返回: 0(空镖), '0F'(1分单倍), '50'(20分三倍), 51(外牛眼), 52(内牛眼)
```

#### getMickeyMouseHit(options) - 米老鼠专用

```javascript
/**
 * 米老鼠游戏专用AI命中算法
 * 只命中有效区域：15-20分区 + 牛眼
 * 自动过滤1-14低分区
 */
const result = getMickeyMouseHit(options);
// 返回: 0(空镖), 15-20分区编码, 51(外牛眼), 52(内牛眼)
```

### 2. 游戏页面 - AI目标选择

#### get01AITarget(aiDifficulty) - 01游戏

```javascript
/**
 * 01游戏AI目标选择（规范化入口）
 * 参数验证 + 调试日志 + 异常处理
 */
const target = get01AITarget(selectAiDifficulty);
console.log("🤖 [01 AI] AI选择结果:", target);
```

#### getMickeyMouseAITarget(aiDifficulty) - 米老鼠

```javascript
/**
 * 米老鼠游戏AI目标选择（规范化入口）
 * 参数验证 + 调试日志 + 异常处理
 */
const target = getMickeyMouseAITarget(selectAiDifficulty);
console.log("🤖 [Mickey AI] AI选择结果:", target);
```

## 🔒 统一保护机制

### 1. 防止用户干扰

```javascript
// AI回合禁止手动操作
if (state.params?.type === 10 && (state.aiAutomaticBid || isAiTurn.value)) {
  // ❌ 禁止换手
  // ❌ 禁止重投
  // ❌ 禁止蓝牙输入
  return;
}
```

### 2. 游戏结束检测

```javascript
// 每次投掷前检查
if (!bluetooth().isGameStart) {
  state.aiAutomaticBid = false;
  moveToNextPlayer(); // 自动换手进入结算
}
```

### 3. AI换手保护

```javascript
// 只允许AI在自身回合结束时触发换手
aiHandingOver.value = true;
moveToNextPlayer();
setTimeout(() => { aiHandingOver.value = false; }, 0);
```

## 🐛 统一调试日志

### 日志格式规范

```javascript
// ✅ 好的日志格式
console.log("🤖 [游戏名 功能] 描述:", 数据);

// 示例
console.log("🤖 [01 AI Debug] 后台难度对象:", aiDifficulty);
console.log("🤖 [Mickey AI] AI投掷区域:", target);
console.log("🤖 [AI条件检查] AI不满足开局条件，投空镖");
```

### 关键日志点

1. **难度参数接收** - 验证后台配置是否完整
2. **命中算法调用** - 查看概率引擎返回值
3. **条件检查** - 开局/结束条件判断
4. **策略决策** - 智能策略选择过程
5. **投掷执行** - 最终投掷的区域

## ✅ 开发规范

### 1. 新增游戏AI系统

如需为其他游戏添加AI系统，请遵循以下步骤：

1. **评估有效区域**
   - 全分区(1-20)？使用 `getHitRate()`
   - 特定区域？创建专用算法（参考 `getMickeyMouseHit()`）

2. **创建规范化入口**
   ```javascript
   const get游戏名AITarget = (aiDifficulty) => {
     // 参数规范化
     const options = {
       airTarget: Number(aiDifficulty?.airTarget ?? 0),
       hittingAccuracy: Math.max(0, Math.min(100, Number(aiDifficulty?.hittingAccuracy ?? 50))),
       partitionDiff: Number(aiDifficulty?.partitionDiff ?? 2),
       multiple: Number(aiDifficulty?.multiple ?? 2),
     };
     
     // 调用算法
     const key = getHitRate(options); // 或专用算法
     console.log("🤖 [游戏名 AI] 选择结果:", key);
     return key;
   };
   ```

3. **实现游戏逻辑**
   - AI投标流程（3镖循环）
   - 开局/结束条件（如有）
   - 智能策略（如有）
   - 保护机制（防干扰、结束检测）

4. **添加调试日志**
   - 遵循统一格式
   - 覆盖关键决策点

5. **编写文档**
   - 参考现有文档模板
   - 说明游戏特有的策略

### 2. 修改难度配置

如需调整难度系统，请修改 `sheep/config/hitAlgorithm.js`：

```javascript
// 添加新的难度等级
export const lowOrhighConfig = {
  1: { lowScore: 0.7, highScore: 0.25, center: 0.05 },
  2: { lowScore: 0.5, highScore: 0.4,  center: 0.1 },
  3: { lowScore: 0.3, highScore: 0.55, center: 0.15 },
  4: { lowScore: 0.1, highScore: 0.7,  center: 0.2 },
  5: { lowScore: 0.0, highScore: 0.85, center: 0.15 }, // 新增：骨灰级
};
```

⚠️ **注意**：修改配置后需同步更新后台管理系统。

## 📚 参考文档

- [01游戏AI打靶逻辑说明](./01游戏AI打靶逻辑说明.md)
- [米老鼠AI打靶逻辑说明](./米老鼠AI打靶逻辑说明.md)
- 后台管理使用手册 - "二、AI模式管理"

## 🎉 总结

### ✅ 已实现功能

- [x] 统一的AI难度配置系统
- [x] 01游戏完整AI（智能策略）
- [x] 米老鼠游戏完整AI（区域过滤）
- [x] 统一的保护机制
- [x] 详细的调试日志
- [x] 完善的技术文档

### 🌟 核心优势

1. **后台配置即时生效** - 无需修改前端代码
2. **统一难度系统** - 所有游戏共享配置
3. **灵活扩展** - 易于添加新游戏AI
4. **完善的日志** - 便于调试和问题排查
5. **稳定可靠** - 完善的保护和异常处理

### 🔮 未来扩展

- [ ] 更多游戏模式的AI支持
- [ ] AI难度动态调整（根据玩家表现）
- [ ] AI行为模式学习（机器学习）
- [ ] 多人协作AI（2v2中AI队友）

---

*最后更新: 2025-10-20*
*文档版本: v1.0*
*维护人员: 开发团队*
