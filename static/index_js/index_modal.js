// 设置模态框的打开与关闭
function openSettingsModal() {
    document.getElementById('settings-modal').style.display = "block";
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

// 当设置模态框被打开时，加载当前设置
document.getElementById('settings-modal').addEventListener('shown.bs.modal', async function() {
    try {
        let response = await fetch('/settings/');
        let result = await response.json();

        if (result.status === "success") {
            // 应用获取到的设置
            document.getElementById('page-size').value = result.data.pageSize;
            document.getElementById('theme-switch').value = result.data.theme;
            toggleTheme(result.data.theme);
        } else {
            alert("获取设置失败：" + result.message);
        }
    } catch (error) {
        console.error("错误:", error);
        alert("获取设置时发生错误");
    }
});

// 切换主题
function toggleTheme(theme) {
    const body = document.body;
    // 移除先前可能添加的主题类
    body.classList.remove("light-theme", "dark-theme");

    // 根据选择添加对应的主题类
    if(theme === 'dark') {
        body.classList.add("dark-theme");
    } else if(theme === 'light') {
        body.classList.add("light-theme");
    }
    // 保存主题设置
    saveSettings({ theme });
}

// 绑定下拉框的变化事件到toggleTheme函数
document.getElementById('theme-switch').addEventListener('change', function(event){
    toggleTheme(event.target.value);
});

// 保存设置到后端服务器并显示自定义弹窗
async function confirmSettings() {
    const pageSize = document.getElementById('page-size').value;
    let settingsData = { pageSize };

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
            // 显示自定义弹窗
            showCustomAlert("设置已保存", "success");
            // 设置3秒后自动关闭弹窗
            setTimeout(() => {
                closeCustomAlert(); // 这是关闭自定义弹窗的函数
            }, 3000);
        } else {
            // 显示自定义弹窗
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
document.addEventListener('DOMContentLoaded', async (event) => {
    // 初始化设置
    try {
        let response = await fetch('/settings/');
        let result = await response.json();

        if (result.status === "success") {
            // 应用获取到的设置
            document.getElementById('page-size').value = result.data.pageSize;
            document.getElementById('theme-switch').value = result.data.theme;
            toggleTheme(result.data.theme);
        } else {
            alert("加载设置失败：" + result.message);
        }
    } catch (error) {
        console.error("错误:", error);
        alert("加载设置时发生错误");
    }

    // 绑定确认按钮的点击事件
    document.getElementById('confirmButton').addEventListener('click', confirmSettings);

    // 初始化自定义弹窗的关闭事件
    const alertBox = document.getElementById('custom-alert');
    if (alertBox) {
        alertBox.addEventListener('click', closeCustomAlert);
    }
});


// 保存设置到LocalStorage
function saveSettings(settings) {
    // 获取当前设置或初始化一个新对象
    const currentSettings = JSON.parse(localStorage.getItem('userSettings')) || {};
    // 合并旧设置和新设置
    const newSettings = { ...currentSettings, ...settings };
    // 保存回LocalStorage
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
}
