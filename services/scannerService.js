const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const process = require('process');
const json_data = require('../mac-vendors-export.json');

/**
 * Performs a quick ARP scan using the system's `arp -a` command.
 * @returns {Promise<Object>} Map of IP addresses to MAC/Vendor info.
 */
const quickScan = () => {
    return new Promise((resolve) => {
        try {
            const arpProcess = spawn('arp', ['-a']);
            let ip_mac_data = {};

            arpProcess.stdout.on('data', (data) => {
                let send = data.toString().split('\r\n  ');
                for (const element of send) {
                    let ipParts = element.split(' ').filter((n) => n);
                    if (ipParts.some((check) => check.includes('.') || check.includes('-'))) {
                        let ip_found = '';
                        for (const detail of ipParts) {
                            if (detail.includes('.')) {
                                ip_found = detail.trim();
                            } else if (detail.split('-').length > 4 && !detail.substring(0, 9).includes('00-00-00')) {
                                if (ip_found) {
                                    let searching = detail.trim().toUpperCase().replaceAll('-', ':');
                                    ip_mac_data[ip_found] = searching;
                                    for (const jsonEntry of json_data) {
                                        if (searching.includes(jsonEntry.macPrefix)) {
                                            ip_mac_data[ip_found] = `${searching} ${jsonEntry.vendorName}`;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            arpProcess.on('exit', () => {
                resolve(ip_mac_data);
            });
        } catch (error) {
            console.error('Quick scan error:', error);
            resolve({});
        }
    });
};

/**
 * Performs a range check using the `arp-scan.exe` utility.
 * @param {string} ipRange The IP range to scan (e.g., 192.168.1.0/24).
 * @returns {Promise<Object>} IP and Mac address lists.
 */
const rangeCheck = async (ipRange) => {
    return new Promise((resolve) => {
        try {
            let hasOutput = false;
            const arpScanPath = path.resolve(process.cwd(), './arp-scan.exe');
            const args = ['-t', ipRange];
            const arpProcess = spawn(arpScanPath, args);

            arpProcess.stdout.on('data', (data) => {
                hasOutput = true;
                let parts = data.toString().split(' ');
                let ip_list = [];
                let mac_list = [];

                parts.map((item) => {
                    if (item) {
                        if (item.length > 0 && parseInt(item[0]) && item.split('.').length > 2) {
                            ip_list.push(item.split('\r')[0]);
                        } else if (item.length > 0 && item.split(':').length > 3) {
                            mac_list.push(item);
                        }
                    }
                });

                resolve({ IP_address: ip_list, Mac_address: mac_list });
            });

            arpProcess.on('exit', () => {
                if (!hasOutput) {
                    resolve({ data: `Nothing found for ${ipRange}` });
                }
            });
        } catch (error) {
            console.error('Range check error:', error);
            resolve({ error: error.message });
        }
    });
};

/**
 * Checks if a specific IP is a camera by probing RTSP port 554 via TCP.
 * Uses Node.js built-in `net` module — no external tools required.
 * @param {string} ip
 * @returns {Promise<Object>} Resolves if port 554 is open (camera), rejects otherwise.
 */
const scanCameraFeatures = (ip) => {
    return new Promise((resolve, reject) => {
        const RTSP_PORT = 554;
        const TIMEOUT_MS = 3000;

        const socket = new net.Socket();
        socket.setTimeout(TIMEOUT_MS);

        socket.connect(RTSP_PORT, ip, () => {
            // Port 554 is open — this device is responding like a camera
            socket.destroy();
            resolve({ isCamera: true });
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(`${ip}: connection to port ${RTSP_PORT} timed out`);
        });

        socket.on('error', (err) => {
            socket.destroy();
            reject(`${ip} is not a camera: ${err.message}`);
        });
    });
};

module.exports = {
    quickScan,
    rangeCheck,
    scanCameraFeatures
};
