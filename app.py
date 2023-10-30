import asyncio
import logging
import os
import threading
import time
import webbrowser
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, Request, Query, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from module.database_manager import DatabaseManager

# 创建一个处理器，每天凌晨回滚日志文件，保留最近 7 天的日志文件，并使用 UTF-8 编码
handler = TimedRotatingFileHandler('log/app.log', when="midnight", interval=1, backupCount=7, encoding='utf-8')

# 设置日志格式
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)

# 获取 logger 对象并设置日志级别
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 将处理器添加到 logger 对象
logger.addHandler(handler)

# FastAPI 和 DatabaseManager 实例化
app = FastAPI()
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

db_manager = DatabaseManager()

# 可用数据库列表
available_databases = []


@app.on_event("startup")
async def startup():
    global available_databases
    available_databases = [f for f in os.listdir('instance') if f.endswith('.db')]
    logger.info(f"找到 {len(available_databases)} 个数据库文件：{available_databases}")

    # 连接到这些数据库
    for db_name in [Path(f).stem for f in available_databases]:
        connected = await db_manager.connect(db_name)
        if connected:
            logger.info(f"成功连接到数据库 {db_name}")
        else:
            logger.warning(f"连接到数据库 {db_name} 失败")


@app.get("/available_dbs/")
async def get_available_databases():
    return {"databases": available_databases}


@app.post("/connect_db/")
async def connect_database(db_name: str):
    logging.info(f"尝试连接数据库：{db_name}")
    if db_name in available_databases:
        connection_status = await db_manager.connect(db_name)
        if connection_status:
            logging.info(f"数据库 {db_name} 连接成功")
            return {"status": "success", "message": f"成功连接到数据库 {db_name}"}
        else:
            logging.error(f"数据库 {db_name} 连接失败")
            return {"status": "error", "message": f"数据库 {db_name} 已连接"}
    else:
        logging.error(f"数据库 {db_name} 不存在")
        return {"status": "error", "message": f"数据库 {db_name} 不存在"}


@app.get("/favicon.ico")
async def favicon():
    return FileResponse(Path("static/logo.ico"), media_type="image/x-icon")


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "available_databases": available_databases})


async def validate_page_size(page_size: str = Query("10", alias="page_size")) -> int:
    try:
        page_size_int = int(page_size) if page_size else 10  # 如果是空字符串，则使用默认值 10
    except ValueError:
        raise HTTPException(status_code=400, detail="page_size must be a valid integer")

    if page_size_int < 1:
        raise HTTPException(status_code=400, detail="page_size must be greater than zero")

    return page_size_int


@app.get("/search/", response_class=HTMLResponse)
async def search(
        request: Request,
        query: str,
        field: str,
        db_names: Optional[List[str]] = Query(None),
        fuzzy: Optional[str] = Query(default=None),
        page: Optional[int] = Query(default=1),
        page_size: int = Depends(validate_page_size)
):
    logger.info(
        f"搜索请求参数 - 查询: {query}, 字段: {field}, 数据库: {db_names}, 模糊搜索: {fuzzy}, 页面: {page}, 每页大小: {page_size}")
    start_time = time.time()

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
        query_conditions.append(f"ISBN LIKE :isbn" if fuzzy else "ISBN = :isbn")
        params['isbn'] = f"%{query}%" if fuzzy else query
    elif field == "sscode":
        query_conditions.append(f"SS_code LIKE :sscode" if fuzzy else "SS_code = :sscode")
        params['sscode'] = f"%{query}%" if fuzzy else query

    query_str = "SELECT * FROM books"
    total_query_str = "SELECT COUNT(*) FROM books"
    if query_conditions:
        conditions_str = " WHERE " + " AND ".join(query_conditions)
        query_str += conditions_str
        total_query_str += conditions_str

    offset = (page - 1) * page_size
    query_str += f" LIMIT {page_size} OFFSET {offset}"

    if db_names is not None:
        tasks = [asyncio.create_task(db_manager.fetch_all(db_name, query_str, params)) for db_name in db_names if
                 db_name in available_databases]
        total_tasks = [asyncio.create_task(db_manager.fetch_one(db_name, total_query_str, params))
                       for db_name in db_names if
                       db_name in available_databases]
    else:
        logging.warning("db_names 是 None，无法执行数据库查询")
        return

    # 并发执行所有任务并获取结果
    results, total_results = await asyncio.gather(
        asyncio.gather(*tasks),
        asyncio.gather(*total_tasks)
    )

    all_books = []
    total_records = 0

    for books in results:
        if books is not None:
            all_books.extend(books)

    for total in total_results:
        if total is not None:
            total_records += total[0]

    total_pages = -(-total_records // page_size)  # 向上取整

    end_time = time.time()
    search_time = end_time - start_time

    return templates.TemplateResponse(
        "search.html",
        {
            "request": request,
            "books": all_books,
            "search_time": search_time,
            "current_page": page,
            "total_pages": total_pages,
            "query": query,
            "field": field,
            "fuzzy": fuzzy,
            "db_names": db_names,
            "total_records": total_records
        }
    )


# 用于打开浏览器
def open_browser():
    webbrowser.open("http://127.0.0.1:10223", new=2)


if __name__ == '__main__':
    # 使用线程来执行打开浏览器
    threading.Thread(target=open_browser).start()

    # 允许任何地址请求10223端口访问服务
    logger.info("启动 FastAPI 应用")
    uvicorn.run(app, host='127.0.0.1', port=10223)
    logger.info("FastAPI 应用已关闭")
