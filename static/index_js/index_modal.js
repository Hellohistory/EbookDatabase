// 设置模态框的打开与关闭
async function openSettingsModal() {
    document.getElementById('settings-modal').style.display = "block";
    await fetchSettingsAndUpdateModal(); // 使用await等待异步操作完成
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = "none";
}

// 点击窗口外部来关闭模态弹窗
window.onclick = function(event) {
    const modal = document.getElementById('settings-modal');
    if (event.target === modal) {
        modal.style.display = "none";
    }
}

// 成功保存设置后，更新模态框内的元素
async function fetchSettingsAndUpdateModal() {
    try {
        let response = await fetch('/settings/');
        let result = await response.json();
        if (result.status === "success") {
            document.getElementById('page-size').value = result.data.pageSize;
            document.getElementById('default-search-field').value = result.data.defaultSearchField;
            document.getElementById('basicSelectedField').value = result.data.defaultSearchField; // 更新页面表单
        }
    } catch (error) {
        console.error("错误:", error);
    }
}

// 保存设置到后端服务器并显示自定义弹窗
async function confirmSettings() {
    const pageSize = document.getElementById('page-size').value;
    const defaultSearchField = document.getElementById('default-search-field').value;
    let settingsData = { pageSize, defaultSearchField };

    try {
        let response = await fetch('/settings/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settingsData)
        });
        let result = await response.json();

        if (result.status === "success") {
            showCustomAlert("设置已保存", "success");
            setTimeout(() => {
                closeCustomAlert();
            }, 3000);
            await fetchSettingsAndUpdateModal(); // 使用await等待异步操作完成
        } else {
            showCustomAlert("保存设置失败：" + result.message, "error");
        }
    } catch (error) {
        console.error("错误:", error);
        showCustomAlert("保存设置时发生错误", "error");
    }
}

// 显示自定义弹窗
function showCustomAlert(message, type) {
    const alertBox = document.getElementById('custom-alert');
    if (type === "success") {
        alertBox.className = 'custom-alert success';
    } else {
        alertBox.className = 'custom-alert error';
    }
    alertBox.textContent = message;
    alertBox.style.display = 'block';
}

// 关闭自定义弹窗
function closeCustomAlert() {
    const alertBox = document.getElementById('custom-alert');
    alertBox.style.display = 'none';
}

// 页面加载完成后的事件处理
document.addEventListener('DOMContentLoaded', fetchSettingsAndUpdateModal);

// 绑定确认按钮的事件监听器
document.getElementById('confirmButton').addEventListener('click', confirmSettings);
