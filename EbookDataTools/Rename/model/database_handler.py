import os
import re
import sqlite3

from PyQt5.QtWidgets import QTableWidgetItem, QApplication

from Rename.model.file_handler import get_files_from_directory


def query_title_from_database(connection, ss_code):
    try:
        cursor = connection.cursor()
        query = "SELECT title FROM books WHERE SS_code = ?"
        cursor.execute(query, (ss_code,))
        result = cursor.fetchone()
        return result[0] if result else "无此列"
    except sqlite3.Error as error:
        return "查询错误: " + str(error)


def queryDatabaseForFileNames(db_folder_path, folder_path, tableWidget):
    try:
        db_files = get_files_from_directory(db_folder_path, recursive=True)
        db_files = [f for f in db_files if f.endswith('.db')]
        files = get_files_from_directory(folder_path, recursive=True)
        tableWidget.setRowCount(len(files))

        found_ss_codes = set()

        for row, file_path in enumerate(files):
            QApplication.processEvents()
            file_name = os.path.basename(file_path)
            match = re.search(r'\d{8}', file_name)
            ss_code = match.group() if match else None

            if ss_code and ss_code not in found_ss_codes:
                for db_file in db_files:
                    connection = sqlite3.connect(db_file)
                    title = query_title_from_database(connection, ss_code)
                    connection.close()

                    if title != "无此列":
                        tableWidget.setItem(row, 1, QTableWidgetItem(title))
                        found_ss_codes.add(ss_code)
                        break
                else:
                    tableWidget.setItem(row, 1, QTableWidgetItem("无此列"))
            else:
                message = "已找到记录" if ss_code in found_ss_codes else "无效的 SS_code"
                tableWidget.setItem(row, 1, QTableWidgetItem(message))

            tableWidget.setItem(row, 0, QTableWidgetItem(file_path))
            tableWidget.setItem(row, 2, QTableWidgetItem("待处理"))

    except Exception as e:
        print("发生错误:", str(e))
