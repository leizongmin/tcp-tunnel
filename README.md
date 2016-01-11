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

[中文版文档](README.zh.md)

# tcp-tunnel

TCP tunnel server & client, multi-user support


## Installation

**required `Node.js v4.0` or later version**

```bash
$ npm install tcp-tunnel -g
```

## Configuration

Server side configuration file `server.conf`：

```
# 服务器配置
:value
port = 5000

# clients
# name:password
:client
A:123456
B:123456

# rules
# serverPort -> clientName:port
:rule
2022 -> A:22
3306 -> A:3306
6379 -> B:6379
```

Client side configuration file `client.conf`：

```
:value
name = A
password = 123456
server = 192.168.9.10
serverPort = 5000

# mapping port
# sourcePort -> targetHost:port
:rule
3306 -> 192.168.99.100:3306
6379 -> 192.168.99.100:6379
```

## Start client

```bash
$ ttclient -c client.conf
```

## Start server

```bash
$ ttserver -c server.conf
```

If you have change the configuration item `:client` or `:rule`, you can pass additional argument `-r` to start the server, the runing server will just reload the newest configuration (not restart process):

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
