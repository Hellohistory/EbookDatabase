# logging_config.py

import logging
from logging.handlers import TimedRotatingFileHandler


# 日志配置函数
def setup_logging() -> None:
    handler = TimedRotatingFileHandler('log/app.log', when="midnight", interval=1, backupCount=7, encoding='utf-8')
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
