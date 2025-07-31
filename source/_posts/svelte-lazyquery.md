---
title: 使用 Runed intersection observer 与 tanstack query 实现通用的惰性加载组件
date: 2025-07-31 18:49:45
tags: [Technique]
---

在前端，一个常见的性能瓶颈是初始加载时请求了用户当前 viewpoint 之外的非必要数据。惰性加载（Lazy Loading）是一种关键策略，它将数据获取推迟到组件进入 viewpoint 时才执行。本文将阐述如何结合使用 Svelte 5、`@tanstack/svelte-query` 和 `runed.dev` 的 `useIntersectionObserver`，构建一个通用的、可复用的惰性加载组件。

**核心依赖与环境**

- **Svelte 5:** 本实现依赖于 Svelte 5 的符文（Runes）特性，它提供了更精细、更直观的状态管理能力。
    
- **@tanstack/svelte-query:** TanStack Query 的 Svelte 适配版，用户获取数据。
    
- **runed.dev:** 一个提供多种 Svelte 5 实用工具的库，本文主要使用其 `useIntersectionObserver`。

#### **设计哲学：分离关注点**

该方案的核心思想是将“何时加载”与“如何加载”这两个关注点进行解耦。

1. **何时加载 (When to Load):** 组件的可见性决定了数据加载的时机。我们利用 `Intersection Observer API` 来精确、高效地监听一个元素是否进入 viewpoint。`runed.dev` 库为此提供了名为 `useIntersectionObserver` 的便捷封装。
    
2. **如何加载 (How to Load):** 数据获取、缓存、同步和状态管理的复杂性由 `@tanstack/svelte-query` (TanStack Query) 处理。它提供了一套强大的工具集来管理异步数据。
    

通过将这两者结合，可以创建一个名为 `LazyQuery` 的抽象组件。该组件内部处理可见性检测，并根据检测结果动态控制 TanStack Query 的执行，而将具体的查询逻辑（`queryFn`）和键（`queryKey`）完全交由使用者定义。

#### `LazyQuery` 组件的实现

> 目标：封装惰性加载逻辑，并向外暴露一个标准的 TanStack Query 接口。

一、对组件的接口类型做如下定义：

```typescript
import type { CreateQueryOptions, QueryKey } from '@tanstack/svelte-query';
import type { Snippet } from 'svelte';

type Props<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> = {
  /// 一个标准的 TanStack Query 配置对象
  queryOptions: CreateQueryOptions<TQueryFnData, TError, TData, TQueryKey>;

  /// Svelte 5 的 `Snippet` 类型，它允许父组件向子组件传递一段可执行的 UI 模板。
  /// 这个 `Snippet` 会接收到 `createQuery` 返回的完整查询对象 `query`，
  /// 从而可以访问 `data`, `isLoading`, `error` 等所有状态。
  children: Snippet<{
    query: ReturnType<typeof createQuery<TQueryFnData, TError, TData, TQueryKey>>;
  }>;
};
```

二、组件逻辑：

```html
<script lang="ts">
  import { createQuery, type CreateQueryOptions, type QueryKey } from '@tanstack/svelte-query';
  import { useIntersectionObserver } from 'runed';
  import type { Snippet } from 'svelte';

  // [上述的类型定义]

  let { queryOptions, children }: Props = $props();

  let el: Element;
  const { isIntersecting } = useIntersectionObserver(
    () => el,
    {
      rootMargin: '200px',
    }
  );

  const query = createQuery({
    ...queryOptions,
    get enabled() {
      return ($state.is(isIntersecting) && (queryOptions.enabled ?? true));
    }
  });
</script>

<div bind:this={el}>
  {#snippet children({ query })}
  {/snippet}
</div>
```

- 我们创建一个 `div` 元素作为哨兵（sentinel），并用 `bind:this={el}` 将其 DOM 引用绑定到变量 `el`。
- `useIntersectionObserver` 接收一个返回目标元素的函数 `() => el`。
	- 它返回一个响应式的状态对象，其中 `isIntersecting` 是一个布尔值的符文（rune），当 `div` 元素进入 viewpoint 时为 `true`，否则为 `false`。
- `rootMargin: '200px'` 是一个优化选项，它会在元素距离 viewpoint 还有 200px 时就触发加载，从而提升用户体验。

#### 使用

使用 `LazyQuery` 组件非常直观。开发者只需关注数据获取的业务逻辑，而无需关心惰性加载的实现细节，假设有一个获取图表数据的场景：

```html
<script lang="ts">
  import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';
  import LazyQuery from './LazyQuery.svelte';
  import CopdGoldGradingChart from './CopdGoldGradingChart.svelte';

  const queryClient = new QueryClient();

  // Define the query configuration object, just like with a standard `createQuery`.
  const queryOptions = {
    queryKey: ['goldGradingData'],
    queryFn: async () => {
      // Simulate a network request
      await new Promise(resolve => setTimeout(resolve, 1500));
      // In a real application, this would be an API call
      // const response = await fetch('/api/gold-grading');
      // return await response.json();
      return { data: { totalPatients: 1234, chartPoints: [/* ... */] } };
    }
  };
</script>

<QueryClientProvider client={queryClient}>
  <div style="height: 200vh;">
    <p>Scroll down to see the chart...</p>
  </div>

  <LazyQuery {queryOptions}>
    {#snippet children({ query })}
      {#if query.isLoading}
        <p>Loading chart data...</p>
      {:else if query.error}
        <p>Error: {query.error.message}</p>
      {:else if query.data}
        <CopdGoldGradingChart
          isLoading={query.isFetching}
          error={query.error}
          refetch={() => query.refetch()}
          data={query.data.data}
          totalPatients={query.data.data.totalPatients}
        />
      {/if}
    {/snippet}
  </LazyQuery>
</QueryClientProvider>
```

- 页面初始加载时，`LazyQuery` 组件被渲染，但由于其 `div` 在 viewpoint 之外，`isIntersecting` 为 `false`。
- `createQuery` 被调用，但因为 `enabled` 条件为 `false`，查询处于禁用状态，不会发起任何网络请求。
- `children` 片段被渲染，此时 `query.isLoading` 为 `true`（这是 TanStack Query 禁用查询时的初始状态），显示 "Loading chart data..."。
- 当用户向下滚动，`div` 元素进入 viewpoint（或进入 `200px` 的预加载区域）。
- `useIntersectionObserver` 将 `isIntersecting` 的值更新为 `true`。
- 这个变化被 `createQuery` 的 `enabled` 访问器捕获，查询被自动激活，`queryFn` 开始执行。
- TanStack Query 负责管理后续的状态变化（`isFetching`, `data`, `error`），并驱动 `children` 片段内的 UI 自动更新。

#### 参考

- https://runed.dev/docs/utilities/use-intersection-observer
- https://tanstack.com/table/latest/docs/introduction
