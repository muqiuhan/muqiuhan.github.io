---
title: OCaml Core.Int.pow 的实现
date: 2023-10-21 07:52:02
tags: [Technique, OCaml]
---

Core内部直接引用的Base的实现， Base的实现在 [src/int_math.ml](https://github.com/janestreet/base/blob/494a0876168d24cda695cbb9a3d86ad8d1eb97d8/src/int_math.ml#L11-L18) 中：
```ocaml
let int_pow base exponent =
  if exponent < 0 then negative_exponent ();
  if abs base > 1
     && (exponent > 63
         || abs base > Pow_overflow_bounds.int_positive_overflow_bounds.(exponent))
  then overflow ();
  int_math_int_pow base exponent
;;
```

其中 `int_math_int_pow()` 由 C 实现:
```ocaml
external int_math_int_pow : int -> int -> int = "Base_int_math_int_pow_stub" [@@noalloc]
```

其实现在 [src/int_math_stubs.c](https://github.com/janestreet/base/blob/494a0876168d24cda695cbb9a3d86ad8d1eb97d8/src/int_math_stubs.c#L56-L92) 中:
```c
static int64_t int_pow(int64_t base, int64_t exponent) {
  int64_t ret = 1;
  int64_t mul[4];
  mul[0] = 1;
  mul[1] = base;
  mul[3] = 1;

  while (exponent != 0) {
    mul[1] *= mul[3];
    mul[2] = mul[1] * mul[1];
    mul[3] = mul[2] * mul[1];
    ret *= mul[exponent & 3];
    exponent >>= 2;
  }

  return ret;
}
```

这是一个四分快速幂的实现，它是二分快速幂的一种变种。二分快速幂将指数分为两部分，然后递归地计算每一部分的结果。
而四分快速幂将指数分为四部分，然后递归地计算每一部分的结果。 
这里通过将指数右移2位（相当于除以4）和使用位与操作来实现，进一步减少了乘法次数。

主要步骤：

- 初始化返回值ret为1，和一个包含4个元素的数组mul, mul[0]和mul[3]被初始化为1， mul[1]被初始化为基数
- 当指数不为0时，执行循环, 在每次循环中，首先更新mul数组的值
  > mul[1]是基数和mul[3]的乘积，mul[2]是mul[1]的平方，mul[3]是mul[2]和基数的乘积
- 然后，将ret乘以mul数组中的一个元素, 这个元素的索引是指数和3的位与运算的结果
  > 这样做的目的是为了选择正确的乘数，因为指数被分解为4的倍数
- 最后，将指数右移2位，相当于将指数除以4
- 当指数变为0时，循环结束，返回ret

这个实现的优点是它可以在对数时间内计算出幂运算，而且每次循环只需要4次乘法。这比标准的二分快速幂算法需要的乘法次数更少。