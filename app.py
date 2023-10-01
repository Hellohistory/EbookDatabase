import logging
import math
import time
from logging.handlers import TimedRotatingFileHandler
from typing import Optional

import databases
import uvicorn
from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine, MetaData

# 创建一个处理器，每天凌晨回滚日志文件，保留最近 7 天的日志文件，并使用 UTF-8 编码
handler = TimedRotatingFileHandler('app.log', when="midnight", interval=1, backupCount=7, encoding='utf-8')

# 设置日志格式
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)

# 获取 logger 对象并设置日志级别
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 将处理器添加到 logger 对象
logger.addHandler(handler)

# 数据库配置
DATABASE_URL = "sqlite:///instance/DX_2.0-5.0.db"
database = databases.Database(DATABASE_URL)
metadata = MetaData()

# SQLAlchemy模型
engine = create_engine(DATABASE_URL)
metadata.create_all(engine)

# FastAPI应用实例
app = FastAPI()
templates = Jinja2Templates(directory="templates")

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/favicon.ico")
async def favicon():
    return {}

# 路由
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/search/", response_class=HTMLResponse)
async def search(
        request: Request,
        query: str,
        field: str,
        fuzzy: Optional[str] = Query(default=None),  # 接收字符串
        page: Optional[str] = Query(default=None),  # 接收字符串
        page_size: Optional[str] = Query(default=None)  # 接收字符串
):
    # 如果fuzzy为None或空字符串，设置默认值
    if not fuzzy:
        fuzzy = "false"
    # 将fuzzy转换为布尔值
    fuzzy = fuzzy.lower() in ["true", "1"]

    # 如果page为None或空字符串，或者不是正数，设置默认值
    try:
        page = int(page)
        if page <= 0:
            raise ValueError
    except (ValueError, TypeError):
        page = 1

    # 如果page_size为None或空字符串，或者不是正数，设置默认值
    try:
        page_size = int(page_size)
        if page_size <= 0:
            raise ValueError
    except (ValueError, TypeError):
        page_size = 10

    start_time = time.time()  # 记录开始时间

    # 初始化查询
    query_conditions = []
    params = {}

    # 构建模糊搜索或准确检索的条件
    if field == "title":
        query_conditions.append(f"title LIKE :title" if fuzzy else "title = :title")
        params['title'] = f"%{query}%" if fuzzy else query
    elif field == "author":
        query_conditions.append(f"author LIKE :author" if fuzzy else "author = :author")
        params['author'] = f"%{query}%" if fuzzy else query
    elif field == "publisher":
        query_conditions.append(f"publisher LIKE :publisher" if fuzzy else "publisher = :publisher")
        params['publisher'] = f"%{query}%" if fuzzy else query
    elif field == "isbn":
        query_conditions.append(f"isbn LIKE :isbn" if fuzzy else "isbn = :isbn")
        params['isbn'] = f"%{query}%" if fuzzy else query
    elif field == "sscode":
        query_conditions.append(f"pubdate LIKE :sscode" if fuzzy else "sscode = :sscode")
        params['sscode'] = f"%{query}%" if fuzzy else query

    # 构建查询语句
    query_str = "SELECT * FROM books"
    total_query_str = "SELECT COUNT(*) FROM books"
    if query_conditions:
        conditions_str = " WHERE " + " AND ".join(query_conditions)
        query_str += conditions_str
        total_query_str += conditions_str
    # 记录查询信息
    logging.info(f"执行查询: 字段={field}, 查询内容={query}, 是否模糊搜索={fuzzy}")

    # 从数据库获取总记录数
    total_records = await database.fetch_one(query=total_query_str, values=params)
    total_pages = math.ceil(total_records[0] / page_size)  # 计算总页数

    # 分页设置
    total_pages = math.ceil(total_records[0] / page_size)
    # 检查页面参数是否超过总页数，并重置为总页数如果是的话
    page = min(page, total_pages)
    offset = (page - 1) * page_size

    # 构建查询语句
    query_str += f" LIMIT {page_size} OFFSET {offset}"

    # 从数据库获取数据
    books = await database.fetch_all(query=query_str, values=params)

    # 记录查询结果
    logging.info(f"查询结果: 找到了 {total_records[0]} 条记录")
    end_time = time.time()  # 记录结束时间
    search_time = end_time - start_time  # 计算检索时间
    logging.info(f"检索耗时: {search_time} 秒")

    # 返回结果
    return templates.TemplateResponse(
        "search.html",
        {
            "request": request,
            "books": books,
            "search_time": search_time,
            "current_page": page,
            "total_pages": math.ceil(total_records[0] / page_size),
            "query": query,
            "field": field,
            "fuzzy": fuzzy,
            "total_records": total_records[0]
        }
    )


if __name__ == '__main__':

    # 允许任何地址请求10223端口访问服务
    uvicorn.run(app, host='0.0.0.0', port=10223)
