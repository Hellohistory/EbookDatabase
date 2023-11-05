// 输入字段事件绑定相关函数

document.addEventListener('DOMContentLoaded', function () {
    // 添加第一个搜索条件
    addSearchCondition(false); // 第一个搜索条件不显示删除按钮

    // 获取添加按钮并监听点击事件
    document.getElementById('addCondition').addEventListener('click', function () {
        // 计算当前已有的搜索条件
        const conditionsCount = document.querySelectorAll('#searchConditions .search-condition').length;

        // 如果搜索条件少于6个，则添加新的搜索条件
        if (conditionsCount < 6) {
            addSearchCondition(true); // 新增的搜索条件需要显示删除按钮
        } else {
            alert('最多只能添加六个搜索条件。');
        }
    });
});

function addSearchCondition(canDelete) {
    const searchConditions = document.getElementById('searchConditions');
    const conditionDiv = document.createElement('div');
    conditionDiv.classList.add('mb-3', 'd-flex', 'align-items-center', 'search-condition');

    // 添加搜索条件的HTML结构
    conditionDiv.innerHTML = `
        <div class="form-select-and-input d-flex align-items-center">
            <select name="field[]" class="form-select me-2">
                <option value="title">书名</option>
                <option value="author">作者</option>
                <option value="publisher">出版商</option>
                <option value="publishdate">出版时间</option>
                <option value="isbn">ISBN码</option>
                <option value="sscode">SS码</option>
                <option value="dxid">DXID</option>
            </select>
            <span class="me-2">-</span>
            <input type="text" name="query[]" placeholder="请输入关键词" class="form-control me-2" required />
        </div>
        <select name="logic[]" class="form-select ms-2 me-2">
            <option value="AND">与 (AND)</option>
            <option value="OR">或 (OR)</option>
        </select>
        <div class="form-check form-switch me-2">
            <input type="checkbox" name="fuzzy[]" class="form-check-input" />
            <label class="form-check-label">模糊搜索</label>
        </div>
    `;

    // 如果允许删除，添加删除按钮
    if (canDelete) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.classList.add('custom-delete-btn', 'ms-2'); // 使用自定义的样式类
        deleteButton.type = 'button';
        deleteButton.onclick = function() {
            // 删除按钮的点击事件处理程序
            searchConditions.removeChild(conditionDiv);
        };
        conditionDiv.appendChild(deleteButton);
    }
    searchConditions.appendChild(conditionDiv);
}
