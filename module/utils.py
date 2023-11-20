from fastapi import Query, HTTPException
import json
from module.logging_config import LogManager

# 创建 LogManager 的实例
log_manager = LogManager('log/app.log')
# 获取 logger 实例
logger = log_manager.get_logger()


async def get_default_page_size():
    try:
        with open('static/settings.json', 'r', encoding='utf-8') as f:
            settings = json.load(f)
        return settings.get('pageSize', 20)  # 如果没有设置，则返回默认值20
    except Exception as e:
        logger.error(f"读取默认页面大小失败: {e}")
        return 20  # 读取文件失败时返回硬编码的默认值


async def validate_page_size(page_size: str = Query(None, alias="page_size")) -> int:
    if page_size is None:
        page_size = await get_default_page_size()  # 如果没有提供page_size，从文件中读取默认值

    try:
        page_size_int = int(page_size)
    except ValueError:
        raise HTTPException(status_code=400, detail="page_size必须是一个有效的整数")

    if page_size_int < 1:
        raise HTTPException(status_code=400, detail="page_size必须大于零")

    return page_size_int
