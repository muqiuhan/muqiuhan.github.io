---
title: C++ 20 实现 string split
date: 2023-05-12 11:06:16
tags:  [Technique, C++]
---

C++20引入了范围库ranges，其中提供的两个范围适配器std::split、std::lazy_split可以使我们以一种更为优雅的形式实现split:

```cpp
#include <concept>
#include <ranges>
#include <algorithm>
#include <format>
#include <iostream>

#define stdr  std::ranges
#define stdrv std::ranges::views

template<template<typename> typename Container = std::vector, typename Arg = std::string_view>
auto Split(std::string_view str, std::string_view delimiter)
{
	Container<Arg> myCont;
	auto temp = str 
		| stdrv::split(delimiter)
		| stdrv::transform([](auto&& r)
			{
				return Arg(std::addressof(*r.begin()), stdr::distance(r));
			});
	auto iter = std::inserter(myCont, myCont.end());
	stdr::for_each(temp, [&](auto&& x) { iter = {x.begin(), x.end()}; });
	return myCont;
}
int main()
{
	std::string str = "Hello233C++20233and233New233Spilt";
	std::string delimiter = "233";
	auto&& strCont = Split<std::list, std::string>(str, delimiter);
	stdr::for_each(strCont, [](auto&& x) { std::cout << std::format("{} ", x); });
}
//output: Hello C++20 and New Spilt
```

C++20没有提供关键的 `ranges::to<container>`函数，导致demo中还需要额外封装并手写for_each来写入数据，等到C++23实装了该函数，split的实现会比现在简洁优雅的多，真正做到方便泛用、无需封装：

```cpp
auto&& strCont = str
	| stdrv::lazy_split(delimiter)
	| stdr ::to<std::vector<std::string>>;
```