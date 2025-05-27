---
title: 多人协作系统中的实现策略 (CRDT，锁等实现方案）
date: 2025-05-08 18:45:37
tags: [Technique]
---

最近碰到一块业务：在系统中可以存在多个用户同时对某个项目信息进行编辑，这种多人协作的场景挺有意思的，不过在我们的业务中，并不需要实时协作，只需要保证不会出错就行，话虽如此，但也可以探索一下实时协作的实现方案，防止老年痴呆。

先来看看第一个方案 —— CRDT（Conflict-free Replicated Data Type，无冲突可复制数据类型）是一类数据结构，它保证了在分布式节点（或多客户端）上进行离线/并发更新后，无需中心协调、也无需人工干预，通过“合并策略”就能得到一致的最终状态。  

核心思想是：所有并发操作都是幂等（idempotent）、可交换（commutative）的。

常见类型有：  
一、G-Counter（只能增计数器）  
二、PN-Counter（可增可减计数器）  
三、LWW-Register（最后写入胜出）  
四、结合 JSON 的树型 CRDT（如 [Automerge](https://github.com/automerge/automerge) / [Yjs](https://yjs.dev/)）  

更多原理可参考 Decipad 博客“Collaborative and Offline Editing Using CRDTs”[^1]。

> 有一个挺有趣的 Rust 项目 [Loro: Make your JSON data collaborative and version-controlled with CRDTs](https://github.com/loro-dev/loro)

假设我的项目信息编辑页面允许多人实时/离线修改某个研究项目的“名称”、“描述”字段，前端用 SvelteKit + GraphQL 获取和提交变更：

```
   ┌── 用户 A 离线修改了 “description” 的若干段文本  
   └── 用户 B 同时在线修改了同一字段的其他段落  
```

如果后端使用 CRDT（比如把 `description` 用 JSON-CRDT 存储），两次修改只要在任意顺序合并都能得到完整的内容：
   
首先，A 客户端本地 apply 操作并缓存，恢复网络后推给服务器；  
然后，服务器用 CRDT merge(A.delta, B.delta)，得到一致文档  
最后，服务器广播新文档到所有客户端，A/B 均得到相同结果  

---

好了说点实际符合业务场景的方案，首先想到的是悲观锁（Pessimistic Locking） ，思路是：用户打开编辑界面时，向后端申请“锁” → 其它用户尝试编辑时被拒绝 → 编辑完成后释放锁/超时自动释放。 

假如有一个这样的锁表：
```sql
CREATE TABLE project_lock (
    project_id UUID PRIMARY KEY,
    locked_by  UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
```  
     
可以在事务内申请它：
```ts
const now = new Date();
const expires = new Date(now.getTime() + 5*60*1000); // 5 分钟后过期
await prisma.$transaction(async tx => {
    const existing = await tx.project_lock.findUnique({ where:{ project_id } });
        
    if (existing && existing.expires_at > now) {
	    throw new Error('项目正被人编辑');
	}
        
    await tx.project_lock.upsert({
        where: { project_id },
        update: { locked_by: userId, expires_at: expires },
        create: { project_id, locked_by: userId, expires_at: expires }
    });
});
```  

释放锁就直接从锁表里删掉对应的数据即可：
```ts
await prisma.project_lock.delete({ where:{ project_id } });
```  

前端的话，大概就是：

在进入编辑前请求一下 `/api/project/:id/lock` 之类的 API，失败则提示“被占用”；  
在 `onbeforeunload` 时执行 `/unlock`；  
超时后后端自动允许新锁。  

---

第二个方案是乐观并发控制（Optimistic Concurrency） ：记录资源的版本号或时间戳；客户端提交更新时带上自己的版本号，后端检查版本是否一致，不一致则认为冲突，返回 409，由客户端告知用户“数据已过期，请刷新后合并”。  

具体实现中，可以尝试在 `project` 表加上 `version INT NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ` ，然后更新项目时：
```ts
async updateProject(parent, { id, version, input }, ctx) {
    const result = await prisma.$executeRaw`
    UPDATE project
        SET name        = ${input.name},
            description = ${input.description},
            version     = version + 1,
            updated_at  = now()
    WHERE id = ${id} AND version = ${version}
	`;
    if (result === 0) {
	    throw new ConflictException('版本冲突，请刷新后重试');
    }
    return prisma.project.findUnique({ where:{ id } });
}
```  

前端捕获到冲突错误可以用一个弹窗提示“另有用户已更新此项目，是否合并/重新加载？”  之类的玩意儿。

---

第三个方案是：操作转化（Operational Transformation，OT）  

也就是记录用户每次的“操作”（insert/delete at position），服务器根据历史操作序列对并发操作做转化（transform），确保先到达的操作调整后再应用后到达的。  

有一些实现案例：
一、ShareDB（Node.js）  
二、Google Docs 中的同步算法  

具体实现的话，可能要现在前端逐字符/块地包装成操作并 WebSocket 推送，服务器再维护一个“操作历史队列”，每来一个 op 就 transform 并 broadcast，而客户端收到广播后，按顺序 replay 保证视图一致。

---

最后可能还可以用事件溯源（Event Sourcing）+ 场景命令模式来实现：

不直接存状态，而是存所有“命令 / 事件”（Event），回放事件得到当前状态。冲突通过合并策略或补偿事件（Compensating Events）解决。  

例如：
在每次更新时推送 `ProjectUpdated { projectId, fieldsChanged, userId, timestamp }`  ，
然后写入事件存储（如 Kafka / EventStoreDB），  
读端 Consumer 按顺序重建最新状态或按领域聚合  ，
最后在并发时如果两个事件都修改了同一字段，可在写端做校验/补偿，或在读端做最后写入胜出等策略 。

---

总结来说，
- CRDT 最擅长 去中心化、离线编辑、自动合并；  
- 若不引入 CRDT，可根据业务侧重点选用：  
  1) 悲观锁 → 强制串行编辑，简单粗暴；  
  2) 乐观并发 → 适合大多数业务场景，成本低；  
  3) OT → 适合富文本或实时协同场景，复杂度中等；  
  4) 事件溯源 → 适合需要全历史审计、可回放的场景。  

---

[^1]: Decipad 博客 “Collaborative and Offline Editing Using CRDTs”  
     https://www.decipad.com/blog/decipads-innovative-method-collaborative-and-offline-editing-using-crdts

[^2]: Hacker News 讨论（CRDT 相关线程）  
     https://news.ycombinator.com/item?id=38289327
