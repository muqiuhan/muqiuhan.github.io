---
title: Nginx 前后端同域分流
date: 2026-03-16 22:09:28
tags: [Technique]
---

今天我想在服务器上的 docker nginx 中配置：同一主域下，前端走 `/`，后端 API 走 `/api/*`，认证框架 Better Auth 走 `/api/auth/*`。后端还有自己的 `/auth/*` 业务接口。

例如 xxx.yyy.zzz 是前端，xxx.yyy.zzz/api 是后端，后端基于 NestJS 用了 better-auth 会自动挂 /auth 路径。

Nginx 跑在 Docker 容器里，配置和证书从宿主机挂载进去：

- `/opt/nginx/conf.d` → `/etc/nginx/conf.d`
- `/opt/nginx/ssl` → `/etc/nginx/ssl`
- `/opt/nginx/nginx.conf` → `/etc/nginx/nginx.conf`

容器通过 `extra_hosts: host.docker.internal:host-gateway` 访问宿主机服务，所以前后端进程可以继续跑在宿主机上（比如 PM2 管理），Nginx 容器只做反代。

遇到的第一个坑：`/api/auth/*` 和 `/api/*` 不能用同一个 rewrite 规则。

如果这么写：

```nginx
location /api/ {
  proxy_pass http://host.docker.internal:<backend>/;
}
```

Nginx 会把 `/api` 前缀裁掉。于是 `/api/auth/sign-in/email` 变成了 `/auth/sign-in/email`，但 better-auth 挂在 `/api/auth/*`，直接 404。

正确的做法是分开处理。更麻烦的是业务身份接口 `/auth/me` 也存在，如果后端业务接口是 `/auth/me`，而认证框架是 `/api/auth/*`，那 `/api/auth/me` 应该转发给业务而不是认证框架。

正确顺序：

```nginx
location = /api/auth/me {
  # 精确匹配，业务身份接口
  rewrite ^/api(.*)$ $1 break;
  proxy_pass http://host.docker.internal:<backend>;
}

location ^~ /api/auth/ {
  # 认证框架路由，保留前缀
  proxy_pass http://host.docker.internal:<auth-port>;
}

location ^~ /api/ {
  # 其余 API，裁掉 /api
  rewrite ^/api(.*)$ $1 break;
  proxy_pass http://host.docker.internal:<backend>;
}

location / {
  # 前端
  proxy_pass http://host.docker.internal:<frontend>;
}
```

这里的顺序很重要。Nginx 匹配规则是：精确匹配 `=` 优先，然后是前缀匹配 `^~`，然后是正则匹配，最后是普通前缀匹配。`^~` 表示一旦匹配成功就不再检查正则。
