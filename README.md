[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Gittip][gittip-image]][gittip-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/tcp-tunnel.svg?style=flat-square
[npm-url]: https://npmjs.org/package/tcp-tunnel
[travis-image]: https://img.shields.io/travis/leizongmin/tcp-tunnel.svg?style=flat-square
[travis-url]: https://travis-ci.org/leizongmin/tcp-tunnel
[coveralls-image]: https://img.shields.io/coveralls/leizongmin/tcp-tunnel.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/leizongmin/tcp-tunnel?branch=master
[gittip-image]: https://img.shields.io/gittip/leizongmin.svg?style=flat-square
[gittip-url]: https://www.gittip.com/leizongmin/
[david-image]: https://img.shields.io/david/leizongmin/tcp-tunnel.svg?style=flat-square
[david-url]: https://david-dm.org/leizongmin/tcp-tunnel
[node-image]: https://img.shields.io/badge/node.js-%3E=_4.0-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/tcp-tunnel.svg?style=flat-square
[download-url]: https://npmjs.org/package/tcp-tunnel

# tcp-tunnel
快速建立TCP隧道，方便将服务器上的端口映射到内网主机，支持多客户端及密码认证

## 安装

**要求系统已安装`Node.js v4.0`或以上版本**

```bash
$ npm install tcp-tunnel -g
```

## 原理

+ 服务器端启动，监听配置的端口列表
+ 客户端连接到服务器，校验密码，建立控制连接通道
+ 服务器端监听到连接请求，生成`session_id`并发送给相应的客户端
+ 客户端收到`session_id`后，连接服务器端，并发送此`session_id`验证
+ 建立反向连接成功，服务器将接收到的数据发送给客户端，并将客户端发送过来的数据发送出去

## 配置

服务器端配置文件`server.conf`：

```
# 服务器配置
:value
port = 5000

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

客户端配置文件`client.conf`：

```
:value
name = A
password = 123456
server = 192.168.9.10
serverPort = 5000
```

## 启动客户端

```bash
$ ttclient -c client.conf
```

## 启动服务端

```bash
$ ttserver -c server.conf
```

如果更改了配置项中的`:client`和`:rule`部分，可在执行时添加`-r`选项重新加载配置（热更新，服务进程不重启）：

```bash
$ ttserver -c server.conf -r
```


## License

```
The MIT License (MIT)

Copyright (c) 2016 Zongmin Lei (老雷) <leizongmin@gmail.com>
http://ucdok.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
