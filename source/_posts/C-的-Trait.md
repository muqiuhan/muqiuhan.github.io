---
title: C++ 的 Trait
date: 2024-05-04 11:07:52
tags: [Technique, C++]
---

> C++ 的 traits 技术，是一种约定俗称的技术方案，用来为同一类数据（包括自定义数据类型和内置数据类型）提供统一的类型名（traits），这样可以统一的操作函数，例如 advance(), swap(), encode()/decode() 等。

例如，拥有义类型Foo, Bar，以及编译器自带类型 int, double, string，我们想要为这些不同的类型提供统一的编码函数 decode() 。

除了使用 trait 技术之外，函数重载和模板函数 + 内置字段也可以实现，前者每增加一种数据类型就需要重新实现一个函数，而同一类数据（int, unsinged int）可以使用同样的编码方法。我们想要的是针对同一种数据类型，只编写一个函数。后者对于系统自定义变量 int, double 而言，是无法在其内部定义 type 的。

traits 技术的关键在于，使用另外的模板类 type_traits 来保存不同数据类型的 type，这样就可以兼容自定义数据类型和内置数据类型:

```c++
// 定义数据 type 类
enum Type {
  TYPE_1,
  TYPE_2,
  TYPE_3
}
```

对于自定义类型，在类内部定义 type，然后在 traits 类中定义同样的 type:

```c++
// 自定义数据类型
class Foo {
public:
  Type type = TYPE_1;
};
class Bar {
public:
  Type type = TYPE_2;
};
template<typename T>
struct type_traits {
  Type type = T::type;
}
```

对于内置数据类型，使用模板类的特化为自定义类型生成独有的 type_traits:

```c++
// 内置数据类型
template<typename int>
struct type_traits {
  Type type = Type::TYPE_1;
}
template<typename double>
struct type_traits {
  Type type = Type::TYPE_3;
}
```

这样就可以为不同数据类型生成统一的模板函数
```c++
// 统一的编码函数
template<typename T>
void decode<const T& data, char* buf) {
  if(type_traits<T>::type == Type::TYPE_1) {
    ...
  }
  else if(type_traits<T>::type == Type::TYPE_2) {
    ...
  }
}
```

总结

- traits 技术的关键在于使用第三方模板类 traits，利用模板特化的功能, 实现对自定义数据和编译器内置数据的统一
- 这个例子使用了枚举变量来表示数据类型，而实际操作中通常使用不同的类来表示不同的类型，这样可以在编写模板函数时更好的优化。
- tratis 技术常见于标准库的实现中，但对日常开发中降低代码冗余也有很好的借鉴意义
- C++20 提供了Concept 的特性，使用Concept 可以使得实现类似的功能更加方便
