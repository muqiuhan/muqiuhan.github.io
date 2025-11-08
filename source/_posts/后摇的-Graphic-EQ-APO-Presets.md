---
title: 后摇的 Graphic EQ APO Presets
date: 2025-11-08 23:13:10
tags: [Life]
---

常见的后摇的核心特点：宏大的空间感、宽广的动态范围、清晰的乐器分离度以及从平静氛围到爆裂音墙的平滑过渡。

这里的核心在于**氛围** 和 **动态**。因此，我们的 EQ 调整目标不是简单地“增强”某些频段，而是**塑造一个更深、更广的声场**，并确保在最安静的段落和最爆裂的高潮部分，各个乐器都不会混乱不清。

首先，**降低前级放大 (Preamp)**：由于我们会在多个频段上进行增益（Gain），为了防止数字削波（Clipping）导致声音失真，必须首先降低总音量，为EQ调整留出足够的“净空区”（Headroom）。这是最重要的一步。

然后 **塑造“微笑曲线” (A "Smiley Face" Curve)**：这是一种经典的摇滚乐EQ设置。我们会轻微提升低频和高频，同时略微衰减中频。

再增强贝斯和底鼓的下潜和力量感，为音乐构建坚实、宏大的基底，尤其在音墙爆发时，能感受到扑面而来的能量。

对于我来说，**衰减中频** 可以给吉他、贝斯和鼓的核心频段创造更多空间，避免在乐器叠加时声音变得“拥挤”或“浑浊”。并且轻微的中频衰减可以让声场听起来更宽阔，乐器分离度更高。如果在此基础上 **提升高频** ，还可以进一步突出吉他的延时/混响效果（那种“闪亮”的音色）、鼓的镲片以及整体的“空气感”。

---

所以具体到参数：

**Preamp: -4.5 dB**

*   防止削波失真的关键。我们总共增加了约 4dB 的增益，因此降低 4.5dB 的前级放大可以确保绝对安全。

**Filter 1: ON PK Fc 22.4 Hz Gain 1.2 dB Q 4.36**
**Filter 2: ON PK Fc 27.8 Hz Gain 1.8 dB Q 4.36**
**Filter 3: ON PK Fc 34.51 Hz Gain 2.5 dB Q 4.36**
**Filter 4: ON PK Fc 42.82 Hz Gain 3.2 dB Q 4.36**
**Filter 5: ON PK Fc 53.14 Hz Gain 3.8 dB Q 4.36**
**Filter 6: ON PK Fc 65.95 Hz Gain 4.0 dB Q 4.36**

*   平滑地增强次低音和低音区域。这会给音乐带来一种“地动山摇”的基底，让底鼓的每一次敲击和贝斯的根音都充满重量感，但又不会过分轰头。

**Filter 7: ON PK Fc 81.83 Hz Gain 3.5 dB Q 4.36**
**Filter 8: ON PK Fc 101.55 Hz Gain 2.8 dB Q 4.36**
**Filter 9: ON PK Fc 126 Hz Gain 1.5 dB Q 4.36**

*   从低频的峰值（66Hz）开始平缓下降，这个区域是贝斯“肉感”和鼓声冲击力的核心，我们给予了足够的强调。

**Filter 10: ON PK Fc 156.38 Hz Gain 0.5 dB Q 4.36**
**Filter 11: ON PK Fc 194.06 Hz Gain -0.5 dB Q 4.36**
**Filter 12: ON PK Fc 240.81 Hz Gain -1.5 dB Q 4.36**
**Filter 13: ON PK Fc 298.834 Hz Gain -2.0 dB Q 4.36**

*   进入中低频区域。我们开始进行衰减，这个频段（尤其是200-300Hz）是造成声音“浑浊”、“发闷”的罪魁祸首。这里的衰减可以立刻让声音变得干净清晰。

