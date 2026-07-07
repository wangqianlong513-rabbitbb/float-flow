# 《浮岛浮光 Float & Flow》Cocos Creator 一期工程操作指导

版本：v1.0  
日期：2026-07-06  
适用：Cocos Creator 3.8.x  
目标：把当前脚本工程在 Cocos Creator 中挂载成一个可运行的一期玩法原型。

---

## 0. 当前已生成内容

我已经在项目目录中生成了基础 Cocos 工程结构和一期核心代码。

### 关键文件

```text
package.json
settings/v2.json
tsconfig.json
assets/scripts/core/GameTypes.ts
assets/scripts/core/DirectionUtils.ts
assets/scripts/core/TileDefinitions.ts
assets/scripts/core/GridManager.ts
assets/scripts/core/RouteSimulator.ts
assets/scripts/core/CardSystem.ts
assets/scripts/level/BuiltinLevels.ts
assets/scripts/components/GameRoot.ts
assets/scripts/wx/AdService.ts
assets/scripts/wx/ShareService.ts
assets/scripts/wx/WeChatService.ts
assets/resources/levels/level_001.json
assets/resources/levels/level_002.json
```

### 已实现功能

- 逻辑网格。
- 等距坐标显示。
- Runner 自动移动。
- Tile 方向映射。
- 手牌拖拽。
- 点击放置后的路线推进。
- 拖拽时路线预览。
- 通关/失败判定。
- Near Miss 基础救场。
- 子弹时间基础效果。
- 10 个内置测试关卡。
- 微信广告、分享服务的代码占位封装。

---

## 1. 用 Cocos Creator 打开项目

1. 打开 Cocos Dashboard。
2. 点击“添加项目”或“打开项目”。
3. 选择目录：

```text
/Users/qianlongwang/Documents/cocos/flow_land_light
```

4. 使用 Cocos Creator 3.8.x 打开。
5. 第一次打开后等待资源导入完成。
6. 如果 Cocos 提示生成 `.meta` 文件，选择确认。

注意：当前项目是脚本优先搭建的轻量工程。如果 Cocos 提示缺少场景，这是正常的，需要按下面步骤创建场景。

---

## 2. 创建主场景

### 2.1 新建场景

1. 在 `assets` 下新建文件夹：

```text
assets/scenes
```

2. 右键 `assets/scenes`。
3. 选择“创建 -> Scene”。
4. 命名为：

```text
Main.scene
```

5. 双击打开 `Main.scene`。

---

## 3. 创建基础节点结构

推荐节点结构如下：

```text
Canvas
  GameRoot
    BoardRoot
    PreviewRoot
    RunnerRoot
    CardRoot
    UI
      LevelLabel
      TipLabel
      StatusLabel
      RestartButton
      NextButton
      RedrawButton
```

### 3.1 创建 Canvas

如果场景里没有 Canvas：

1. 层级管理器右键。
2. 选择“创建 -> UI -> Canvas”。
3. 选中 Canvas。
4. 确认 Canvas 下有 `UITransform` 组件。

建议 Canvas 设置：

| 属性 | 建议值 |
| --- | --- |
| Design Resolution | 750 x 1334 |
| Fit Height | 开启 |
| Fit Width | 可按项目实际调整 |

---

## 4. 创建 GameRoot 和游戏区域节点

### 4.1 创建 GameRoot

1. 右键 Canvas。
2. 创建空节点。
3. 命名为：

```text
GameRoot
```

4. 选中 `GameRoot`。
5. 在 Inspector 中点击“添加组件”。
6. 搜索并添加脚本组件：

```text
GameRoot
```

也就是文件：

```text
assets/scripts/components/GameRoot.ts
```

### 4.2 创建 BoardRoot

1. 右键 `GameRoot` 创建空节点。
2. 命名：

```text
BoardRoot
```

3. 设置位置：

```text
X = 0
Y = 80
Z = 0
```

4. 添加 `UITransform` 组件。
5. 宽高可以先设置为：

```text
Width = 1
Height = 1
```

### 4.3 创建 PreviewRoot

1. 右键 `GameRoot` 创建空节点。
2. 命名：

```text
PreviewRoot
```

3. 设置位置与 `BoardRoot` 一样：

```text
X = 0
Y = 80
Z = 0
```

