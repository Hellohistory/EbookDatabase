    function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // 保证 textarea 元素不可见
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '0';
    textArea.style.height = '0';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        if (successful) {
            alert('所有链接已复制到剪贴板！');
        } else {
            alert('复制失败，请手动复制。');
        }
    } catch (err) {
        alert('复制失败，请手动复制。');
        console.error('复制失败:', err);
    }

    document.body.removeChild(textArea);
}

document.getElementById('select-all-btn').addEventListener('click', function() {
    document.querySelectorAll('.copy-checkbox').forEach(function(checkbox) {
        checkbox.checked = true;
    });
});

document.getElementById('deselect-all-btn').addEventListener('click', function() {
    document.querySelectorAll('.copy-checkbox').forEach(function(checkbox) {
        checkbox.checked = false;
    });
});

document.getElementById('copy-selected-btn').addEventListener('click', function() {
    var selectedLinks = [];
    document.querySelectorAll('.copy-checkbox:checked').forEach(function(checkbox) {
        // 使用 'actual-link' 类来获取实际的秒传链接
        var secondPassCode = checkbox.closest('.book-container').querySelector('.actual-link').innerText.trim();
        selectedLinks.push(secondPassCode);
    });

    if (selectedLinks.length > 0) {
        var allLinks = selectedLinks.join('\n');
        if (navigator.clipboard) {
            navigator.clipboard.writeText(allLinks).then(function() {
                alert('所有链接已复制到剪贴板！');
            }, function() {
                alert('复制失败，请手动复制。');
            });
        } else {
            fallbackCopyTextToClipboard(allLinks);
        }
    } else {
        alert('未选择任何书籍');
    }
});

// 为每个复制按钮添加点击事件
document.querySelectorAll('.copy-link-btn').forEach(function(button) {
    button.addEventListener('click', function() {
    var secondPassCode = this.closest('.book-container').querySelector('.actual-link').innerText.trim();

        // 使用浏览器的剪贴板API或者回退方法来复制文本
        if (navigator.clipboard) {
            navigator.clipboard.writeText(secondPassCode).then(function() {
                alert('链接已复制到剪贴板！');
            }, function() {
                alert('复制失败，请手动复制。');
            });
        } else {
            fallbackCopyTextToClipboard(secondPassCode);
        }
    });
});
// 获取当前页面的查询参数
function getQueryParams() {
    const qs = window.location.search.substring(1);
    const pairs = qs.split("&");
    const params = {};

    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split("=");
        const key = decodeURIComponent(pair[0]);
        const value = decodeURIComponent(pair[1]);

        if (params[key]) {
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

// 确保页面加载完毕后执行
document.addEventListener("DOMContentLoaded", function() {
    const jumpButton = document.getElementById("jump-button");
    const jumpInput = document.getElementById("jump-to-page");

    // 获取当前页面的查询字符串参数
    const queryParams = getQueryParams();

    jumpButton.addEventListener("click", function() {
        const pageNumber = jumpInput.value;
        if (pageNumber && !isNaN(pageNumber)) {
            // 使用获取到的查询字符串参数构造新的URL
            queryParams['page'] = pageNumber;

            // 特殊处理db_names数组
            const dbNames = queryParams['db_names'];
            delete queryParams['db_names'];  // 删除原有的db_names参数

            let newQueryString = Object.keys(queryParams).map(key => `${key}=${encodeURIComponent(queryParams[key])}`).join('&');

            // 重新加入db_names参数
            if (Array.isArray(dbNames)) {
                dbNames.forEach(dbName => {
                    newQueryString += `&db_names=${encodeURIComponent(dbName)}`;
                });
            } else if (dbNames) {
                newQueryString += `&db_names=${encodeURIComponent(dbNames)}`;
            }

            window.location.href = window.location.pathname + '?' + newQueryString;
        } else {
            alert("请输入有效的页数");
        }
    });
});

// 转换文件大小
function formatFileSize(sizeInBytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (sizeInBytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(sizeInBytes) / Math.log(1024)));
    return Math.round(sizeInBytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

document.addEventListener("DOMContentLoaded", function() {
    // 获取所有表示文件大小的元素
    const sizeElements = document.querySelectorAll('.file-size');

    sizeElements.forEach(function(el) {
        const originalText = el.textContent; // 获取原始文本，例如 "文件大小: 4562120.0"
        const sizeInBytes = parseFloat(originalText.split(": ")[1]); // 提取出字节大小
        const formattedSize = formatFileSize(sizeInBytes); // 格式化大小

        el.innerHTML = `<strong>文件大小:</strong> ${formattedSize}`; // 更新文本
    });
});

