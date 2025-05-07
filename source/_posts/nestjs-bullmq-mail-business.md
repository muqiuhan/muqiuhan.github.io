---
title: NestJS bullmq 邮件发送业务中的小 tips
date: 2025-05-07 09:36:00
tags: [Technique]
---

在 BullMQ（以及它在 NestJS 里包装的 `@Processor`/`WorkerHost`）里，整个生命周期大致是这样的：

1. 队列（在 NestJS 里由 `@Processor` 装饰的类）会被一个底层的 `Worker` 订阅。  
2. 有新任务（job）进来时，Worker 会调用写在该类里的 `async process(job: Job)` 方法。  
3. 如果 `process()` 正常返回（即没有抛异常），Job 就被标记为 **completed**，然后才会去触发所有注册了 `@OnWorkerEvent('completed')` 的回调。  

也就是说：

- **`process`**：是真正“干活”的地方，收到 job 之后立刻被调用，任何主业务逻辑（发邮件／写数据库／第三方请求等）都应该放这里。  
- **`onCompleted`**：只是一个事件监听器，**在 job 已经成功完成之后** 才会被触发，不会影响 job 的重试逻辑（也就是说，在这里抛错，job 已经算完成了，也不会重试）。

而我在此处的业务目的是 “用队列来做可靠的、可重试的邮件发送”，那么**一定要把发送邮件的逻辑写到 `process()` 里**，这样在 `commandBus.execute(new SendMailCommand(...))` 抛错时，BullMQ 会根据创建 JOB 时的重试策略（retry、backoff 等）自动重新入队。而把它放到 `onCompleted()`，只相当于 job 成功完成后的“事后通知”，一旦失败不会再重试，也无法利用 BullMQ 的锁、超时、重试机制。

举个最简化的调整示例，删掉 `onCompleted`，把真正的发信放到 `process`：  

```typescript:path=apps/gcpm-backend/src/modules/mailer/infrastructure/bullmq-mailer.adapter.ts
// ... existing imports ...

@Processor(process.env.MAILER_QUEUE_NAME || "gcpm-mailer")
export class BullMQMailerProcesser extends WorkerHost {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly logger: LoggingService,
  ) {
    super();
  }

  // ① 当有新 job 拉取到时，这个方法会被调用
  public async process(job: Job): Promise<void> {
    const mailAggregate = new Mail(job.data.mail);
    try {
      await this.commandBus.execute(new SendMailCommand(mailAggregate));
    } catch (err) {
      this.logger.error(`邮件发送失败，jobId=${job.id}`, err);
      // 抛出错误，触发重试或失败
      throw err;
    }
  }

  // ② onCompleted 仅在 process() 正常返回后触发，
  //    不建议在这里执行核心业务（也无法触发重试）。
  // @OnWorkerEvent("completed")
  // async onCompleted(job: Job) { … }
}
```

参考 BullMQ 官方文档：

- “Workers → Sandboxed processors”：Worker 拉到 job 就调用注册的处理函数，然后根据返回/抛错把 job 标记成 completed 或 failed。  
- “Events → OnJobCompleted”：completed 事件只是一个监听钩子，不会参与重试。  

---

而 **重试次数本身并没有一个硬性上限**，完全由添加 Job 时通过 `attempts` 这个选项来控制：

- 默认情况下，如果不传 `attempts`（或不在 `defaultJobOptions` 里配置），Job **不会自动重试**（相当于 `attempts = 0`）。  
- 如果在 `queue.add()`（或全局 `defaultJobOptions`）里设置了 `attempts: N`，那么 BullMQ 最多会让该 Job 运行 N 次（也就是初始执行 + N−1 次重试，或者根据文档含义最多触发 N 次失败） ，失败后才算真正移入失败集合。  
- `attempts` 可以是任意的正整数（受 JavaScript `Number` 范围限制），BullMQ 本身不会再做额外的上限检查。

示例（给某封邮件最多重试 3 次）：