4. 添加 `UITransform` 组件。

说明：预览线要和棋盘重叠，所以位置必须与 `BoardRoot` 一致。

### 4.4 创建 RunnerRoot

1. 右键 `GameRoot` 创建空节点。
2. 命名：

```text
RunnerRoot
```

3. 设置位置与 `BoardRoot` 一样：

```text
X = 0
Y = 80
Z = 0
```

4. 添加 `UITransform` 组件。

说明：Runner 需要显示在棋盘和预览线之上。

### 4.5 创建 CardRoot

1. 右键 `GameRoot` 创建空节点。
2. 命名：

```text
CardRoot
```

3. 设置位置：

```text
X = 0
Y = -320
Z = 0
```

4. 添加 `UITransform` 组件。

说明：手牌会由代码自动生成到 `CardRoot` 下面。

---

## 5. 创建 UI 文本

### 5.1 创建 UI 根节点

1. 右键 `GameRoot` 创建空节点。
2. 命名：

```text
UI
```

3. 添加 `UITransform` 组件。

### 5.2 创建 LevelLabel

1. 右键 `UI`。
2. 创建 `UI -> Label`。
3. 命名：

```text
LevelLabel
```

4. 设置位置：

```text
X = 0
Y = 560
Z = 0
```

5. 设置 Label：

| 属性 | 建议值 |
| --- | --- |
| String | 第 1 关 |
| Font Size | 30 |
| Color | #FFFFFF |

### 5.3 创建 TipLabel

1. 右键 `UI` 创建 `UI -> Label`。
2. 命名：

```text
TipLabel
```

3. 设置位置：

```text
X = 0
Y = 515
Z = 0
```

4. 设置 Label：

| 属性 | 建议值 |
| --- | --- |
| String | 手数 / 救场能量 |
| Font Size | 22 |
| Color | #BEEFFF |

### 5.4 创建 StatusLabel

1. 右键 `UI` 创建 `UI -> Label`。
2. 命名：

```text
StatusLabel
```

3. 设置位置：

```text
X = 0
Y = -430
Z = 0
```

4. 设置 Label：

| 属性 | 建议值 |
| --- | --- |
| String | 拖拽水晶，接住这束光。 |
| Font Size | 22 |
| Color | #FFFFFF |

5. 如果文案显示不完整，给 `StatusLabel` 的 `UITransform` 设置：

```text
Width = 680
Height = 80
```

---

## 6. 创建按钮

### 6.1 创建 RestartButton

1. 右键 `UI`。
2. 创建 `UI -> Button`。
3. 命名：

```text
RestartButton
```

4. 设置位置：

```text
X = -220
Y = -520
Z = 0
```

5. 修改按钮子节点 `Label` 的文字：

```text
重开
```

6. 选中 `RestartButton`。
7. 在 Button 组件的 `Click Events` 中添加事件：

| 字段 | 设置 |
| --- | --- |
| Target | 拖入 `GameRoot` 节点 |
| Component | `GameRoot` |
| Handler | `restartLevel` |

### 6.2 创建 NextButton

1. 右键 `UI` 创建 `UI -> Button`。
2. 命名：

```text
NextButton
```

3. 设置位置：

```text
X = 0
Y = -520
Z = 0
```

4. 修改 Label 文字：

```text
下一关
```

5. Button 点击事件：

| 字段 | 设置 |
| --- | --- |
| Target | `GameRoot` 节点 |
| Component | `GameRoot` |
| Handler | `loadNextLevel` |

### 6.3 创建 RedrawButton

1. 右键 `UI` 创建 `UI -> Button`。
2. 命名：

```text
RedrawButton
```

3. 设置位置：

```text
X = 220
Y = -520
Z = 0
```

4. 修改 Label 文字：

```text
洗牌
```

5. Button 点击事件：

| 字段 | 设置 |
| --- | --- |
| Target | `GameRoot` 节点 |
| Component | `GameRoot` |
| Handler | `redrawCardsByAdStub` |

说明：当前 `redrawCardsByAdStub` 是开发期占位逻辑，后续接微信激励视频后，会替换为“看广告后洗牌”。

---

## 7. 挂载 GameRoot 属性

选中 `GameRoot` 节点，在 Inspector 的 `GameRoot` 组件中设置：

