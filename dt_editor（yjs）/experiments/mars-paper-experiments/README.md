# MARS 论文实验代码(mars-paper-experiments)

依据《MARS实验提示词.md》实现的实验自动化测试框架。基于 Yjs CRDT 在 Node.js 中模拟多客户端协同编辑,可直接产出论文所需的原始数据(CSV/JSON)、统计结果(均值 ± 标准差、配对 t 检验)与可引用的 Markdown 表格。

## 目录结构

```
mars-paper-experiments/
├── mars-model.cjs        # 文档模型:MarsDigitalEntity + 3 视图组件 + 9 种视图操作 + 主从派生模式
├── statistics.cjs        # 均值/标准差、配对 t 检验(不完全 Beta 函数实现)
├── experiment1.cjs       # 实验一:视图操作独立性验证
├── experiment2.cjs       # 实验二:协同一致性基准测试(S2/S3/S4)
├── experiment3.cjs       # 实验三:格式平等 vs. 主从派生架构对比
├── experiment4.cjs       # 实验四:多表示 vs. 单一表示消融实验
├── experiment5.cjs       # 实验五(期刊实验三):增量同步 vs. 派生重建成本
├── runner.cjs            # CLI 入口:参数解析、CSV/JSON/Markdown 输出(含写前清理/写后校验)
├── calibration.json      # 模型量校准文件(网络 RTT/FPS/重建耗时),支持 measured/modeled 标注
└── results/              # 运行结果(自动生成)
```

## 快速开始

```bash
# 快速验证(每条件 5 轮)
node experiments/mars-paper-experiments/runner.cjs --exp all

# 论文正式配置(每条件 30 轮,每轮模拟 60s)
node experiments/mars-paper-experiments/runner.cjs --exp all --repeats 30 --duration-sec 60

# 单独运行某个实验
node experiments/mars-paper-experiments/runner.cjs --exp 1
node experiments/mars-paper-experiments/runner.cjs --exp 2 --scenes S2,S3,S4
node experiments/mars-paper-experiments/runner.cjs --exp 3 --ops 100
node experiments/mars-paper-experiments/runner.cjs --exp 4
node experiments/mars-paper-experiments/runner.cjs --exp 5 --repeats 30 --levels L1,L2,L3,L4,L5
```

完整参数见 `runner.cjs` 头部注释(`--seed` 保证可复现)。

## 实验与提示词对照

| 实验 | 提示词章节 | 验证内容 | 度量指标 |
|------|-----------|----------|----------|
| E1 | 五(5.2-5.4) | 视图操作独立性(原型实现的 3 视图 × 3 操作 = 9 种) | 隔离正确率、误污染率、响应时间(p50/p95)、反向隔离、并发隔离 |
| E2 | 六(6.2-6.5) | 共享属性(Transform)跨视图同步与可扩展性 | 收敛时间、收敛率、运行期/最终一致性误差、全量最终一致性、本地合并耗时、FPS、内存、带宽 |
| E3 | 七(7.2-7.4) | 格式平等 vs. 主从派生(MARS-MasterSlave 基线) | 成功率、成功/被拒绝响应时间、冲突数、重建批次、重建计算/Yjs写入耗时、等待时间 |
| E4 | 八(8.2-8.4) | 多表示 vs. 单一表示消融(完整 3 视图 vs. 仅 MeshView) | 同步延迟、本地合并耗时、内存、FPS、语义带宽差异百分比 |
| E5 | 期刊扩展(方案 B) | 增量同步 vs. 派生重建成本 | 重建耗时、重建数据量、重建 Yjs 写入耗时、编辑/编码/合并耗时、增量字节数 |

## 输出格式

- `E1-results.csv` ~ `E5-results.csv`:原始数据,遵循提示词 9.2 格式:
  `timestamp,experiment_id,scene_config,user_id,operation_type,target_view,response_time_ms,convergence_time_ms,success,error_type`
  (每实验追加专属列,如 round / condition / has_conflict / rebuild_count / entity_id / level / delta_bytes)