```ts
await this.mailerQueue.add(
  id,
  { mail: new Mail(/*…*/ ) },
  {
    attempts: 3,                  // 最多尝试 3 次
    backoff: {                    // 重试时的延迟策略（可选）
      type: 'exponential',
      delay: 1000,
    },
  },
);
```

---

还有一个需要注意的地方，在我的业务中，邮件发送的是一种时间区间报告，这个报告包含了过去二十四小时的一些系统中的事件，但如果重试有延迟策略或重试本身就有计算成本的话，这封邮件就不是 “过去二十四小时” 的了，因为重试带来了一个真空期。

换言之，这个问题本质上是——**重试导致「发送时刻」与「原始 24 小时窗口」错开**，从而让邮件里报出来的数据不再精确。常见的解决思路就是：**把「窗口定义」或者「报表内容」在调度时就固化下来，真正的队列任务只负责发送**，而不再实时去重新计算时间区间。

我想到了两种解决方案：

一、任务参数里带上「时间区间」  
   在 enqueue 的时候，就算出 windowStart/windowEnd，然后把它放到 `job.data` 里。无论后面 `process` 什么时候真正跑，都是基于同一个时间区间去查询：
   
   ```ts
   // 调度时
   const now = new Date();
   const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
   await this.mailerQueue.add(
     id,
     {
       mail: new Mail({
         ...options,
         id,
         sentAt: now,
         status: MailStatus.PENDING,
         windowStart,
         windowEnd: now,
       }),
     },
     {
       attempts: 3,
       backoff: { type: 'exponential', delay: 1000 },
     },
   );

   // process 里
   public async process(job: Job) {
     const { windowStart, windowEnd } = job.data.mail;
     // ① 只查询 [windowStart, windowEnd] 的事件
     const events = await this.reportService.findEvents(windowStart, windowEnd);
     const reportHtml = await this.reportService.renderReport(events);
     await this.commandBus.execute(new SendMailCommand(job.data.mail, reportHtml));
   }
   ```
   
   ➜ 这样无是马上执行还是几次重试后才执行，数据规则都不会变。

二、预先生成「静态报表内容」，挂到队列里  
   如果计算成本很高，或者怕重复查询数据开销大，也可以在调度时就把最终的 HTML/Text/附件 都先打好，然后作为 `job.data` 传进去，真正的 `process()` 只做一次“发送”即可：
   ```ts
   // 调度时：先生成报告
   const now = new Date();
   const windowStart = new Date(now.getTime() - 24*3600*1000);
   const events = await this.reportService.findEvents(windowStart, now);
   const reportHtml = await this.reportService.renderReport(events);

   // 把静态内容塞到队列
   await this.mailerQueue.add(
     id,
     {
       mail: new Mail({ /*…*/, windowStart, windowEnd: now }),
       reportHtml,       // <- 预渲染好的文本／HTML
       attachments: […], // <- 如果有附件也一并塞
     },
     { attempts: 3, backoff: { type: 'fixed', delay: 5_000 } },
   );

   // process 里只关注发送
   public async process(job: Job) {
     try {
       await this.mailService.send({
         to: job.data.mail.to,
         subject: `系统 24h 报表`,
         html: job.data.reportHtml,
         attachments: job.data.attachments,
       });
     } catch (e) {
       throw e; // 触发重试
     }
   }
   ```
   ➜ 重试带来的任何延迟，都不影响邮件正文，始终是一份「事先约定好、并且静态化」的报告。

这两种模式都能保证**最终发送时的数据窗口**或**内容**，与当初调度时的预期完全一致，不会因为重试延迟而出现“数据真空”或“多算/少算”问题。


## 参考文档：

- “Retrying failing jobs” · BullMQ Guide  
https://docs.bullmq.io/guide/retrying-failing-jobs
- BullMQ Guide & Patterns · Process Step Jobs (completed event only fires after process resolves)  
  https://docs.bullmq.io/patterns/process-step-jobs