| 属性 | 拖入节点/组件 |
| --- | --- |
| Board Root | `BoardRoot` 节点 |
| Preview Root | `PreviewRoot` 节点 |
| Runner Root | `RunnerRoot` 节点 |
| Card Root | `CardRoot` 节点 |
| Level Label | `LevelLabel` 的 Label 组件 |
| Tip Label | `TipLabel` 的 Label 组件 |
| Status Label | `StatusLabel` 的 Label 组件 |

数值属性建议保持默认：

| 属性 | 默认值 | 说明 |
| --- | --- | --- |
| Tile Width | 96 | 单个等距格子的宽度 |
| Tile Height | 56 | 单个等距格子的高度 |
| Card Width | 126 | 手牌宽度 |
| Card Height | 82 | 手牌高度 |

如果棋盘太大或太小，优先调整：

```text
Tile Width
Tile Height
BoardRoot 的 Y 坐标
CardRoot 的 Y 坐标
```

---

## 8. 运行测试

1. 保存场景。
2. 点击 Cocos Creator 顶部运行按钮。
3. 选择浏览器预览或模拟器预览。
4. 进入后应看到：

- 等距棋盘。
- 发光 Runner。
- 底部手牌。
- 顶部关卡标题。
- 底部状态提示。

### 第 1 关操作

1. 把底部“直线水晶”拖到起点右侧的断点格。
2. 拖动时应该看到预览线。
3. 松手放置。
4. Runner 开始移动并通关。
5. 点击“下一关”进入第 2 关。

### 第 2 关操作

1. 拖动“折角镜”。
2. 放置后如果路线不对，点击已经放置的折角镜即可旋转。
3. 观察预览线和 Runner 方向，继续补路。

---

## 9. 当前原型已知限制

这是一期第一版工程骨架，不是最终上线版本。当前限制如下：

- UI 是程序动态绘制的临时表现，后续可以换成美术 Prefab。
- 分流器还未进入本版核心代码。
- 微信广告和分享是封装占位，必须在微信开发者工具和真实 AppID 中配置后才能正式测试。
- 关卡 JSON 只放了 2 个示例，实际运行使用 `BuiltinLevels.ts` 中的 10 个内置关卡。
- 暂未接入真实数据后台。
- 暂未做完整对象池和低端机性能降级。

---

## 10. 微信小游戏构建提示

当浏览器预览可玩后，再做微信构建：

1. 打开 Cocos Creator 菜单“项目 -> 构建发布”。
2. 发布平台选择：

```text
微信小游戏
```

3. 填写微信小游戏 AppID。
4. 构建目录可使用默认 `build/wechatgame`。
5. 点击“构建”。
6. 用微信开发者工具打开构建目录。
7. 在微信开发者工具中测试：

- 触摸拖拽是否正常。
- 屏幕适配是否正常。
- 帧率是否稳定。
- 分享和广告占位是否报错。

---

## 11. 后续建议开发顺序

下一步建议按这个顺序继续：

1. 补充真正的关卡选择界面。
3. 补齐前 20 关 JSON 配置。
4. 将 `BuiltinLevels.ts` 改为从 `assets/resources/levels` 加载。
5. 接入微信激励视频广告。
6. 接入残局分享 encode/decode。
7. 做结算面板和光轨海报。
8. 做真机性能优化。

---

## 12. 给 Codex 的下一步任务建议

可以直接让 Codex 继续执行：

```text
基于当前 Cocos 工程，补充关卡选择界面：
1. 首页显示“开始游戏”“关卡选择”。
2. 关卡选择中列出已解锁关卡。
3. 点击关卡后调用 GameRoot 加载指定关卡。
4. 记录已通关最高关卡。
5. 保持当前 GameRoot 的关卡逻辑不破坏。
```

或者：

```text
把 BuiltinLevels.ts 中的内置关卡迁移为 assets/resources/levels 下的 JSON 加载，并保留内置关卡作为加载失败兜底。
```


---

## 13. 空白预览排查与最简启动法

如果预览页面只有一块灰色背景、FPS 面板正常，但没有棋盘、手牌、文字，通常不是浏览器问题，而是场景里没有真正运行 `GameRoot`。

### 13.1 最可能原因

按概率从高到低：

