---
title: 'WiscKey: Separating Keys from Values in SSD-conscious Storage'
date: 2023-07-21 14:59:06
tags: [Technique, Database]
---

We present WiscKey, a persistent LSM-tree-based key-value store with a performance-oriented data layoutthat separates keys from values to minimize I/O amplifi-cation. The design of WiscKey is highly SSD optimized, leveraging both the sequential and random performance characteristics of the device.

- [原始论文](/papers/WiscKey:%20Separating%20Keys%20from%20Values%20in%20SSD-conscious%20Storage.pdf)

WiscKey是一种基于LSM-Tree的kv存储，它的实现很简单： 将键和值分开存储， 这么做可以显著的减少I/O放大。

WiscKey的设计是针对SSD优化的，充分利用了SSD的性能并提出了一种轻量的GC方案， 除此之外还分析了现代存储硬件的特性和LSM树的读写放大的问题。

总的来说，WiscKey是基于SSD硬件特性而重新设计的存储结构。虽然LevelDB也是一种键值存储引擎，但它并没有像WiscKey那样专门为SSD硬件而设计。因此，如果将LevelDB的存储结构按照SSD硬件的特性进行优化，可能会提高一些性能，但是不一定能够达到WiscKey的性能水平。

## 笔记

- The main data structures in LevelDB are an on-disk log file, two in-memory sorted skiplists (memtableand immutable memtable), and seven levels (L0 to L6) of on-disk Sorted String Table (SSTable) files
    > LSM-trees的内部的各种组件可以使用任意索引结构来实现。通常内存组件会使用skiplist或B+树等并发数据结构，而磁盘组件会使用B+树或SSTables（SSTable包含一个数据块列表和一个索引块：数据块存储按键排序的键值对，索引块存储所有数据块的键范围）

- how LSM-trees maintainsequential I/O access by increasing I/O amplification.
    > 具体来说，LSM-trees的写放大是指每次写入操作都需要将数据追加到写前日志中，并加入到内存组件C0中。当C0的大小达到一定阈值时，C0会与磁盘上的C1进行归并排序操作，生成新的组件new-C1，并将其顺序写入磁盘，取代旧版本的C1。类似地，当C1的大小达到一定阈值时，C1会与下一层组件Ci+1合并。这种归并排序的过程可以保证数据在磁盘上的存储是有序的，从而保持顺序I/O访问

- First, WiscKey separates keys from values, keeping only keys in theLSM-tree and the values in a separate log file. Second,to deal with unsorted values (which necessitate random access during range queries), WiscKey uses the parallel random-read characteristic of SSD devices. Third, WiscKey utilizes unique crash-consistency and garbage-collection techniques to efficiently manage the value log.Finally, WiscKey optimizes performance by removingthe LSM-tree log without sacrificing consistency, thusreducing system-call overhead from small writes.
    > 这是WiscKey的主要优化方式

- For range queries, LevelDB provides the user with an iterator-based interface with Seek(key), Next(), Prev(),Key() and Value() operations. To scan a range of key-value pairs, users can first Seek() to the starting key, then call Next() or Prev() to search keys one by one. To retrieve the key or the value of the current iterator position, users call Key() or Value(), respectively.
    > 如果要查询某个key范围的数据，LevelDB会先找到该范围的起始key在哪个SSTable中，然后按照顺序读取该SSTable中的数据，直到读取到范围之外的key为止。
    > 
    > 而读取SSTable中的数据是通过Binary Search来实现的。为了加速Search，LevelDB为每个SSTable建立了一个稀疏索引，用来记录每个数据块的最大key和最小key。    