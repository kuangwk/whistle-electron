# electron 打包的 whistle 客户端

用 electron 包装了下 whistle localhost 管理端，方便独立操作。
同时在头部标题栏增加当前 ip 和 port 展示，方便使用。

## 自助打包

1. 确保本地有 whistle 环境, 详见 [whistle 文档](https://wproxy.org/whistle/install.html)

2. 进入项目目录，安装依赖

```
npm install
```

3. 打包，只能输出适用于当前机器架构的包。

```
npm run make
```

4. 在项目 `out` 目录会有对应的安装包和压缩包，自取。
