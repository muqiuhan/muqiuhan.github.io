---
title: Turborepo 简述
date: 2024-09-27 18:07:49
tags: [Technique]
---

## Turborepo 简介

Monorepos 有很多优势，但它们难以扩展。每个工作区都有自己的测试套件、自己的 linting 和构建过程。单个 monorepo 可能有数千个任务要执行。

Turborepo 是一个专为 JavaScript 和 TypeScript 代码库设计的构建系统，旨在优化 monorepos 和 single-package workspace 中的任务。它通过远程缓存（remote caching）和高效的任务调度（task scheduling）来解决 monorepos 中的扩展问题。Turborepo 也可以增量部署（adopted incrementally），并与各种包管理器配合使用。

- 远程缓存: 存储所有任务的结果，CI 就不需要重复执行相同的工作了。
- 任务调度：利用所有核心的性能并行处理任务，尽可能的加速。

`turbo` 基于 workspace 构建，workspaces 是 JavaScript 生态系统中包管理器的一项功能，允许将多个包分组到一个存储库中:

### Workspace
在 JavaScript 中，Workspace 是指仓库中的特定实体，可以是[单个包](https://vercel.com/docs/vercel-platform/glossary#single-package-workspace)或[包的集合](https://vercel.com/docs/vercel-platform/glossary#multi-package-workspace)。
包管理器的 root lock 文件（例如 `pnpm-lock.yaml`）以及任何其他配置都位于 Wrokspace 的根目录。在 Monorepo 中可以有多个工作区，每个工作区位于存储库的子目录中。

### [Single-package workspace](https://vercel.com/docs/vercel-platform/glossary#single-package-workspace)
只有一个独立包的工作区，在工作区根目录下有一个 `package.json` 文件。

### [Multi-package workspace](https://vercel.com/docs/vercel-platform/glossary#multi-package-workspace)
包含多个包的工作区，包含多个 `package.json` 文件，其中一个位于工作区根目录中用于全局配置，其他位于每个包目录中。
> 这种类型的工作区通常称为 monorepo

---

以 npm 为例，turbo 会初始化一个这样的目录结构使其成为有效的 workspace:
```
|- package.json
|- package-lock.json
|- turbo.json
|- apps
|-- docs
|--- package.json
|-- web
|--- package.json
|- packages
|--- ui
```

一个 “有效的” turbo 项目至少要有：
- 包管理器描述的包
- 包管理器的 lock 文件
- 根目录下的 `package.json`
- 根目录下的 `turbo.json`
- 每个包中的 `package.json`

例如，在根目录的 `package.json` 中配置:
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

那么 `apps` 或 `packages` 目录中有 `package.json` 的每个目录都将被视为一个包。

> 注意：Turborepo 不支持嵌套包，例如 `apps/**` 或 `packages/**` 这种，将一个包放在`apps/a` 并将另一个包放在 `apps/a/b` 的结构将导致错误。
> 
> 如果想按目录对包进行分组，可以使用 `packages/*` 和 `packages/group/*` 等 glob 来完成此操作，而**不是**创建 `packages/group/package.json` 文件。

根目录的 `package.json` 是 workspace 的基础，常见的配置：
```json
{
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "packageManager": "npm@10.0.0"
}
```

而根目录的 `turbo.json` 用于配置 `turbo` 的行为。那些 lock 文件是包管理器和 `turbo` 用于 reproducible 的关键。此外，Turborepo 还利用它们分析工作区中[内部包](https://turbo.build/repo/docs/core-concepts/internal-packages)之间的依赖关系。

---

### 包中的 `package.json`
[`name` 字段](https://nodejs.org/api/packages.html#name)用于标识包。它在 workspace 中应该是唯一的。
> 最佳做法是为[内部包](https://turbo.build/repo/docs/core-concepts/internal-packages)使用命名空间前缀，以避免与 npm 注册表上的其他包发生冲突。例如，如果组织名为 `clin`，则可以将包命名为 `@clin/package-name`。

`scripts` 字段用于定义可在包的上下文中运行的脚本。Turborepo 将使用这些脚本的名称来确定要在包中运行的脚本（如果有）。

[`exports` 字段](https://nodejs.org/api/packages.html#exports)用于指定要使用该包的其他包的入口点。如果要在另一个包中使用一个包中的代码，将从该入口点导入。

例如，如果有一个 `@repo/math` 包，则可以这么写 `exports` 字段:

```json
{
  "exports": {
    ".": "./dist/constants.ts",
    "./add": "./dist/add.ts",
    "./subtract": "./dist/subtract.ts"
  }
}
```

然后就可以从 `@repo/math` 包中导入 `add` 和 `subtract` 函数了:
```typescript
import { GRAVITATIONAL_CONSTANT, SPEED_OF_LIGHT } from '@repo/math';
import { add } from '@repo/math/add';
import { subtract } from '@repo/math/subtract';
```

以这种方式使用导出有三个主要好处：
- **避免 barrel 文件**：barrel 文件是重新导出同一包中其他文件的文件，从而为整个包创建一个入口点。虽然它们可能看起来很方便，但编译器[和捆绑程序很难处理](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js#what's-the-problem-with-barrel-files)它们，并且可能很快导致性能问题。
- **更强大的功能**：与[`主`字段](https://nodejs.org/api/packages.html#main)（如 [Conditional Exports](https://nodejs.org/api/packages.html#conditional-exports)）相比，`exports` 还具有其他强大的功能。一般来说，尽可能使用 `exports` 而不是 `main` 就行了。
- **IDE 友好**：通过使用 `export` 指定包的入口点，代码编辑器可以为包的导出提供自动完成。

---

除此之外还有 `import` 字段，也就是一种创建包中其他模块的子路径的方法。可以简单地视为 “快捷方式” ，用于编写更简单的导入路径，这些路径对日后文件被移动后的重构更具弹性。

> 其他：包通常使用 `src` 目录来存储其源代码并编译到 `dist` 目录（也应位于包中）。

## 管理依赖项
```json
{
  "dependencies": {
    "next": "latest", // 外部依赖
    "@repo/ui": "*" // 内部依赖
  }
}
```

在存储库中安装依赖项时，应将其直接安装在使用它的软件包中。包的 `package.json` 将包含所需的每个依赖项。外部和内部依赖项都是如此。

要在多个包中快速安装依赖项，可以：
```
npm install jest --workspace=web --workspace=@repo/ui --save-dev
```

这种做法有几个好处：
- **更清晰**：当软件包的依赖项列在其 `package.json` 中时，更容易理解软件包所依赖的内容。在存储库中工作的开发人员可以一目了然地看到包中使用了哪些依赖项。
- **更具灵活性**：在大规模的 monorepo 中，想让每个包都使用相同版本的外部依赖项可能是不现实的。当有许多团队在同一个代码库中工作时，优先级、时间表和需求会有所不同。通过在 “使用它们的包” 中安装依赖项，可以让 `UI` 团队能够升级到最新版本的 TypeScript，而 `Web` 团队可以优先发布新功能并在以后使用 TypeScript。
- **更好的缓存能力**：如果在存储库的根目录中安装了太多依赖项，则每当添加、更新或删除依赖项时，都会更改工作区根目录，从而导致不必要的缓存未命中。
- **修剪未使用的依赖项**：对于 Docker 用户，[Turborepo 的修剪功能](https://turbo.build/repo/docs/reference/prune)可以从 Docker 镜像中删除未使用的依赖项，以创建更轻量级的镜像。当依赖项安装在它们所适用的包中时，Turborepo 可以读取锁文件并删除所需的包中未使用的依赖项。

> 属于工作区根目录的唯一依赖项是**用于管理存储库的工具，**而用于构建应用程序和库的依赖项安装在各自的包中。一些适合安装在根中的依赖项示例包括 [`turbo`](https://www.npmjs.com/package/turbo)、[`husky`](https://www.npmjs.com/package/husky) 或 [`lint-staged`](https://www.npmjs.com/package/lint-staged)。

### 保持同一版本的依赖

一些 monorepo 维护者更喜欢按照规则在所有软件包中保持对相同版本的依赖关系。有几种方法可以实现此目的：
- 使用专用的工具，比如 [`syncpack`](https://www.npmjs.com/package/syncpack)、[`manypkg`](https://www.npmjs.com/package/@manypkg/cli) 和 [`sherif`](https://www.npmjs.com/package/sherif) 等工具可用于此特定目的。
- 或者单纯的使用包管理器，可以使用软件包管理器通过一个命令更新依赖项版本:
	- `npm install typescript@latest --workspaces`
- 或者最粗暴的用编辑器一次查找并替换存储库中所有 `package.json` 文件的依赖项版本。用 `“next”： “.*”` 之类的正则表达式来查找并替换为所需的版本。完成后再运行包管理器的 install 命令来更新 lock 文件.

## 内部包
[内部包](https://turbo.build/repo/docs/core-concepts/internal-packages)是工作区的构建块（building blocks），是一种在存储库中共享代码的强大方式。Turborepo 读取 `package.json` 中的依赖项来分析内部包之间的关系，并在后台创建 [Package Graph](https://turbo.build/repo/docs/core-concepts/package-and-task-graph#package-graph) 以优化存储库的工作流程。

在创建内部包时，建议创建具有单一 “用途” 的包。这是最佳实践，具体取决于存储库的规模、组织、团队需求等。此策略具有以下几个优点：
- **更易于理解**：随着存储库的扩展，在存储库中工作的开发人员将能够更轻松地找到他们需要的代码。
- **减少每个包的依赖项**：每个包使用更少的依赖项，以便 Turborepo 可以更有效地[修剪包图的依赖项](https://turbo.build/repo/docs/reference/prune)。

在创建[应用程序包](https://turbo.build/repo/docs/core-concepts/package-types#application-packages)时，最好避免将共享代码放在这些包中。相反，应该为共享代码创建一个单独的包，并让应用程序包依赖于该包。
此外，应用程序包不应安装到其他包中。相反，应将它们视为 [Package Graph](https://turbo.build/repo/docs/core-concepts/package-and-task-graph#package-graph) 的入口点。

## 配置任务
Turborepo 将始终按照 [`turbo.json` 配置](https://turbo.build/repo/docs/reference/configuration)和 [Package Graph](https://turbo.build/repo/docs/core-concepts/package-and-task-graph#package-graph) 中描述的顺序运行任务，并尽可能并行化工作以确保一切尽可能快地运行。

根目录的 `turbo.json` 文件是注册 Turborepo 将运行的任务的位置。定义任务后，将能够使用 [`turbo run`](https://turbo.build/repo/docs/reference/run) 运行一个或多个任务。

`tasks` 对象中的每个 key 都是一个可以通过 `turbo run` 执行的任务。Turborepo 将在 `package.json` 中搜索与**任务同名的软件包**:

[`dependsOn` 键](https://turbo.build/repo/docs/reference/configuration#dependson)用于指定在其他任务开始运行之前必须完成的任务。在大多数情况下，库的`build`脚本在应用程序的`build`脚本运行之前完成，所以可以这么写:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"] 
    }
  }
}
```

> `^` 这个语法告诉 Turborepo 从依赖关系图的底部开始运行任务。如果应用程序依赖于名为 `ui` 的库，并且该库具有`build`任务，则 `ui` 中的`build`脚本将**首先**运行。成功完成后，才会运行应用程序中的`build`任务。
> 这是一个重要的形式，因为它可以确保应用程序的`build`任务具有编译所需的所有必要依赖项。当依赖关系图发展到具有多个级别的任务依赖关系的更复杂的结构时，此概念也适用。

有时可能需要确保同一包中的两个任务按特定顺序运行。例如需要先在库中运行`build`任务，然后再在同一库中运行`test`任务。这种情况删掉 `^` 就行了:

```json
{
  "tasks": {
    "test": {
      "dependsOn": ["build"] 
    }
  }
}
```

还可以在特定包中指定要依赖的单个任务。例如在任何 `lint` 任务之前运行 `utils` 中的`build`任务:
```json
{
  "tasks": {
    "lint": {
      "dependsOn": ["utils#build"] 
    }
  }
}
```

或者更加细致的限定 `lint`:
```json
{
  "tasks": {
    "web#lint": {
      "dependsOn": ["utils#build"] 
    }
  }
}
```

即 `Web 包中的` `lint` 任务只能在 `utils` 包中的`build`任务完成后运行。

某些任务可能没有任何依赖项。例如用于在 Markdown 文件中查找拼写错误的任务可能不需要关心其他任务的状态。在这种情况下，省略 `dependsOn` 键或给个空数组就行了:

```json
{
  "tasks": {
    "spell-check": {
      "dependsOn": [] 
    }
  }
}
```

### 指定输入输出
`outputs` 键告诉 Turborepo 文件和目录在任务成功完成时应该缓存在哪。如果未定义此 key，Turborepo 将不会缓存任何文件。

例如缓存 vite 的输出一般可以这么写:

```json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**"] 
    }
  }
}
```

`inputs` 键用于指定要包含在任务哈希中以进行[缓存](https://turbo.build/repo/docs/crafting-your-repository/caching)的文件。默认情况下，Turborepo 将包含包中由 Git 跟踪的所有文件。但是也可以使用 `inputs` 键更具体地说明哈希中包含哪些文件, 例如，在 Markdown 文件中查找拼写错误的任务可以定义如下：:

```json
{
  "tasks": {
    "spell-check": {
      "inputs": ["**/*.md", "**/*.mdx"] 
    }
  }
}
```

可以通过微调 `input` 以忽略对已知不会影响任务输出的文件的更改来提高某些任务的缓存命中率, 可以使用 `$TURBO_DEFAULT$` 微语法来微调默认 `input` 行为：

```json
{
  "tasks": {
    "build": {
      "inputs": ["$TURBO_DEFAULT$", "!README.md"] 
    }
  }
}
```

这里 Turborepo 使用`build`任务的默认`input`，但会忽略对 `README.md` 文件的更改。如果 `README.md` 文件发生更改，任务仍将用上缓存。

### Root 任务
还可以使用 `turbo` 在 Workspace 根的 `package.json`中运行脚本。例如，除了每个软件包中的 `lint` 任务外，可能还需要对 Workspace 根目录中的文件运行 `lint：root` 任务：

```json
{
  "tasks": {
    "lint": {
      "dependsOn": ["^lint"]
    },
    "//#lint:root": {} 
  }
}
```

### 其他
- [包配置](https://turbo.build/repo/docs/reference/package-configurations)是直接放入包中的`turbo.json`文件。这允许软件包为其自己的任务定义特定行为，而不会影响存储库的其余部分。
- 有一些始终需要运行的任务，例如缓存生成后的部署脚本。对于这些任务，用 `“cache”： false` :
```json
{
  "tasks": {
    "deploy": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "build": {
      "outputs": ["dist/**"]
    }
  }
}
```

- 某些任务可以并行运行，例如 Linter 不需要等待依赖项中的输出成功才能运行：
```json
{
  "tasks": {
    "transit": {
      "dependsOn": ["^transit"]
    },
    "check-types": {
      "dependsOn": ["transit"]
    },
  },
}
```
> 这里用到了 [Transit Nodes](https://turbo.build/repo/docs/core-concepts/package-and-task-graph#transit-nodes) （就是名为 `transit` 的任务），这些 Transit Node 使用不执行任何操作的任务在软件包依赖项之间创建关系，这里用了名称 `transit`，但可以将任务命名为 Workspace 中尚未包含脚本的任何名称。

## 正在运行的任务

当在软件包的目录中时，`turbo` 会自动将命令范围限定为该软件包的 [Package Graph](https://turbo.build/repo/docs/core-concepts/package-and-task-graph#package-graph):
```
cd apps/docs
turbo build
```
将使用 `turbo.json` 中注册的`build`任务运行 `docs` 包的`build`任务。

> 但也可以[使用过滤器](https://turbo.build/repo/docs/crafting-your-repository/running-tasks#using-filters)覆盖 Automatic Package Scoping。

### 运行多个任务

`Turbo` 能够运行多个任务，并尽可能并行化:
```
turbo run build test lint check-types
```

## 缓存
Turborepo 的缓存在本地工作时可以节省大量时间 - 启用[远程缓存](https://turbo.build/repo/docs/core-concepts/remote-caching)时，它的功能更加强大，可在整个团队和 CI 之间共享缓存。

### 缓存什么？

- 在 [`turbo.json 的 outputs` 键](https://turbo.build/repo/docs/reference/configuration#outputs)中定义的任务的文件输出。
- 任务的终端输出，从任务第一次运行时开始将这些日志恢复到终端。
- 对输入进行哈希处理，为任务运行创建一个 “fingerprints”。当 “fingerprints” 匹配时，运行任务将命中缓存。

### 其他
- [`--dry` 标志](https://turbo.build/repo/docs/reference/run#--dry----dry-run)，可用于查看如果在没有实际运行任务的情况下运行任务会发生什么。当不确定正在运行的任务时，这对于调试缓存问题非常有用。
- [`--summarize` 标志](https://turbo.build/repo/docs/reference/run#--summarize)，可用于获取任务的所有输入、输出等的概览。比较两个摘要将揭示两个任务的哈希值不同的原因。
- 强制 `turbo` 重新执行已缓存的任务，请使用 [`--force` 标志](https://turbo.build/repo/docs/reference/run#--force)。请注意，这将禁用**读取**缓存，**而不是写入**。

## 开发工作流

在 `turbo.json` 中定义开发任务 (development task) 会告诉 Turborepo 将运行一个长期任务。这对于运行开发服务器、运行测试或构建应用程序等操作非常有用:

```json
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- `"cache"： false`：告诉 Turborepo 不要尝试缓存任务的结果。由于这是一项开发任务，可能会频繁更改代码，因此缓存结果没有用。
- `"persistent": true`：告诉 Turborepo 保持任务运行，直到停止它。此键用作终端 UI 的信号，用于将任务视为长时间运行和交互式任务。此外，它还可以防止意外依赖不会退出的任务。

一些脚本允许使用 `stdin` 在其中键入以进行交互式输入。使用[终端 UI](https://turbo.build/repo/docs/reference/configuration#ui)，可以选择一个任务，输入它，然后像往常一样使用 `stdin`。

需要运行用于设置开发环境或预构建包的脚本。可以使用 `dependsOn` 确保这些任务在 `dev` 任务之前运行：

```json
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["//#dev:setup"]
    },
    "//#dev:setup": {
      "outputs": [".codegen/**"]
    }
  }
}
```

这里用的是 [Root Task](https://turbo.build/repo/docs/crafting-your-repository/configuring-tasks#registering-root-tasks)，但可以对 [packages 中的任意任务](https://turbo.build/repo/docs/crafting-your-repository/configuring-tasks#depending-on-a-specific-task-in-a-specific-package)使用相同的思路。

### Watch mode
许多工具都有一个内置的 watcher，比如 [`tsc --watch`](https://www.typescriptlang.org/docs/handbook/compiler-options.html#compiler-options)，它会响应源代码中的更改。有些则没有，`Turbo Watch` 为任何工具添加了依赖项感知的 Watcher。对源代码的更改将遵循在 `turbo.json` 中描述的 [Task Graph （任务图](https://turbo.build/repo/docs/core-concepts/package-and-task-graph#task-graph)），例如:

```json
{
  "tasks": {
    "dev": {
      "persistent": true,
      "cache": false
    },
    "lint": {
      "dependsOn": ["^lint"]
    }
  }
}
```

当运行 `turbo watch dev lint` 时，会看到每当更改源代码时，`lint` 脚本都会重新运行，尽管 ESLint 没有内置的 watcher。`Turbo Watch` 还知道内部依赖关系，因此 `@repo/UI` 中的代码更改将在 `@repo/UI` 和 `Web` 中重新运行任务。

## 环境变量

Turborepo 需要根据环境变量来决定是否改变应用程序的行为。在 `turbo.json` 文件中使用 `env` 和 `globalEnv` 键:

```json
{
  "globalEnv": ["IMPORTANT_GLOBAL_VARIABLE"],
  "tasks": {
    "build": {
      "env": ["MY_API_URL", "MY_API_KEY"]
    }
  }
}
```
- `globalEnv`：更改此列表中任何环境变量的值都将更改所有任务的哈希值。
- `env`：包括对影响任务的环境变量值的更改，从而实现更好的粒度。例如，当 `API_KEY` 的值发生变化时，`lint` 任务可以继续用缓存，但`build`任务应该不用。

>Turborepo 会自动将前缀通配符添加到常见框架的 [`env`](https://turbo.build/repo/docs/reference/configuration#env) 键中 （### [Framework Inference](https://turbo.build/repo/docs/crafting-your-repository/using-environment-variables#framework-inference)）

### Environment mode

Turborepo 的 Environment Mode 允许控制哪些环境变量在运行时可用于任务：
- [严格模式](https://turbo.build/repo/docs/crafting-your-repository/using-environment-variables#strict-mode)（默认）：将环境变量过滤为**仅在** `turbo.json` 的 `env` 和 `globalEnv` 键中指定的环境变量。
- [宽松模式](https://turbo.build/repo/docs/crafting-your-repository/using-environment-variables#loose-mode)：允许进程的所有环境变量可用。

### 其他
- `.env` 文件非常适合在本地处理应用程序。**Turborepo 不会将 .env 文件加载到任务的运行时**中，而是让它们由框架或 [`dotenv`](https://www.npmjs.com/package/dotenv) 等工具处理。但是，`turbo` 必须知道 `.env` 文件中值的更改，以便它可以将它们用于哈希。如果在两次构建之间更改 `.env` 文件中的变量，则 `build` 任务应该不会用上缓存。所以可以将其添加到 `input` 键中:
```json
{
  "globalDependencies": [".env"], // All task hashes
  "tasks": {
    "build": {
      "inputs": ["$TURBO_DEFAULT$", ".env", ".env.local"] // Only the `build` task hash
    }
  }
}
```

- 不建议在存储库的根目录中使用 `.env` 文件。相反，建议将 `.env` 文件放入使用它们的包中。
- [`eslint-config-turbo` 软件包](https://turbo.build/repo/docs/reference/eslint-config-turbo)可帮助查找代码中使用但未在 `turbo.json`中列出的环境变量。这有助于确保在配置中考虑所有环境变量。
- Turborepo 在任务开始时对任务的环境变量进行哈希处理。如果在任务期间创建或更改环境变量，Turborepo 将不知道这些更改，也不会在任务哈希中考虑这些更改。

---

## 最后

- [配置 CI](https://turbo.build/repo/docs/crafting-your-repository/constructing-ci)
- [核心概念](https://turbo.build/repo/docs/core-concepts)

> 本快速入门文档参照 Turborepo 2.x 官方文档: https://turbo.build/repo/docs
> 最后一次编辑：二〇二四年九月二十七日下午六点〇七分
