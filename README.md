# tcp-tunnel
快速建立TCP隧道，支持多客户端及密码认证

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
