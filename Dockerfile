# 使用 Python 3.9 基础镜像
FROM python:3.9

# 设置工作目录
WORKDIR /app

# 将 requirements.txt 文件复制到工作目录
COPY requirements.txt .

# 安装依赖
RUN pip install --no-settings-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# 将 app.py, templates 和其他需要的文件复制到工作目录
COPY app.py .
COPY templates templates/

# 创建一个目录用于存放日志和数据库
RUN mkdir /app/log && \
    mkdir /app/instance

# 暴露端口 10223
EXPOSE 10223

# 运行命令
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "10223"]
