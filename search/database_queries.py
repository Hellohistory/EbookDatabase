import asyncio
from typing import List, Optional, Dict, Tuple
from module.database_manager import DatabaseManager


async def perform_search(
        db_manager: DatabaseManager,
        query_str: str,
        total_query_str: str,
        params: Dict,
        db_names: Optional[List[str]],
        available_databases: List[str]
) -> Tuple[List, int]:
    """
    执行数据库查询并返回结果。

    参数:
        db_manager: DatabaseManager 的实例
        query_str: 查询语句字符串
        total_query_str: 用于计算总记录数的查询语句
        params: 查询参数
        db_names: 要查询的数据库列表
        available_databases: 可用的数据库列表

    返回:
        all_books: 所有符合条件的书籍
        total_records: 符合条件的书籍总数
    """
    if db_names is None:
        # 如果没有提供数据库名称，直接返回空结果
        return [], 0

    # 创建查询任务
    tasks = [asyncio.create_task(db_manager.fetch_all(db_name, query_str, params)) for db_name in db_names if
             db_name in available_databases]
    total_tasks = [asyncio.create_task(db_manager.fetch_one(db_name, total_query_str, params)) for db_name in db_names
                   if db_name in available_databases]

    # 并发执行所有查询任务
    results, total_results = await asyncio.gather(
        asyncio.gather(*tasks),
        asyncio.gather(*total_tasks)
    )

    all_books = []
    total_records = 0

    # 汇总查询结果
    for books in results:
        if books is not None:
            all_books.extend(books)

    # 汇总总记录数
    for total in total_results:
        if total is not None:
            total_records += total[0]

    return all_books, total_records
