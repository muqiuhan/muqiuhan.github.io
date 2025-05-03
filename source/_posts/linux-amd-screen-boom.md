---
title: Linux 下 AMD 显卡屏幕画面闪烁问题修复方案
date: 2025-04-20 18:39:31
tags: Technique
---

不知道我们所说的闪烁是不是一个东西，在我的笔记本上，闪烁是指偶发的屏幕中出现部分彩色雪花。

我使用 Pop!\_OS，此发行版使用 EFI 启动，故而可以在 `/boot/efi/loader/loader.conf` 中加上:

```
options quiet splash amdgpu.dcdebugmask=0x10 amdgpu.sg_display=0
```

对于其他使用 EFI 或 GRUB 启动的发行版也可以添加类似的参数尝试尝试。