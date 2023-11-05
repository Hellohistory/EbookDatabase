// 表单相关逻辑和事件处理
function submitForm(event) {
    event.preventDefault(); // 阻止表单的默认提交行为
    const form = event.target;

    // 构建URL查询参数
    let params = new URLSearchParams();

    // 复选框不在表单内，使用document.querySelectorAll
    const dbCheckboxes = document.querySelectorAll('input[name="db_names"]:checked');
    dbCheckboxes.forEach((dbCheckbox) => {
        params.append('db_names', dbCheckbox.value);
    });

    // 检测哪个搜索选项卡是激活状态
    const isAdvancedSearch = document.getElementById('advanced-search').style.display === 'block';

    // 分别处理基础搜索和高级搜索的表单数据
    if (isAdvancedSearch) {
        // 处理高级搜索的表单数据提交
        const fieldInputs = form.querySelectorAll('select[name="field[]"]');
        const queryInputs = form.querySelectorAll('input[name="query[]"]');
        const logicInputs = form.querySelectorAll('select[name="logic[]"]');
        const fuzzyInputs = form.querySelectorAll('input[name="fuzzy[]"]');

        // 构建高级搜索的其他URL查询参数
        queryInputs.forEach((queryInput, index) => {
            const field = fieldInputs[index].value;
            const query = queryInput.value.trim();
            const logic = index > 0 ? logicInputs[index - 1].value : null;
            const fuzzy = fuzzyInputs[index].checked;

            if (query) {
                if (logic) params.append('logic', logic);
                params.append('field', field);
                params.append('query', query);
                params.append('fuzzy', fuzzy ? 'true' : 'false');
            }
        });

        // 将用户重定向到构建的高级搜索URL
        window.location.href = `/search/advanced?${params.toString()}`;
    } else {
        // 处理基础搜索的表单数据提交
        const queryInput = document.getElementById('basicQuery');
        const fieldInput = document.getElementById('basicSelectedField');
        const fuzzyInput = document.getElementById('basicFuzzy');

        if (!queryInput || queryInput.value.trim() === '') {
            alert('请输入关键词。');
            return;
        }

        // 构建基础搜索的其他URL查询参数
        const query = queryInput.value.trim();
        const field = fieldInput.value;
        const fuzzy = fuzzyInput.checked;

        params.append('query', query);
        if (field) params.append('field', field);
        if (fuzzy) params.append('fuzzy', 'true');

        // 将用户重定向到构建的基础搜索URL
        window.location.href = `/search/?${params.toString()}`;
    }
}

// 绑定提交事件到表单
document.getElementById('basicSearchForm').addEventListener('submit', submitForm);
document.getElementById('advancedSearchForm').addEventListener('submit', submitForm);
