function switchTab(tabName) {
    // 获取基础检索、高级检索和远程访问的元素
    const basicSearch = document.getElementById('basic-search');
    const advancedSearch = document.getElementById('advanced-search');
    const remoteAccess = document.getElementById('remote-access'); // 远程访问的内容容器
    const searchTabs = document.getElementsByClassName('search-tab')[0].getElementsByTagName('li');

    // 隐藏所有元素，移除"on"类
    basicSearch.style.display = 'none';
    advancedSearch.style.display = 'none';
    remoteAccess.style.display = 'none'; // 隐藏远程访问内容
    for (let i = 0; i < searchTabs.length; i++) {
        searchTabs[i].className = '';
    }

async function getAccessUrlAndQRCode() {
    try {
        const response = await fetch('/get_qr_code_url/');
        const data = await response.json();
        const url = data.url;

        document.getElementById('access-url').textContent = `访问地址: ${url}`;

        // 清除之前的二维码（如果有）
        const qrContainer = document.getElementById("qr-code-container");
        qrContainer.innerHTML = '';

        // 使用二维码生成库来创建二维码
        new QRCode(qrContainer, {
            text: url,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (error) {
        console.error('获取访问地址和二维码时出错: ', error);
    }
}

    // 显示选定的元素，添加"on"类
    if (tabName === 'advanced') {
        console.log("显示高级检索");
        advancedSearch.style.display = 'block';
    } else if (tabName === 'remote-access') {
        console.log("显示远程访问");
        remoteAccess.style.display = 'block'; // 显示远程访问内容
        getAccessUrlAndQRCode(); // 获取URL和生成二维码
    } else {
        console.log("显示基础检索");
        basicSearch.style.display = 'block';
    }
    document.querySelector(`.search-tab li[val="${tabName}"]`).className = 'on';
}