**Filter 14: ON PK Fc 370.834 Hz Gain -2.5 dB Q 4.36**
**Filter 15: ON PK Fc 460.182 Hz Gain -2.8 dB Q 4.36**
**Filter 16: ON PK Fc 571.057 Hz Gain -2.5 dB Q 4.36**
**Filter 17: ON PK Fc 708.647 Hz Gain -2.0 dB Q 4.36**
**Filter 18: ON PK Fc 879.387 Hz Gain -1.5 dB Q 4.36**

*  这是中频的核心凹陷区域。这个范围的衰减可以有效地拉开声场，让左右声道的吉他听起来更宽，避免在音墙爆发时所有乐器糊在一起。

**Filter 19: ON PK Fc 1091.26 Hz Gain -0.5 dB Q 4.36**
**Filter 20: ON PK Fc 1354.19 Hz Gain 0 dB Q 4.36**
**Filter 21: ON PK Fc 1680.47 Hz Gain 0.5 dB Q 4.36**

*   平滑地从中频凹陷过渡回0dB，准备进入高频提升区域。

**Filter 22: ON PK Fc 2085.35 Hz Gain 1.0 dB Q 4.36**
**Filter 23: ON PK Fc 2587.79 Hz Gain 1.5 dB Q 4.36**
**Filter 24: ON PK Fc 3211.29 Hz Gain 2.0 dB Q 4.36**

*   中高频区域，这里是军鼓的“脆度”和吉他拨弦“清晰度”的关键。轻微提升可以增加音乐的“临场感”和攻击性，但不能过多，否则会刺耳。

**Filter 25: ON PK Fc 3985.01 Hz Gain 2.5 dB Q 4.36**
**Filter 26: ON PK Fc 4945.15 Hz Gain 3.0 dB Q 4.36**
**Filter 27: ON PK Fc 6136.63 Hz Gain 3.5 dB Q 4.36**
**Filter 28: ON PK Fc 7615.17 Hz Gain 3.8 dB Q 4.36**

*   高频区域。这里的提升是为了让镲片的声音更清晰、空灵，并带出吉他混响和延迟效果中的“闪光点”（Shimmer），极大地增强了空间感和氛围感。

**Filter 29: ON PK Fc 9449.96 Hz Gain 3.5 dB Q 4.36**
**Filter 30: ON PK Fc 11726.8 Hz Gain 3.0 dB Q 4.36**
**Filter 31: ON PK Fc 14552.2 Hz Gain 2.5 dB Q 4.36**
**Filter 32: ON PK Fc 18058.4 Hz Gain 2.0 dB Q 4.36**

*   极高频（“空气感”频段）。从高频峰值平缓回落，在增加“空气感”和开阔度的同时，避免声音变得过于“尖锐”或产生不必要的嘶声。

---

如果想实现另一种“浑厚浓重，有力的鼓点”的听感的话，就需要重点加强低频和中低频区域，同时对中频进行适当的削减以避免浑浊，并对高频进行微调以保持清晰度而不至于刺耳，在上面的基础上，使用如下配置：


