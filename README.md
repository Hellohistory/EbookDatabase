# DX2_5 - DX书库2.0-5.0检索系统

## 简介

这是读秀书库的本地化检索版本。该项目使用 FastAPI 和 SQLite 数据库构建，并可以通过 Docker 轻松部署。

![主页页面](image/img_1.png)

## 数据库备份

数据库备份可以通过以下网盘链接获取：

- [网盘链接](https://www.123pan.com/s/oNv9-zWI2.html)  提取码:dx25

## 快速开始

### 本地运行

1.下载本项目所提供的数据库

2.将数据库放置到instance文件夹之中

3.安装本项目所需要的依赖

4.运行app.py

这样就可以在 `http://localhost:10223/`当中使用

### 使用 Docker 运行

1. 首先，确保您已经安装了 [Docker](https://www.docker.com/products/docker-desktop)。

2. 克隆此仓库：

    ```bash
    git clone https://github.com/Hellohistory/DX2_5.git
    cd your-repo-dir
    ```

3. 构建 Docker 镜像：

    ```bash
    docker build -t dx2_5 .
    ```

4. 运行 Docker 容器：

    ```bash
    docker run -p 10223:10223 dx2_5
    ```

这样就可以在 `http://localhost:10223/`当中使用

## Docker 容器存储设置

在 Dockerfile 中，使用 `RUN mkdir /app/instance` 命令来在容器的 `/app` 工作目录下创建一个名为 `instance` 的文件夹。这个文件夹用于存放 SQLite 数据库。

为了使这个数据库文件夹能够从外部访问并持久化存储，可以在运行 Docker 容器时使用 `-v` 参数来将这个 `instance` 文件夹映射到宿主机的一个特定目录。

   ```bash
   docker run -v /path/to/instance:/app/instance -v /path/to/logs:/app/logs your-image-name
   ```

这里，`/path/to/instance` 和 `/path/to/logs` 是在宿主机上用于存放数据库和日志的目录。


## 功能

- 本地化检索
- 支持模糊搜索和准确搜索
- 分页显示结果

![检索结果页](image/img_2.png)

## 声明
   ```
本项目仅用于学习交流，禁止使用到任何的商业场景当中

本项目绝对不会以任何形式授权任何人用于商业用途，任何商业场景申明使用到本项目均为造谣

如若侵犯权益，请联系本项目删除

本项目不承担任何责任，责任均由使用者负责，详情请阅读许可证文件
   ```
