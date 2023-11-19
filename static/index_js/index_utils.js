// 其他实用函数

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');

    if (sidebar.style.left === '-250px' || sidebar.style.left === '') {
        sidebar.style.left = '0px';
        menuIcon.style.display = 'none';
        closeIcon.style.display = 'block';
    } else {
        sidebar.style.left = '-250px';
        menuIcon.style.display = 'block';
        closeIcon.style.display = 'none';
    }
}

function showAlertBox() {
    const alertBox = document.getElementById('alert-box');
    alertBox.style.display = 'block';

    // 3秒后隐藏提示框
    setTimeout(function() {
        alertBox.style.display = 'none';
    }, 3000);
}

function confirmSettings() {
    showAlertBox();
}
