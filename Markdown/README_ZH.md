# EbookDatabase - 電子書籍檢索系統 ————————Form Opencc

[ENGLISH](README_EN.md) | [日本語](README_JP.md) | [正體中文](README_ZH.md)

## 簡介

這是一款本地化的電子書檢索系統，支持使用高級檢索進行查詢。

該項目使用 FastAPI 和 SQLite 數據庫構建，並可以通過本項目發行包輕鬆部署。

本項目提供的數據庫是通過很多渠道彙集到一起形成的，所以會出現信息不全等種種情況發生，還望諒解。

如果你發現數據庫內容錯誤或者有好的內容想要與大家分享，請與本人聯繫，

如果參與的人多，數據庫會定期更新，人人爲我，我爲人人。

可以添加羣聊與同好一起交流

QQ羣：942385978

![主頁頁面](image/img.png)
![主頁頁面](image/img_1.png)

## 數據庫備份

### [點擊查看數據庫列表](数据库下载文档.md)

## 快速開始

視頻：

YouTube：https://youtu.be/-jD8OsF6di4

bilibili：https://www.bilibili.com/video/BV1fN4y1r7fP/

其他倉庫地址：https://gitee.com/etojsyc/EbookDatabase

### 本地運行

---

#### 方法一 (推薦！使用發佈包運行)

1. 下載本項目發佈的軟件包

2. 解壓下載下來的軟件包

3. 下載本項目的數據庫文件並且存放到instance文件夾

4. 雙擊exe一鍵啓動本項目

5. 然後在 http://127.0.0.1:10223/ 上使用它。

---

#### 方法二 (使用源代碼運行)


1. 打開終端或命令提示符，並導航到您項目的根目錄。

2. 創建一個新的虛擬環境，您可以使用以下命令：

```python
python -m venv venv
```

這將在項目根目錄中創建一個名爲`venv`的新虛擬環境。

3. 激活虛擬環境。在 Windows 上，使用以下命令：

```python
venv\Scripts\activate
```

在 macOS 和 Linux 上，使用以下命令：

```python
source venv/bin/activate
```

激活虛擬環境後，終端前面的提示符會顯示虛擬環境名稱，表示虛擬環境已經激活。

4. 接下來，安裝項目所需的依賴。使用以下命令在虛擬環境中安裝依賴：

```python
pip install -r requirements.txt
```

這將會根據`requirements.txt`文件安裝項目所需的所有依賴，而且這些依賴將僅在虛擬環境中可用。

5. 最後，運行應用程序。使用以下命令啓動應用程序：

```python
python app.py
```
這將在虛擬環境中運行應用程序，然後在 http://127.0.0.1:10223/ 上使用它。

---
#### 方法三(使用源代碼構建Windows可執行程序)

使用源代碼構建Windows可執行程序

1. 確保您是在Windows上執行本步驟

2. 與方法二上一樣的操作，但是在第五步中，使用以下命令構建應用程序：

```python
python setup.py build
```

這將在項目根目錄中創建一個名爲`build`的新目錄，其中包含構建的應用程序。

---
#### 方法四(使用Docker部署)

1. 從dockerhub直接拉取鏡像

   ```bash
   docker pull hellohistory/ebookdatabase
   ```
2. 構建完成後，運行以下命令以啓動容器：

   ```bash
   docker run -v /path/to/instance:/app/instance -v /path/to/logs:/app/logs  -p 10223:10223 ebookdatabase
   ```
您需要將/path/to/instance替換爲您本地的數據庫文件存放路徑，/path/to/logs替換爲您本地的日誌文件存放路徑。

這將啓動一個名爲 `ebookdatabase` 的 Docker 容器，並將容器的 10223 端口映射到主機的同一端口。

3. 在瀏覽器中訪問 `http://127.0.0.1:10223/` 以使用應用。


---
#### 方法五(自行構建 Docker 容器進行使用)

自行構建 Docker 容器進行使用

1. 確保您的系統已安裝 Docker。如果尚未安裝，請參閱 [Docker 官方網站](https://www.docker.com/) 上的安裝指南。

2. 克隆或下載本項目的源碼到您的本地環境。確保 `Dockerfile` 文件位於項目根目錄中。

3. 在終端或命令提示符中，導航到項目根目錄，並運行以下命令構建 Docker 鏡像：

   ```bash
   docker build -t ebookdatabase .
   ```

4. 構建完成後，運行以下命令以啓動容器：

   ```bash
   docker run -v /path/to/instance:/app/instance  -p 10223:10223 ebookdatabase
   ```
   您需要將/path/to/instance替換爲您本地的數據庫文件存放路徑。

   這將啓動一個名爲 `ebookdatabase` 的 Docker 容器，並將容器的 10223 端口映射到主機的同一端口。

5. 在瀏覽器中訪問 `http://127.0.0.1:10223/` 以使用應用。

---

## 功能

- 支持本地基礎檢索和高級檢索
- 支持模糊搜索和準確搜索
- 分頁顯示結果

![檢索結果頁](image/img_3.png)
![檢索結果頁](image/img_4.png)

## Bug反饋

在運行本項目的時候出現問題，請提交issues反饋，反饋格式如下
```bash
1.運行環境

2.使用的查詢條件

3.錯誤界面截圖
```

## 聲明
   ```
本項目僅用於學習交流，禁止使用到任何的商業場景當中

本項目絕對不會以任何形式授權任何人用於商業用途，任何商業場景申明使用到本項目均爲造謠

如若侵犯權益，請聯繫本項目刪除

本項目不承擔任何責任，責任均由使用者負責，詳情請閱讀許可證文件
   ```
