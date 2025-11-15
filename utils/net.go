// path: utils/net.go
package utils

import (
	"errors"
	"net"
)

// GetLocalIP 返回当前主机的局域网 IP 地址。
// 实现逻辑参考 Python 版本中基于 socket 的方案，优先通过 UDP 拨号获取可达 IP。
func GetLocalIP() (string, error) {
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		return "", err
	}
	defer conn.Close()

	udpAddr, ok := conn.LocalAddr().(*net.UDPAddr)
	if !ok {
		return "", errors.New("无法解析本地 UDP 地址")
	}

	ip := udpAddr.IP.String()
	if ip == "" {
		return "", errors.New("未获取到有效的本地 IP 地址")
	}
	return ip, nil
}
