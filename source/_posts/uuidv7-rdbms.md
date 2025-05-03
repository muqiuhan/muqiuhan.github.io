---
title: UUID v7 是如何加快 RDBMS 索引速度的
date: 2025-04-13 18:39:31
tags: Technique
---

UUID v7 之所以能显著提升关系型数据库（尤其是采用聚集索引的 MySQL InnoDB）在插入和查询速度，主要归功于它在 ID 中引入了“可排序的时间戳前缀”，从而大幅减少了 B-Tree 索引页分裂（page split）和数据碎片化。这里分几点来说：

一、 聚集索引（Clustered Index）的插入机制  

在 InnoDB 中，聚集索引的叶子节点同时存储了行数据，且按照索引键（主键）顺序物理排序。

当新记录的主键完全随机（如 UUID v4）时，每次插入都会随机落在 B-Tree 的不同叶子页，导致频繁的页分裂和指针重排，而页分裂和随机 I/O 会带来大量的磁盘写放大和缓存抖动（cache churn），削弱吞吐并拉高延迟。

二、UUID v7 的时间排序特性  

UUID v7 在高位（前 48 位）嵌入了以毫秒级精度的 Unix 时间戳，剩下的位用于随机数或序列号，这样生成的 ID 保持全局唯一性的同时，随着时间自然递增（即“近似单调递增”），新插入的记录几乎总是追加到 B-Tree 的最右端叶子节点。  

参见 dbaplus.cn 的分析：  
> “UUID v7 的创新之处在于其时间排序特性，它在前 48 位中嵌入了以毫秒为单位的 Unix 时间戳……可能在插入和查询操作上提供更好的性能”【1】。

三、降低页分裂与碎片化  

顺序或近似顺序的主键能使叶子节点连续增长，极少触发页分裂，并且更少的页分裂意味着更低的写放大（write amplification）和更稳定的插入延迟，同时，减少了空洞和链表重排，提高了磁盘和内存缓存的命中率。

四、提升查询局部性与缓存命中  

因为数据物理上是按时间顺序紧凑写入，时间范围查询（如 “最近 1 小时的日志”）可以快速定位连续的叶子页，I/O 更聚集，内存缓冲池（buffer pool）或操作系统页缓存能更有效地缓存最近热数据，进一步加速查询。

---

Rimon Tawadrous 在其 GitHub repo 中的测试，对比 100 万条逐条插入实验，UUID v7 相较 UUID v4 在单线程插入上速度快约 3.24%，多线程下更可观【1】。  

---

**参考链接**  
[1] “为什么 UUID 7 比 UUID 4 更适合作为 RDBMS 的聚集索引？” dbaplus.cn  
    https://dbaplus.cn/news-160-6313-1.html  
[2] “PostgreSQL and UUID as primary key” maciejwalkowiak
	https://maciejwalkowiak.com/blog/postgres-uuid-primary-key/
[3] “Optimised UUIDs in mysql” stitcher
	https://stitcher.io/blog/optimised-uuids-in-mysql
[3] “Storing UUID Values in MySQL” percona
	https://www.percona.com/blog/store-uuid-optimized-way/