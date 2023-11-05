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
