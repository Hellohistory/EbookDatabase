function switchTab(tabName) {
    // 获取基础检索和高级检索的元素
    const basicSearch = document.getElementById('basic-search');
    const advancedSearch = document.getElementById('advanced-search');
    const searchTabs = document.getElementsByClassName('search-tab')[0].getElementsByTagName('li');

    // 隐藏所有元素，移除"on"类
    basicSearch.style.display = 'none';
    advancedSearch.style.display = 'none';
    for (let i = 0; i < searchTabs.length; i++) {
        searchTabs[i].className = '';
    }

    // 显示选定的元素，添加"on"类
    if (tabName === 'advanced') {
        advancedSearch.style.display = 'block';
    } else {
        basicSearch.style.display = 'block';
    }
    document.querySelector(`.search-tab li[val="${tabName}"]`).className = 'on';
}
