function loadSidebarDatabases() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.dataset.loaded === 'true') { // 避免重复加载
        return;
    }
    fetch('/available_dbs/')
    .then(response => response.json())
    .then(data => {
        const checkboxContainer = document.createElement('div');
        checkboxContainer.id = 'database-checkboxes';
        data.databases.forEach(db => {
            const checkbox = document.createElement('input');
            checkbox.type = "checkbox";
            checkbox.name = "db_names";
            checkbox.value = db;
            checkbox.id = "db-" + db;
            checkbox.checked = true; // 默认勾选

            const label = document.createElement('label');
            label.htmlFor = "db-" + db;
            label.appendChild(document.createTextNode(db));

            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            checkboxContainer.appendChild(document.createElement('br'));
        });
        sidebar.appendChild(checkboxContainer);
        sidebar.dataset.loaded = 'true'; // 标记为已加载
    })
    .catch(error => {
        console.error('获取数据库列表出错:', error);
    });
}