1. 当前预览的场景里没有挂载 `GameRoot` 或 `SceneBootstrap` 脚本。
2. 创建了 `GameRoot` 节点，但没有把 `GameRoot.ts` 组件添加到节点上。
3. 添加了组件，但脚本编译失败，组件在 Inspector 里显示红色或 Missing。
4. 预览的不是你刚创建的 `Main.scene`，而是一个空场景。
5. 场景里没有 Canvas，或者 GameRoot 不在 Canvas 下面。
6. Console 有报错导致 `start()` 没有执行。

从截图看，Draw call 只有 2，画面只有 Cocos 默认背景，这基本说明游戏节点没有生成出来。

### 13.2 推荐最快解决方式：使用 SceneBootstrap

我已经新增了一个一键启动脚本：

```text
assets/scripts/components/SceneBootstrap.ts
```

它会自动创建：

- `BoardRoot`
- `PreviewRoot`
- `RunnerRoot`
- `CardRoot`
- UI 背景
- 关卡标题
- 状态提示
- 重开 / 下一关 / 洗牌按钮
- 并自动挂载 `GameRoot`

你可以先用这个方式跑起来，避免手动拖属性出错。

#### 操作步骤

1. 打开你的 `Main.scene`。
2. 确认场景里有 `Canvas`。
3. 在 `Canvas` 下创建一个空节点。
4. 命名为：

```text
GameRoot
```

5. 选中 `GameRoot`。
6. 点击 Inspector 的“添加组件”。
7. 搜索并添加：

```text
SceneBootstrap
```

8. 不需要手动创建 `BoardRoot`、`CardRoot`、Label、Button。
9. 保存场景。
10. 点击预览。

如果成功，你应该能看到：

- 深色背景。
- 顶部第 1 关标题。
- 中间等距棋盘。
- 发光 Runner。
- 底部手牌。
- 重开 / 下一关 / 洗牌按钮。

### 13.3 如何确认脚本真的运行了

预览后打开浏览器 DevTools Console，检查是否有：

```text
[FloatFlow] GameRoot started
```

如果没有这行日志，说明 `GameRoot` 没有运行。请检查：

- `SceneBootstrap` 是否挂到了场景节点上。
- 场景是否保存。
- 预览的是不是当前场景。
- Cocos Console 是否有 TypeScript 编译错误。

### 13.4 如果 Inspector 里找不到 SceneBootstrap

可能是 Cocos 还没完成脚本编译：

1. 回到 Cocos Creator。
2. 看底部 Console 是否有红色报错。
3. 等待编译完成。
4. 右键 `assets/scripts/components/SceneBootstrap.ts`，确认脚本在资源管理器中可见。
5. 如果仍找不到，重启 Cocos Creator。

### 13.5 如果画面还是空白

请按顺序检查：

1. 层级管理器里是否有：

```text
Canvas
  GameRoot
```

2. `GameRoot` 节点 Inspector 里是否有 `SceneBootstrap` 组件。
3. 浏览器 Console 是否有 `[FloatFlow] GameRoot started`。
4. Cocos Console 是否有红色报错。
5. 预览前是否保存了 `Main.scene`。
6. 是否误打开了其他空场景。

如果仍然不行，把 Cocos Creator Console 的红色报错截图发给我，我可以继续定位。

---

## 14. 场景里只有 Main Light 和 Main Camera 时怎么办

如果层级管理器里只有：

```text
Main Light
Main Camera
```

说明当前是 Cocos 默认 3D 场景。当前游戏原型使用的是 UI/2D 绘制方式，所以必须先创建 `Canvas`。

### 14.1 创建 Canvas

1. 在层级管理器空白处右键。
2. 选择：

```text
创建 -> UI -> Canvas
```

英文界面一般是：

```text
Create -> UI -> Canvas
```

3. 创建后层级应变成类似：

```text
Main Camera
Main Light
Canvas
```

`Main Camera` 和 `Main Light` 可以先保留，不影响当前 UI 原型。

### 14.2 在 Canvas 下创建 GameRoot

1. 右键 `Canvas`。
2. 选择“创建空节点”。
3. 命名为：

```text
GameRoot
```

4. 选中 `GameRoot`。
5. Inspector 中点击“添加组件”。
6. 搜索并添加：

```text
SceneBootstrap
```

