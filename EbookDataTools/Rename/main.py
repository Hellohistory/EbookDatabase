import sys
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                             QPushButton, QLineEdit, QProgressBar, QTableWidget,
                             QRadioButton, QCheckBox, QFileDialog, QTableWidgetItem)
from PyQt5.QtCore import QSize
from opencc import OpenCC

from Rename.model.database_handler import queryDatabaseForFileNames
from Rename.model.file_handler import get_files_from_directory
from Rename.model.rename_handler import startRenamingFiles


class MainGUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.cc = OpenCC('s2t')
        self.original_names = {}
        self.initUI()

    def applyTraditionalSimplifiedConversion(self):
        total_rows = self.tableWidget.rowCount()
        for row in range(total_rows):
            original_text_item = self.tableWidget.item(row, 1)
            if original_text_item:
                if self.traditionalSimplifiedCheckBox.isChecked():
                    if row not in self.original_names:
                        self.original_names[row] = original_text_item.text()
                    converted_text = self.cc.convert(self.original_names[row])
                    self.tableWidget.setItem(row, 1, QTableWidgetItem(converted_text))
                else:
                    if row in self.original_names:
                        self.tableWidget.setItem(row, 1, QTableWidgetItem(self.original_names[row]))

    def initUI(self):
        self.setWindowTitle('EbookDataRename V0.0.1')
        self.setMinimumSize(QSize(800, 600))

        centralWidget = QWidget(self)
        self.setCentralWidget(centralWidget)
        mainLayout = QVBoxLayout(centralWidget)

        self.setupLayout(mainLayout)

        self.applyMaterialDesignStyle()

    def initiateDatabaseQuery(self):
        db_path = self.local_db_lineedit.text()
        folder_path = self.targetFolderLineEdit.text()
        queryDatabaseForFileNames(db_path, folder_path, self.tableWidget)

    def setupLayout(self, mainLayout):
        modeLayout = QHBoxLayout()
        self.localModeRadioButton = QRadioButton('本地模式')
        self.remoteModeRadioButton = QRadioButton('远程模式')
        self.localModeRadioButton.setChecked(True)
        modeLayout.addWidget(self.localModeRadioButton)
        modeLayout.addWidget(self.remoteModeRadioButton)
        mainLayout.addLayout(modeLayout)

        self.targetFolderLineEdit = QLineEdit()
        self.selectTargetFolderButton = QPushButton('选择目标文件夹')
        self.selectTargetFolderButton.clicked.connect(self.selectTargetFolder)
        targetFolderLayout = QHBoxLayout()
        targetFolderLayout.addWidget(self.targetFolderLineEdit)
        targetFolderLayout.addWidget(self.selectTargetFolderButton)
        mainLayout.addLayout(targetFolderLayout)

        self.localModeRadioButton.toggled.connect(self.onModeChanged)

        self.local_db_lineedit = QLineEdit()
        self.selectFolderButton = QPushButton('选择文件夹')
        self.selectFolderButton.clicked.connect(self.selectDatabase)
        folderLayout = QHBoxLayout()
        folderLayout.addWidget(self.local_db_lineedit)
        folderLayout.addWidget(self.selectFolderButton)
        mainLayout.addLayout(folderLayout)

        self.remote_url_lineedit = QLineEdit()
        self.remote_url_lineedit.setPlaceholderText("输入API地址")
        mainLayout.addWidget(self.remote_url_lineedit)

        self.changeExtensionCheckBox = QCheckBox("将 .uvz 改为 .zip")
        self.traditionalSimplifiedCheckBox = QCheckBox("呈现效果为繁体书名")
        self.traditionalSimplifiedCheckBox.stateChanged.connect(self.applyTraditionalSimplifiedConversion)
        checkBoxLayout = QHBoxLayout()
        checkBoxLayout.addWidget(self.changeExtensionCheckBox)
        checkBoxLayout.addWidget(self.traditionalSimplifiedCheckBox)
        mainLayout.addLayout(checkBoxLayout)

        self.tableWidget = QTableWidget()
        self.tableWidget.setColumnCount(3)
        self.tableWidget.setHorizontalHeaderLabels(['文件名', '重命名后文件名', '状态'])
        mainLayout.addWidget(self.tableWidget)

        self.queryButton = QPushButton('查询文件名')
        self.queryButton.clicked.connect(self.initiateDatabaseQuery)
        mainLayout.addWidget(self.queryButton)

        self.renameButton = QPushButton('开始重命名')
        self.renameButton.clicked.connect(self.initiateRenaming)
        mainLayout.addWidget(self.renameButton)

        self.progressBar = QProgressBar()
        mainLayout.addWidget(self.progressBar)

        self.onModeChanged()

    def onModeChanged(self):
        isLocalMode = self.localModeRadioButton.isChecked()
        self.local_db_lineedit.setVisible(isLocalMode)
        self.selectFolderButton.setVisible(isLocalMode)
        self.remote_url_lineedit.setVisible(not isLocalMode)

    def selectDatabase(self):
        folder_path = QFileDialog.getExistingDirectory(self, "选择数据库文件夹")
        if folder_path:
            self.local_db_lineedit.setText(folder_path)

    def updateTableWithFiles(self, folder_path):
        file_list = get_files_from_directory(folder_path)
        self.tableWidget.setRowCount(len(file_list))
        for row, file in enumerate(file_list):
            self.tableWidget.setItem(row, 0, QTableWidgetItem(file))

    def selectTargetFolder(self):
        folder_path = QFileDialog.getExistingDirectory(self, "选择目标文件夹")
        if folder_path:
            self.targetFolderLineEdit.setText(folder_path)
            self.updateTableWithFiles(folder_path)

    def initiateRenaming(self):
        startRenamingFiles(self.tableWidget, self.progressBar, self.changeExtensionCheckBox, self.traditionalSimplifiedCheckBox)

    def applyMaterialDesignStyle(self):
        pass


if __name__ == "__main__":
    app = QApplication(sys.argv)
    mainWindow = MainGUI()
    mainWindow.show()
    sys.exit(app.exec_())
