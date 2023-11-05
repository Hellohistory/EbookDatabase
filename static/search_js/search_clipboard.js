    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
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
        const successful = document.execCommand('copy');
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

// 为每个复制按钮添加点击事件
document.querySelectorAll('.copy-link-btn').forEach(function(button) {
    button.addEventListener('click', function() {
        const secondPassCode = this.closest('.book-container').querySelector('.actual-link').innerText.trim();

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
