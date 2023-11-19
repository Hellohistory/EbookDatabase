document.addEventListener('DOMContentLoaded', function () {
  const copiedFilenames = {}; // 用于存储所有已复制的文件名

  // 生成唯一文件名的函数
  function uniqueFilename(filename) {
    const match = filename.match(/(.+)(\.\w+)$/); // 正则表达式分离文件名和扩展名
    if (!match) return filename; // 如果不符合文件名格式，则直接返回原始文件名

    let name = match[1];
    const extension = match[2];

    if (copiedFilenames[filename]) {
      let counter = copiedFilenames[filename];
      let newName;
      do {
        counter++;
        newName = `${name}(${counter})${extension}`;
      } while (copiedFilenames[newName]);
      copiedFilenames[filename] = counter;
      copiedFilenames[newName] = 1;
      return newName;
    } else {
      copiedFilenames[filename] = 1;
      return filename;
    }
  }

  // 全选按钮功能
  document.querySelectorAll('.select-all-btn').forEach(button => {
    button.addEventListener('click', function() {
      document.querySelectorAll('.copy-checkbox').forEach(checkbox => {
        checkbox.checked = true;
      });
    });
  });

  // 单个复制秒传链接按钮功能
  document.querySelectorAll('.copy-link-btn').forEach(button => {
    button.addEventListener('click', function(event) {
      let secondPassCode = event.target.closest('.second-pass-code').querySelector('.actual-link').textContent.trim();
      secondPassCode = uniqueFilename(secondPassCode); // 检查并修改文件名

      navigator.clipboard.writeText(secondPassCode).then(function() {
        alert('复制成功：' + secondPassCode);
      }, function(err) {
        alert('复制失败：' + err);
      });
    });
  });

  // 全不选按钮功能
  document.querySelectorAll('.deselect-all-btn').forEach(button => {
    button.addEventListener('click', function() {
      document.querySelectorAll('.copy-checkbox').forEach(checkbox => {
        checkbox.checked = false;
      });
    });
  });

  // 复制选中的秒传链接按钮功能
  document.querySelectorAll('.copy-selected-btn').forEach(button => {
    button.addEventListener('click', function() {
      let selectedLinks = Array.from(document.querySelectorAll('.copy-checkbox:checked'))
        .map(checkbox => checkbox.getAttribute('data-second-pass'))
        .map(filename => uniqueFilename(filename)); // 对每个文件名进行检查和修改
      const textToCopy = selectedLinks.join('\n');

      navigator.clipboard.writeText(textToCopy).then(function() {
        alert('复制成功！');
      }, function(err) {
        alert('复制失败：', err);
      });
    });
  });
});