- `E1-summary.json` ~ `E5-summary.json`:每条件多轮重复的均值 ± 标准差;E3/E4 含配对 t 检验结果
- `params.json`:本次运行的完整参数(可复现)
- `paper-tables.md`:论文第 4 节可直接引用的表格(表 4-1 ~ 4-5)

## 模型与校准说明

代码在 Node 中模拟多客户端,以下部分为真实 Yjs 测量:本地操作延迟、增量更新编码/合并耗时、更新字节数、文档编码大小、状态收敛正确性(运行期空间一致性误差与最终一致性误差、全量最终状态向量一致性)、重建时的 Yjs 字段写入耗时。以下三个量为显式模型,全部收敛到 `calibration.json`,并用 `source` 字段标注(`modeled`/`measured`),写论文时需在"实验环境"中说明:

1. **网络延迟**:投递时间 = 操作虚拟时刻 + RTT/2(单向),不包含真实网络栈。收敛时间 = 所有副本收到并合并该操作增量的最晚时刻 - 操作时刻;
2. **渲染帧率(FPS)**:`estimateFps` 经验模型,`帧耗时 = 4ms + 实体数×(0.02 + 0.015×视图数) + 每帧平均 CRDT 合并耗时`,上限 60 FPS。合并耗时按模拟窗口内的实际总合并时间折算。若原型中已实测 FPS,把数值填入 `calibration.json` 的 `fps` 字段并改 `source` 为 `measured` 即可;
3. **主从派生重建计算耗时**:旧版实验三使用 `calibration.json` 的 `rebuildMs`(体素 280ms、点云 110ms)作为经验估计;新增实验五(期刊方案 B)不再使用校准常数,而是通过真实几何计算(体素化 + 点云采样)测量重建耗时与重建数据量。

## 同步与并发模型

- **初始同步**:leader 客户端确定性生成场景,完整文档编码一次后应用到所有副本(与 y-websocket 初始同步等价)。各副本持有 leader 的客户端 ID 条目,后续增量更新中的父引用可正确解析;
- **增量更新**:每个操作在本地执行后,以操作前的状态向量编码一次增量更新,再投递给所有其他副本(模拟服务端广播)。每个增量只含该操作的变更,与真实 Yjs 增量同步一致;
- **并发冲突**:实验三每轮包含顺序混合负载 + 真并发冲突阶段。真并发阶段每对两个客户端从统一基线文档出发、不交换增量并发写同一实体 MeshView。MARS 模式下双方交换增量后由 CRDT 消解(双方成功且最终状态一致,冲突数记 0);主从派生模式下并发写主表示按规则 4 记为丢失更新(后写者失败)。

## 统计方法

- 每个实验条件重复 30 轮(默认 5 轮便于快速验证),报告均值 ± 标准差;
- E3(两种架构)与 E4(两种配置)按轮次配对,使用配对 t 检验(`statistics.cjs`),p < 0.05 标记为显著。

## 注意事项

- 实验仅使用原型实际实现的 3 种视图(MeshView/VoxelView/CloudPointView);提示词场景定义中的 S3/S4"每实体 6 视图"按实际可用视图数(3)配置;
- 实验一默认在 S2 场景参数(50 实体/5 用户/RTT 100ms)下执行,挂载全部 3 种视图;包含三个阶段:视图操作隔离(含跨实体检查)、反向隔离(共享属性 Transform 修改不污染视图)、并发隔离(每对从统一基线新建两客户端并发编辑不同视图);
- 实验二默认模拟时长 10s、每用户 2 ops/s(论文建议 60s,操作频率按 6.2 参数表调整 `--op-hz`);
- 实验四的带宽对比采用语义字节(仅变更字段值),避免 Yjs item clock varint 与 delete-set 编码差异造成的假象;原始 Yjs 带宽仍保留在 E2 表格中;
- 结果中 `convergence_time_ms` 对实验一/三含单向延迟模型,对实验二为虚拟时钟下的投递完成时间 + 真实合并耗时;
- 运行前请关闭占用 `results/` 中 CSV 的 Excel/编辑器,否则 `runner.cjs` 会直接报错退出(写前清理 + 写后校验,避免 fallback 文件造成新旧数据混用)。
