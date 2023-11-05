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
    const selectedLinks = [];
    document.querySelectorAll('.copy-checkbox:checked').forEach(function(checkbox) {
        // 使用 'actual-link' 类来获取实际的秒传链接
        const secondPassCode = checkbox.closest('.book-container').querySelector('.actual-link').innerText.trim();
        selectedLinks.push(secondPassCode);
    });

    if (selectedLinks.length > 0) {
        const allLinks = selectedLinks.join('\n');
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
