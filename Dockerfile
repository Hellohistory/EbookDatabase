FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

RUN which uvicorn

COPY app.py .
COPY module module/
COPY instance instance/
COPY search search/
COPY templates templates/
COPY static static/

RUN mkdir -p /app/log

EXPOSE 10223

CMD ["/usr/local/bin/uvicorn", "app:app", "--host", "0.0.0.0", "--port", "10223"]
