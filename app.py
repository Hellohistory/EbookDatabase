import json
import logging
import os
import threading
import time
import webbrowser
from pathlib import Path
from typing import List, Optional

import httpx
import markdown2
import uvicorn
from fastapi import FastAPI, Request, Query, Depends
from fastapi.responses import FileResponse
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from module.database_manager import DatabaseManager
from module.logging_config import LogManager
from module.utils import validate_page_size
from search.database_queries import perform_search
from search.search_utils import build_search_query, build_advanced_search_query

# 初始化日志管理器
log_manager = LogManager('log/app.log')
logger = log_manager.get_logger()

# 现在可以使用 logger 来记录信息
logger.info("日志信息已经记录")

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


# 获取设置
@app.get("/settings/")
async def get_settings():
    try:
        with open('static/settings.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"读取设置文件失败: {e}")
        return {"status": "error", "message": "读取设置文件失败"}


# 更新设置
@app.post("/settings/")
async def update_settings(data: dict):
    try:
        with open('static/settings.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        return {"status": "success", "message": "设置已更新"}
    except Exception as e:
        logger.error(f"更新设置文件失败: {e}")
        return {"status": "error", "message": "更新设置文件失败"}


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


async def get_markdown_content(url):
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        return markdown2.markdown(resp.text)


@app.get("/about/")
async def about(request: Request):
    # 这里只渲染页面框架，不加载具体内容
    return templates.TemplateResponse("about.html", {"request": request})


@app.get("/about/content1")
async def about_content1():
    url = 'https://gitee.com/etojsyc/EbookDatabase/raw/main/Markdown/Pillory.md'
    html_content = await get_markdown_content(url)
    return HTMLResponse(content=html_content)


@app.get("/about/content2")
async def about_content2():
    url = 'https://gitee.com/etojsyc/EbookDatabase/raw/main/Markdown/EbookDataTools.md'
    html_content = await get_markdown_content(url)
    return HTMLResponse(content=html_content)


@app.get("/about/content3")
async def about_content3():
    url = 'https://gitee.com/etojsyc/EbookDatabase/raw/main/Markdown/UpdateLog.md'
    html_content = await get_markdown_content(url)
    return HTMLResponse(content=html_content)


@app.get("/about/content4")
async def about_content4():
    url = 'https://gitee.com/etojsyc/EbookDatabase/raw/main/Markdown/DatabaseDownload.md'
    html_content = await get_markdown_content(url)
    return HTMLResponse(content=html_content)


@app.get("/about/content5")
async def about_content5():
    return FileResponse('static/LICENSE.txt')


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
    # 构建搜索查询
    query_str, total_query_str, params = build_search_query(query, field, fuzzy, page_size, page)
    start_time = time.time()

    # 执行数据库查询并获取结果
    all_books, total_records = await perform_search(db_manager, query_str, total_query_str, params, db_names,
                                                    available_databases)

    # 计算总页数
    total_pages = -(-total_records // page_size)  # 向上取整

    end_time = time.time()
    search_time = end_time - start_time

    # 生成响应
    return templates.TemplateResponse(
        "search.html",
        {
            "request": request,
            "books": all_books,
            "current_page": page,
            "total_pages": total_pages,
            "query": query,
            "field": field,
            "fuzzy": fuzzy,
            "db_names": db_names,
            "total_records": total_records,
            "search_time": search_time
        }
    )


@app.get("/search/advanced", response_class=HTMLResponse)
async def advanced_search(
        request: Request,
        db_names: Optional[List[str]] = Query(None),  # 添加db_names作为查询参数
        field: List[str] = Query(...),
        query: List[str] = Query(...),
        logic: List[str] = Query(...),
        fuzzy: List[bool] = Query(default=None),
        page: Optional[int] = Query(default=1),
        page_size: int = Depends(validate_page_size)
):
    # 验证参数长度是否一致
    if not (len(field) == len(query) == len(logic) + 1):
        return {"status": "error", "message": "查询参数不匹配"}

    start_time = time.time()

    # 构建高级搜索查询
    query_str, total_query_str, params = build_advanced_search_query(field, query, logic, fuzzy, page_size, page)

    # 执行查询并获取结果
    all_books, total_records = await perform_search(db_manager, query_str, total_query_str, params, db_names,
                                                    available_databases)

    search_time = time.time() - start_time

    total_pages = -(-total_records // page_size)  # 向上取整

    return templates.TemplateResponse(
        "search.html",
        {
            "request": request,
            "books": all_books,
            "current_page": page,
            "total_pages": total_pages,
            "query": query,
            "field": field,
            "fuzzy": fuzzy,
            "logic": logic,
            "db_names": db_names,
            "total_records": total_records,
            "search_time": search_time
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
    uvicorn.run(app, host='0.0.0.0', port=10223)
    logger.info("FastAPI 应用已关闭")
