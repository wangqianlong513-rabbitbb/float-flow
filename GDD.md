下面给你一份**可直接用于立项评审 / 外包开发 / 微信小游戏上线准备的完整GDD（V2.0加强版）**。这一版已经把你前面的“视觉 + 玩法 + 上瘾系统”全部整合成**真正可开发、可运营的产品设计文档**。

---

# 🎮 游戏设计说明书（GDD V2.0）

## 《浮岛浮光 Float & Flow》

类型：策略构筑 / 实时路径规划 / 轻解谜  
平台：微信小游戏 / H5 / Unity或Cocos Creator  
单局时长：30–90秒  
核心标签：视觉驱动 / 上瘾循环 / 策略构筑 / 光路模拟

---

# 一、游戏概述

## 1.1 游戏一句话定义

玩家在动态变化的浮岛空间中，通过拖拽“水晶路径碎片”，构建光的传播路径，引导水晶生命体在时间压力下完成“折射通关”。

---

## 1.2 核心卖点（USP）

- ✨ **视觉驱动玩法**：等距低多边形水晶世界（无原画依赖）
- 🧠 **路径构筑策略**：类似卡牌构筑 + 空间规划
- ⚡ **实时路径模拟**：拖拽即预演
- 🔥 **强反馈成瘾系统**：Crystal Flow 多级爽感
- 📱 **极短局设计**：适配微信碎片时间

---

## 1.3 设计目标

|目标|说明|
|---|---|
|留存|D1 ≥ 40%，D7 ≥ 15%|
|单局|30~90秒|
|重玩|无限关卡 + 程序生成|
|上瘾点|Near Miss + Perfect Flow|

---

# 二、核心玩法系统

---

# 2.1 核心循环（Core Loop）

```
进入关卡   ↓系统发放3张水晶碎片（手牌）   ↓玩家拖拽放置路径   ↓实时路径预演（光流模拟）   ↓水晶自动移动   ↓成功 / 失败 / 分裂路径   ↓结算奖励（光能 + 评分）   ↓进入下一关
```

---

# 2.2 核心操作

玩家仅3种操作：

- 拖拽碎片（放置路径）
- 点击旋转（部分碎片）
- 弃牌（丢弃当前碎片）

---

# 2.3 核心机制：路径构筑系统（Path Build System）

每个碎片 = 一个“光路规则模块”

---

## 📦 碎片类型

|类型|功能|说明|
|---|---|---|
|直线水晶|稳定传播|基础路径|
|90°折角|改变方向|必备转向|
|折射镜|角度偏移|高级策略|
|分光器|分裂路径|多路线|
|加速晶体|提速|风险收益|
|崩塌晶体|使用后消失|动态变化|
|能量门|颜色限制|解谜机制|

---

# 三、关卡系统设计

---

# 3.1 关卡结构

每关包含：

- 起点浮岛
- 终点浮岛
- 可放置网格
- 障碍区域
- 手牌系统
- 时间限制

---

# 3.2 难度曲线（1~50关）

|阶段|内容|
|---|---|
|1-5|基础路径教学|
|6-10|时间压力|
|11-20|机关引入|
|21-30|多路径策略|
|31-50|动态生态系统|

---

# 3.3 示例关卡数据结构

```
{  "id": 12,  "gridSize": [8, 8],  "start": [0, 4],  "goal": [7, 4],  "timeLimit": 55,  "handSize": 3,  "obstacles": [[3,4],[4,4]],  "mechanics": ["mirror", "splitter"],  "fragPool": ["straight", "corner", "mirror"]}
```

---

# 四、路径模拟系统（核心技术）

---

# 4.1 等距网格系统

```
isoX = (x - y) * tileWidth / 2;isoY = (x + y) * tileHeight / 2;
```

---

# 4.2 碎片数据结构

```
enum Direction {    Up, Right, Down, Left}interface Fragment {    type: string;    inputDir: Direction;    outputDir: Direction;}
```

---

# 4.3 路径模拟算法（核心）

