---
title: v8中Number.toString()的实现
date: 2023-10-05 14:49:18
tags: [Technique, JavaScript]
---

这里讲一下JavaScript中`Number.toString()`的实现， 以V8为例。

- [The official mirror of the V8 Git repository](https://github.com/v8/v8/)

在很多地方都能看到:
```c++
*isolate->factory()->NumberToString(value);
```
例如 [/src/builtins/builtins-number.cc](https://github.com/v8/v8/blob/df99ca37a9d02a3318d3e5487c7803f6230b8f5f/src/builtins/builtins-number.cc#L140) 中。

下面看看`NumberToString`的定义， 应该是在 [src/heap/factory-base.cc](https://github.com/v8/v8/blob/829e8d18d73e21807c78223b0cc107c76c80da27/src/heap/factory-base.cc#L963-L978) 中：
```c++
template <typename Impl>
Handle<String> FactoryBase<Impl>::NumberToString(Handle<Object> number,
                                                 NumberCacheMode mode) {
  SLOW_DCHECK(IsNumber(*number));
  if (IsSmi(*number)) return SmiToString(Smi::cast(*number), mode);

  double double_value = Handle<HeapNumber>::cast(number)->value();
  // Try to canonicalize doubles.
  int smi_value;
  if (DoubleToSmiInteger(double_value, &smi_value)) {
    return SmiToString(Smi::FromInt(smi_value), mode);
  }
  return HeapNumberToString(Handle<HeapNumber>::cast(number), double_value,
                            mode);
}
```

可以看到这里调用了 `SmiToString`, 这里不往下翻这个函数的定义， 只需要知道Smi是什么即可。 Smi 是一种特殊的整数类型，它被用于表示较小的整数值，通常在 32 位系统中是 31 位有符号整数。Smi 类型的值存储在指针的低位，而指针的高位用于标记该值是一个 Smi 类型。`IsSmi` 函数会检查给定的值是否为 Smi 类型，如果是，则返回 true，否则返回 false。这个函数通常用于 V8 引擎内部的优化和性能优化。

所以`NumberToString`会判断number是否是一个smi, 如果是的话就调用SmiToString， 否则会尝试将其转换为double再去调用`DoubleToSmiInteger`， 将`DoubleToSmiInteger`的调用结果存在`smi_value`里面， 再通过调用`SmiToString`将`smi_value`转换为字符串。

如果这两条路都行不通的话，就直接调用`HeapNumberToString`了。

`HeapNumberToString`的定义如下:
```c++
template <typename Impl>
Handle<String> FactoryBase<Impl>::HeapNumberToString(Handle<HeapNumber> number,
                                                     double value,
                                                     NumberCacheMode mode) {
  int hash = mode == NumberCacheMode::kIgnore
                 ? 0
                 : impl()->NumberToStringCacheHash(value);

  if (mode == NumberCacheMode::kBoth) {
    Handle<Object> cached = impl()->NumberToStringCacheGet(*number, hash);
    if (!IsUndefined(*cached, isolate())) return Handle<String>::cast(cached);
  }

  Handle<String> result;
  if (value == 0) {
    result = zero_string();
  } else if (std::isnan(value)) {
    result = NaN_string();
  } else {
    char arr[kNumberToStringBufferSize];
    base::Vector<char> buffer(arr, arraysize(arr));
    const char* string = DoubleToCString(value, buffer);
    result = CharToString(this, string, mode);
  }
  if (mode != NumberCacheMode::kIgnore) {
    impl()->NumberToStringCacheSet(number, hash, result);
  }
  return result;
}
```

就是熟知的NaN, Undefined处理，重点在:
```c++
char arr[kNumberToStringBufferSize];
base::Vector<char> buffer(arr, arraysize(arr));
const char* string = DoubleToCString(value, buffer);
result = CharToString(this, string, mode);
```

这里调用了`DoubleToCString`， 其定义在 [/src/numbers/conversions.cc](https://github.com/v8/v8/blob/829e8d18d73e21807c78223b0cc107c76c80da27/src/numbers/conversions.cc#L1064-L1126) 中：
```c++
const char* DoubleToCString(double v, base::Vector<char> buffer) {
  switch (FPCLASSIFY_NAMESPACE::fpclassify(v)) {
    case FP_NAN:
      return "NaN";
    case FP_INFINITE:
      return (v < 0.0 ? "-Infinity" : "Infinity");
    case FP_ZERO:
      return "0";
    default: {
      if (IsInt32Double(v)) {
        // This will trigger if v is -0 and -0.0 is stringified to "0".
        // (see ES section 7.1.12.1 #sec-tostring-applied-to-the-number-type)
        return IntToCString(FastD2I(v), buffer);
      }
      SimpleStringBuilder builder(buffer.begin(), buffer.length());
      int decimal_point;
      int sign;
      const int kV8DtoaBufferCapacity = base::kBase10MaximalLength + 1;
      char decimal_rep[kV8DtoaBufferCapacity];
      int length;

      base::DoubleToAscii(
          v, base::DTOA_SHORTEST, 0,
          base::Vector<char>(decimal_rep, kV8DtoaBufferCapacity), &sign,
          &length, &decimal_point);

      if (sign) builder.AddCharacter('-');

      if (length <= decimal_point && decimal_point <= 21) {
        // ECMA-262 section 9.8.1 step 6.
        builder.AddString(decimal_rep);
        builder.AddPadding('0', decimal_point - length);

      } else if (0 < decimal_point && decimal_point <= 21) {
        // ECMA-262 section 9.8.1 step 7.
        builder.AddSubstring(decimal_rep, decimal_point);
        builder.AddCharacter('.');
        builder.AddString(decimal_rep + decimal_point);

      } else if (decimal_point <= 0 && decimal_point > -6) {
        // ECMA-262 section 9.8.1 step 8.
        builder.AddString("0.");
        builder.AddPadding('0', -decimal_point);
        builder.AddString(decimal_rep);

      } else {
        // ECMA-262 section 9.8.1 step 9 and 10 combined.
        builder.AddCharacter(decimal_rep[0]);
        if (length != 1) {
          builder.AddCharacter('.');
          builder.AddString(decimal_rep + 1);
        }
        builder.AddCharacter('e');
        builder.AddCharacter((decimal_point >= 0) ? '+' : '-');
        int exponent = decimal_point - 1;
        if (exponent < 0) exponent = -exponent;
        builder.AddDecimalInteger(exponent);
      }
      return builder.Finalize();
    }
  }
}
```

不用过多解释， 已经很清晰了， `FastD2I` 就是 Fast Double to Integer的意思， 定义如下， 注释也很详尽：
```c++
// The fast double-to-(unsigned-)int conversion routine does not guarantee
// rounding towards zero.
// The result is undefined if x is infinite or NaN, or if the rounded
// integer value is outside the range of type int.
inline int FastD2I(double x) {
  DCHECK(x <= INT_MAX);
  DCHECK(x >= INT_MIN);
  return static_cast<int32_t>(x);
}
```

以上