```
Preamp: -5.0 dB
Filter 1: ON PK Fc 22.4 Hz Gain 1.5 dB Q 4.36
Filter 2: ON PK Fc 27.8 Hz Gain 2.5 dB Q 4.36
Filter 3: ON PK Fc 34.51 Hz Gain 3.5 dB Q 4.36
Filter 4: ON PK Fc 42.82 Hz Gain 4.5 dB Q 4.36
Filter 5: ON PK Fc 53.14 Hz Gain 5.0 dB Q 4.36
Filter 6: ON PK Fc 65.95 Hz Gain 5.5 dB Q 4.36
Filter 7: ON PK Fc 81.83 Hz Gain 5.0 dB Q 4.36
Filter 8: ON PK Fc 101.55 Hz Gain 4.5 dB Q 4.36
Filter 9: ON PK Fc 126 Hz Gain 4.0 dB Q 4.36
Filter 10: ON PK Fc 156.38 Hz Gain 3.0 dB Q 4.36
Filter 11: ON PK Fc 194.06 Hz Gain 2.0 dB Q 4.36
Filter 12: ON PK Fc 240.81 Hz Gain 1.0 dB Q 4.36
Filter 13: ON PK Fc 298.834 Hz Gain 0.0 dB Q 4.36
Filter 14: ON PK Fc 370.834 Hz Gain -1.0 dB Q 4.36
Filter 15: ON PK Fc 460.182 Hz Gain -2.0 dB Q 4.36
Filter 16: ON PK Fc 571.057 Hz Gain -2.5 dB Q 4.36
Filter 17: ON PK Fc 708.647 Hz Gain -2.0 dB Q 4.36
Filter 18: ON PK Fc 879.387 Hz Gain -1.5 dB Q 4.36
Filter 19: ON PK Fc 1091.26 Hz Gain -1.0 dB Q 4.36
Filter 20: ON PK Fc 1354.19 Hz Gain -0.5 dB Q 4.36
Filter 21: ON PK Fc 1680.47 Hz Gain 0.0 dB Q 4.36
Filter 22: ON PK Fc 2085.35 Hz Gain 0.5 dB Q 4.36
Filter 23: ON PK Fc 2587.79 Hz Gain 1.0 dB Q 4.36
Filter 24: ON PK Fc 3211.29 Hz Gain 1.5 dB Q 4.36
Filter 25: ON PK Fc 3985.01 Hz Gain 1.5 dB Q 4.36
Filter 26: ON PK Fc 4945.15 Hz Gain 1.0 dB Q 4.36
Filter 27: ON PK Fc 6136.63 Hz Gain 0.5 dB Q 4.36
Filter 28: ON PK Fc 7615.17 Hz Gain 0.0 dB Q 4.36
Filter 29: ON PK Fc 9449.96 Hz Gain 0.0 dB Q 4.36
Filter 30: ON PK Fc 11726.8 Hz Gain 0.0 dB Q 4.36
Filter 31: ON PK Fc 14552.2 Hz Gain 0.0 dB Q 4.36
Filter 32: ON PK Fc 18058.4 Hz Gain 0.0 dB Q 4.36
```

**Preamp: -5.0 dB** 防止在大量低频增益下产生数字削波，将前级放大降低至-5.0 dB，这为整体音量提供足够的“净空区”，再进行 **低频增强 (22.4 Hz - 126 Hz, Filter 1-9)** ，对 20 Hz 到 120 Hz 的频段进行了大幅度的提升，尤其是在 50-80 Hz 左右达到峰值，这会显著增强底鼓的“下潜”和“力量感”，让每一次鼓点都充满重量和冲击力。

对于军鼓和通鼓，适度的 **中低频增强 (156.38 Hz - 240.81 Hz, Filter 10-12)** 可以使鼓点听起来更饱满，再进行 **中频削减 (370.834 Hz - 1354.19 Hz, Filter 14-20)** , 也就是在差不多 300 Hz 到 1.5 kHz 之间进行了适度削减，尤其是在 500-700 Hz 左右达到最大衰减可以清除可能导致鼓声“浑浊”和“箱音”的频段，让低频鼓点更加突出，同时为其他乐器（如吉他）留出空间，避免整体声音变得拥挤。

**中高频/高频微调 (2085.35 Hz - 4945.15 Hz, Filter 22-25)**，在这个区域进行轻微的提升或许可以保持鼓点的“清晰度”和军鼓的“敲击感”及镲片的“存在感”，但增益不大，不过为了确保焦点依然在低频的重量感上，并避免高频过于尖锐还是可以试试。

最后就是 **极高频平坦 (7615.17 Hz - 18058.4 Hz, Filter 28-32)**，直接让这些频段保持 0 dB 增益，以避免引入不必要的嘶声或让声音过于“薄弱”，在保持整体细节的同时，不分散对鼓点力量感的注意力。

就这些。
