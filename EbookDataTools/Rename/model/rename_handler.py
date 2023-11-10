import os
from PyQt5.QtWidgets import QTableWidgetItem
from opencc import OpenCC

def startRenamingFiles(tableWidget, progressBar, changeExtensionCheckBox, traditionalSimplifiedCheckBox):
    total_files = tableWidget.rowCount()
    progressBar.setValue(0)
    cc = OpenCC('s2t')

    for row in range(total_files):
        original_file = tableWidget.item(row, 0).text()
        new_name = tableWidget.item(row, 1).text()

        if traditionalSimplifiedCheckBox.isChecked():
            new_name = cc.convert(new_name)

        original_extension = os.path.splitext(original_file)[1]

        if changeExtensionCheckBox.isChecked() and original_extension.lower() == ".uvz":
            new_extension = ".zip"
        else:
            new_extension = original_extension

        new_file = os.path.join(os.path.dirname(original_file), os.path.splitext(new_name)[0] + new_extension)

        try:
            os.rename(original_file, new_file)
            tableWidget.setItem(row, 2, QTableWidgetItem("重命名成功"))
        except Exception as e:
            tableWidget.setItem(row, 2, QTableWidgetItem(f"错误: {e}"))

        progressBar.setValue(int((row + 1) / total_files * 100))

    progressBar.setValue(100)