7. 保存场景。
8. 点击预览。

正确层级应至少是：

```text
Main Camera
Main Light
Canvas
  GameRoot  (挂载 SceneBootstrap)
```

运行后，`SceneBootstrap` 会自动创建游戏需要的其他节点。

### 14.3 如果创建 Canvas 后仍然空白

按顺序检查：

1. `GameRoot` 是否是 `Canvas` 的子节点。
2. `GameRoot` 是否挂载了 `SceneBootstrap`，不是 `GameRoot` 脚本。
3. 保存场景后再预览。
4. 浏览器 Console 是否出现：

```text
[FloatFlow] GameRoot started
```

5. Cocos Creator 底部 Console 是否有红色报错。


---

## 15. 有 `[FloatFlow] GameRoot started` 但画面元素跑到边缘/几乎看不到

如果浏览器 Console 已经出现：

```text
[FloatFlow] GameRoot started
```

说明脚本已经运行。此时画面还是几乎空白，通常是以下原因之一：

1. `GameRoot` 节点位置、缩放或旋转不对，导致生成的 UI 跑到屏幕外。
2. `GameRoot` 上同时挂了旧的 `GameRoot` 组件和新的 `SceneBootstrap`，旧组件先执行时没有拿到正确节点引用。
3. `Canvas` 不是正常 UI Canvas，或者 `GameRoot` 没有作为 `Canvas` 子节点。
4. 场景保存的是旧状态，预览没有刷新到最新脚本。

### 15.1 我已做的代码修复

我已经修改了：

```text
assets/scripts/components/SceneBootstrap.ts
```

现在它会在 `onLoad` 阶段执行，并且会：

- 强制把 `GameRoot` 节点位置重置到 `(0, 0, 0)`。
- 清理 `GameRoot` 下旧的自动生成子节点。
- 重新创建 `BoardRoot`、`PreviewRoot`、`RunnerRoot`、`CardRoot` 和 UI。
- 如果 `GameRoot` 组件已经存在，会直接复用并重新填充引用。
- 如果 `GameRoot` 组件不存在，会自动添加。

预览时 Console 应该能看到两行日志：

```text
[FloatFlow] SceneBootstrap onLoad
[FloatFlow] GameRoot started
```

### 15.2 你现在需要做的操作

1. 回到 Cocos Creator。
2. 等待脚本重新编译完成。
3. 选中层级里的：

```text
Canvas/GameRoot
```

4. 确认 Inspector 中至少有：

```text
SceneBootstrap
```

5. 如果同一个节点上还有 `GameRoot` 组件，也可以先保留；新版 `SceneBootstrap` 会处理。
6. 把 `GameRoot` 节点 Transform 手动重置为：

```text
Position: X = 0, Y = 0, Z = 0
Rotation: X = 0, Y = 0, Z = 0
Scale:    X = 1, Y = 1, Z = 1
```

7. 确认 `GameRoot` 是 `Canvas` 的子节点，不是和 `Canvas` 平级。
8. 保存场景。
9. 刷新预览页面或重新点击预览。

### 15.3 正确层级应该类似

```text
Main Camera
Main Light
Canvas
  GameRoot  (挂载 SceneBootstrap，可同时有 GameRoot)
```

运行后会自动变成：

```text
Canvas
  GameRoot
    BoardRoot
    PreviewRoot
    RunnerRoot
    CardRoot
    UI
      Background
      LevelLabel
      TipLabel
      StatusLabel
      RestartButton
      NextButton
      RedrawButton
```

如果运行后层级没有自动生成这些子节点，说明 `SceneBootstrap` 没有执行。

### 15.4 继续空白时的关键检查

请检查浏览器 Console 是否同时有：

```text
[FloatFlow] SceneBootstrap onLoad
[FloatFlow] GameRoot started
```

- 如果只有 `GameRoot started`，没有 `SceneBootstrap onLoad`：说明你挂的是旧 `GameRoot`，没有挂 `SceneBootstrap`。
- 如果两行都有，但画面仍偏到屏幕边缘：检查 `Canvas/GameRoot` 的 Transform 是否是 `(0,0,0)`、缩放是否是 `(1,1,1)`。
- 如果两行都有但 Cocos Creator 底部 Console 有红色报错：把红色报错发给我。

