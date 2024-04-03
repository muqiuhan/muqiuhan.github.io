---
title: shadow-cljs 怎么设置代理
date: 2024-04-03 20:11:54
tags: [Clojure, ClojureScript]
---

The library pomegranate used for retrieving maven dependencies does not read `.m2/settings.xml`. You can however set the :proxy config either in `shadow-cljs.edn` directly or `~/.shadow-cljs/config.edn`.

See [https://github.com/cemerick/pomegranate/blob/master/src/main/clojure/cemerick/pomegranate/aether.clj#L757-L765](https://github.com/cemerick/pomegranate/blob/master/src/main/clojure/cemerick/pomegranate/aether.clj#L757-L765).

_shadow-cljs.edn:_
```clojure
{:source-paths ["src/main"
                "src/test"]

 :dependencies [[reagent "1.2.0"]
                [re-frame "1.3.0"]]

 ;; Here
 :proxy {:host "localhost"
         :port 20171}

 :builds       {:app {:target           :react-native
                      :init-fn          example.app/init
                      :output-dir       "app"
                      :compiler-options {:infer-externs :auto}
                      :devtools         {:autoload true}}}}
```