---
title: Rescript and React Native
date: 2024-01-22 20:24:40
tags: [Technique]
---

Rescript 对 React Native 的支持还算可以，但如今的 RN 已经是 Expo 的 RN 了，所以仍然有些落后，在这个 template 中，我测试了 rescript + rescript-react-native + expo + nativewind 的组合，可以跑起来：

- [muqiuhan/rescript-react-native-expo-nativewind-template](https://github.com/muqiuhan/rescript-react-native-expo-nativewind-template)

其中有两个问题，一是 [rescript-expo](https://github.com/rescript-bindings/expo) 对 rescript v11 的兼容性，我通过简单的注释让其通过编译:

- [[Fix]: DocumentPicker type options](https://github.com/muqiuhan/expo/commit/918e9578f2a991450821760352c2445c4866f0d8)

二是对于 nativewind 的支持，编写的 binding 非常丑陋：

```rescript
type default_style = {
  className?: string,
  children?: React.element,
}

@module("nativewind")
external styled: React.component<'a> => React.component<default_style> = "styled"

module StyledText = {
  let make = styled(ReactNative.Text.make)
}

module StyledView = {
  let make = styled(ReactNative.View.make)
}

module StyledImage = {
  type props = {
    source?: string,
    ...default_style,
  }

  @module("nativewind")
  external styled: React.component<'a> => React.component<props> = "styled"

  let make: React.component<props> = styled(ReactNative.Image.make)
}
```

而这似乎并没有好的解决方案，理想中的实现应该是：

```rescript
module Styled = (Component: {
  type params // or type params = 'a
  let make: React.component<props>
}) => {
  type props = {
    ...Component.props, // This can't work as it is not defined as record
    className?: string
  }
  @module("nativewind")
  external styled: React.component<Component.props> => React.component<props> = "styled"

  let make: React.component<props> = styled(Component.make)
}
```

或者退一步:

```rescript
type styledProps = {
  className?: string,
  // ...
}

@module("nativewind")
  external styled: React.component<'a> => React.component<'b> = "styled"

module StyledText = {
  type props = {
    ...ReactNative.Text.props,
    ...styledProps
  }

  let make: React.component<props> = styled(ReactNative.Text.make)
}
```

但这在当前的 rescript 中，根本无法实现。

详细的讨论看这个帖子：

- [How to use Nativewind in Rescript React Native](https://forum.rescript-lang.org/t/how-to-use-nativewind-in-rescript-react-native/5005)