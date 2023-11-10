import sqlite3
import random
import os


def get_ss_codes(db_path, table_name):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute(f"SELECT SS_code FROM {table_name}")
    ss_codes = [row[0] for row in cursor.fetchall()]

    cursor.close()
    conn.close()

    return ss_codes


def generate_fake_files(ss_codes, num_files, file_types, output_dir):
    # 确保输出目录存在
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 随机选择SS_code并生成文件
    for _ in range(num_files):
        ss_code = random.choice(ss_codes)
        file_type = random.choice(file_types)
        file_name = f"{ss_code}.{file_type}"
        file_path = os.path.join(output_dir, file_name)

        # 创建一个空文件
        with open(file_path, 'w') as file:
            pass


db_path = r"D:\Code\Python\EbookDatabase\instance\DX_2.0-5.0.db"
table_name = "books"
output_dir = "fake_files"
file_types = ["uvz", "pdf", "txt"]

ss_codes = get_ss_codes(db_path, table_name)

num_files = 200

generate_fake_files(ss_codes, num_files, file_types, output_dir)
