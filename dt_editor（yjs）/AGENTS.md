# DT-Editor Agent Rules

## 项目概览

Vue 2 + Three.js + Yjs (CRDT) 的实时协同 3D 建模编辑器。核心逻辑位于 `src/utils/ecs/`（自定义 ECS 架构）与 `src/pages/modeling/index.vue`（主编辑器 UI）。同步层基于 Yjs 的 LWW-Register / LWW-Set，传输走 y-websocket。领域术语（MARS、LWW-Register、ActiveView、PhygitalSync 等）详见根目录 `README.md`。

## Skills

项目按需引入外部 agent skills，存放在 `.agents/skills/` 目录下，遇到对应场景时必须按对应 SKILL.md 的流程执行：

### diagnosing-bugs（调试）

当用户报告 bug、崩溃、报错、性能下降，或要求"排查/调试"时，先阅读 `.agents/skills/diagnosing-bugs/SKILL.md` 并严格按其流程执行。

核心纪律（摘自该 skill）：

1. **Phase 1 构建反馈回路是最重要的一步** —— 先建立能稳定复现 bug 的自动化脚本/测试（curl、puppeteer、最小复现），再谈假设。没有能复现 bug 的命令，不进入假设阶段。
2. **Phase 3 假设要可证伪** —— 一次提出 3-5 个排序假设，且每个假设必须能预测"改什么会让 bug 消失"。
3. **Phase 4 插桩打日志必须带唯一前缀**（如 `[DEBUG-a4f2]`），修复后统一 grep 清理。
4. **Phase 5 修复前先写回归测试**（如果有正确的测试接缝）。
5. 本项目多客户端协同 bug（时序、并发合并、网络重连）优先按此流程处理；`experiments/mars-sync-benchmark/` 下有可复用的 benchmark 与 adapter，可作为复现基座。

### grill-with-docs（需求拷问 + 领域建模）

当用户开始规划一个新功能/改动、想厘清设计或需求，或主动说"grill"时，先阅读 `.agents/skills/grill-with-docs/SKILL.md` 并按其流程执行（它依赖 `.agents/skills/grilling/SKILL.md` 与 `.agents/skills/domain-modeling/SKILL.md`，一起读取）。

核心纪律（摘自该 skill 族）：

1. **grilling** —— 把设计画成一棵"设计树"，每轮把当前可问的全部问题（编号 + 推荐答案）一次抛出，等用户答完再算下一轮 frontier；事实类问题自己查，决策类问题必须问用户。
2. **domain-modeling** —— 术语一经确认立即写入根目录 `CONTEXT.md`（格式见 `.agents/skills/domain-modeling/CONTEXT-FORMAT.md`），不攒批；`CONTEXT.md` 只放词汇表，不放实现细节。
3. **ADR 只在该写时才写**（难回退 + 无上下文会看不懂 + 有真实取舍，三者齐备），格式见 `.agents/skills/domain-modeling/ADR-FORMAT.md`，存到 `docs/adr/`。
4. 本项目术语（MARS、LWW-Register/LWW-Set、ActiveView、PhygitalSync、ECSWorld 等）应作为首批澄清对象，与 `README.md` 交叉核对，发现矛盾当场指出。

## 通用约定

- 修改代码前先读相关文件，遵循项目现有模式（ESM/CommonJS 混用、无 TypeScript）。
- 不引入本项目未使用的依赖。
- 领域术语以 `README.md` 中的 MARS 术语为准。
