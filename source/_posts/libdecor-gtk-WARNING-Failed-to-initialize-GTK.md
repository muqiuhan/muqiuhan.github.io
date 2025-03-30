---
title: 'libdecor-gtk-WARNING: Failed to initialize GTK' in VSCode on Wayland
date: 2025-03-30 17:51:15
tags: [Technique]
---

在 Wayland 上的 VSCode 中使用 `libdecor-gtk` 时，可能会遇到以下警告：

```bash
libdecor-gtk-WARNING: Failed to initialize GTK
```

这是因为 VSCode 默认使用 X11，可以使用以下参数启动 VSCode：

```bash
code --enable-features=UseOzonePlatform --ozone-platform=wayland
```
