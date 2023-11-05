import logging
from logging.handlers import TimedRotatingFileHandler


class LogManager:
    def __init__(self, log_file: str, backup_count: int = 7):
        # 创建一个处理器，每天凌晨回滚日志文件
        handler = TimedRotatingFileHandler(
            log_file, when="midnight", interval=1, backupCount=backup_count, encoding='utf-8'
        )

        # 设置日志格式
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)

        # 获取 logger 对象并设置日志级别
        self.logger = logging.getLogger()
        self.logger.setLevel(logging.INFO)

        # 将处理器添加到 logger 对象
        self.logger.addHandler(handler)

    def get_logger(self):
        return self.logger
