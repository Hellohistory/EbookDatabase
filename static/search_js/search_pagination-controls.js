// 获取当前页面的查询参数
function getQueryParams() {
    const qs = window.location.search.substring(1);
    const pairs = qs.split("&");
    const params = {};

    for (let i = 0; i < pairs.length; i++) {
        let pair = pairs[i].split("=");
        const key = decodeURIComponent(pair[0]);
        const value = decodeURIComponent(pair[1] || '');

        if (key in params) {
            if (!Array.isArray(params[key])) {
                params[key] = [params[key]];
            }
            params[key].push(value);
        } else {
            params[key] = value;
        }
    }
    return params;
}

// 构建新的查询字符串
function buildQueryString(params) {
    const keys = Object.keys(params);
    const newParts = [];
    keys.forEach(key => {
        if (Array.isArray(params[key])) {
            params[key].forEach(value => {
                newParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            });
        } else {
            newParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
        }
    });
    return newParts.join('&');
}

// 确保页面加载完毕后执行
document.addEventListener("DOMContentLoaded", function() {
    const jumpButton = document.getElementById("jump-button");
    const jumpInput = document.getElementById("jump-to-page");

    // 获取当前页面的查询字符串参数
    const queryParams = getQueryParams();

    jumpButton.addEventListener("click", function() {
        const pageNumber = jumpInput.value;
        if (pageNumber && !isNaN(pageNumber)) {
            // 修改页数参数
            queryParams['page'] = pageNumber;

            // 构建新的查询字符串并跳转
            const newQueryString = buildQueryString(queryParams);
            window.location.href = window.location.pathname + '?' + newQueryString;
        } else {
            alert("请输入有效的页数");
        }
    });
});
