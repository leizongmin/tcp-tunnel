# tcp-tunnel
TCP Tunnel

## 安装

```bash
$ npm install tcp-tunnel -g
```

## 配置

文件`config.conf`

```
# 客户端名称及密码
# 名称:密码
:client
A:123456
B:123456

# 转发规则
# 本地端口 -> 客户端:端口
:rule
2022 -> A:22
3306 -> A:3306
6379 -> B:6379
```

## 启动客户端

```bash
$ tcp-tunnel-client -n A -p 123456
```

## 启动服务端

```bash
$ tcp-tunnel-server -c config.conf
```
