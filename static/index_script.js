// 当页面加载完成后执行此函数
window.onload = function() {
  // 使用 fetch API 请求已连接的数据库列表
  fetch('/available_dbs/')
  .then(response => response.json())  // 解析返回的 JSON 数据
  .then(data => {
    // 生成数据库选择的复选框
    const checkboxContainer = document.getElementById('database-checkboxes');
    data.databases.forEach(db => {
      const checkbox = document.createElement('input');
      checkbox.type = "checkbox";
      checkbox.name = "db_names";
      checkbox.value = db;
      checkbox.id = "db-" + db;

      const label = document.createElement('label');
      label.htmlFor = "db-" + db;
      label.appendChild(document.createTextNode(db));

      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      checkboxContainer.appendChild(document.createElement('br'));
    });
  })
  .catch(error => {
    // 如果出现错误，显示错误信息
    console.error('获取数据库列表出错:', error);
  });

};