```
function simulatePath(start, dir, grid) {    let path = [];    let current = start;    while (true) {        let next = move(current, dir);        if (!grid.isValid(next)) break;        let tile = grid.getTile(next);        path.push(next);        if (tile.fragment) {            let f = tile.fragment;            switch (f.type) {                case "corner":                    dir = rotate(dir, f.outputDir);                    break;                case "mirror":                    dir = reflect(dir);                    break;                case "splitter":                    return simulateSplit(next, dir, grid);            }            if (tile.isOneTime) {                grid.removeTile(next);            }        }        current = next;    }    return path;}
```

---

# 4.4 实时预览系统（关键体验）

```
onDrag(fragment) {    tempGrid.place(fragment);    let preview = simulatePath(        crystalStart,        currentDirection,        tempGrid    );    renderPreview(preview);}
```

---

# 五、上瘾系统设计（核心商业结构）

---

# 5.1 五段爽感模型

每局必须包含：

1. Flow Start（启动）
2. Build Phase（构建）
3. Near Miss（差一点）
4. Resolution（成功/失败）
5. Feedback Reward（强化）

---

# 5.2 Near Miss机制（核心上瘾点）

触发条件：

- 差1格通关
- 差一次Perfect Flow
- 差一段连锁

表现：

- 时间减速
- 镜头拉近
- 音调上升

---

# 5.3 光能经济系统（Flow Currency）

## 获取：

- 通关奖励
- 完美路径
- 连锁折射

---

## 使用：

- 解锁碎片
- 强化概率
- 解锁新机制

---

# 5.4 玩家流派系统（Meta Build）

|流派|特点|
|---|---|
|稳定流|通关率高|
|连锁流|高分路径|
|赌局流|高风险高收益|
|极限流|完美优化|

---

# 5.5 身份系统（长期留存）

玩家被分类：

- Crystal Engineer（构筑者）
- Flow Artist（连锁玩家）
- Risk Diver（冒险玩家）
- Optimization Master（优化玩家）

---

# 六、视觉系统

---

# 6.1 风格定义

## 👉 Isometric Crystal Low-Poly Style

关键词：

- 低多边形
- 半透明水晶
- 光折射
- 莫兰迪渐变
- 空气雾化

---

# 6.2 色彩系统

|类型|色系|
|---|---|
|背景|蓝紫渐变|
|路径|冰蓝|
|特效|粉紫|
|危险|红橙|

---

# 6.3 特效系统

- Crystal Flow Trail
- Perfect Burst
- Fracture Explosion
- Energy Pulse

---

# 七、UI系统设计

---

# 7.1 主界面

- 开始游戏
- 关卡选择
- 成长系统
- 图鉴系统

---

# 7.2 游戏界面

```
顶部：- 时间条- 目标中间：- 等距地图底部：- 3张手牌- 弃牌按钮
```

---

# 7.3 结算界面

- 星级评分（1~3星）
- 路径效率
- Perfect Flow次数
- 分享按钮（微信裂变）

---

# 八、商业化设计

---

# 8.1 IAA广告

- 失败复活
- 手牌刷新
- 双倍奖励

---

# 8.2 IAP轻付费

- 皮肤系统
- 特效系统
- 关卡包

---

# 九、技术架构建议

---

## 引擎

- Cocos Creator（推荐）
- Unity（高保真版本）

---

## 核心模块

- GridSystem（网格）
- PathSystem（模拟）
- CardSystem（随机手牌）
- VFXSystem（特效）

---

# 十、核心风险控制

|风险|解决方案|
|---|---|
|随机挫败|可控抽牌|
|玩法单一|Build系统|
|留存低|Near Miss机制|
|审美疲劳|动态主题|

---

# 十一、产品定位总结

你的游戏最终定位：

> 🎮 “视觉驱动的策略构筑型轻度上瘾游戏”

不是拼图，不是跑酷，而是：

> **一个关于“光如何在规则中流动”的策略系统游戏**

---

# 🚀 如果你下一步要继续，我可以帮你做：

### 1️⃣ 微信小游戏“7日留存运营设计”

### 2️⃣ 第一版可上线MVP开发排期（7~14天）

### 3️⃣ 关卡生成算法（自动生成100关）