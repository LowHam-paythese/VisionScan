/**
 * Camera Network Scanner - Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const selectBox = document.getElementById('select_something');
    const submitBtn = document.getElementById('submit-btn');
    const messageArea = document.getElementById('message');
    const resultsArea = document.getElementById('results-container');
    const customRangeInput = document.getElementById('custom-range-input');
    const changeIpInput = document.getElementById('change-ip-inputs');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('search_details');

    let allResults = [];
    let isDemoMode = false;

    const DEFAULT_SUBNETS = [
        "10.0.0.0/24", "192.168.1.0/24", "192.168.10.0/24",
        "192.168.100.0/24", "192.168.101.0/24", "192.168.111.0/24",
        "192.168.123.0/24", "172.0.0.0/24", "192.0.0.0/24",
        "192.168.0.0/24", "192.168.250.0/24"
    ];

    // Check for "Demo" in URL for reviewers
    if (window.location.search.includes('demo=true')) {
        isDemoMode = true;
        console.log('--- DEMO MODE ACTIVE ---');
    }

    // Handle scan type change
    selectBox.addEventListener('change', () => {
        const val = selectBox.value;
        customRangeInput.classList.toggle('hidden', val !== 'custom-range');
        changeIpInput.classList.toggle('hidden', val !== 'change_ip');
        searchBar.classList.toggle('hidden', !['quick_scan_cam', 'search_mac'].includes(val));

        messageArea.innerHTML = '';
        resultsArea.innerHTML = '';
    });

    // Handle scan button click
    submitBtn.addEventListener('click', async () => {
        const val = selectBox.value;

        if (isDemoMode) {
            handleDemoScan(val);
            return;
        }

        switch (val) {
            case 'quick_scan_cam':
                await runQuickScan();
                break;
            case 'custom-range':
                await runRangeScan();
                break;
            case 'camera-range':
                // Built-in ranges from original code
                await runDefaultRanges();
                break;
            case 'change_ip':
                await handleChangeIp();
                break;
            default:
                break;
        }
    });

    async function runQuickScan() {
        showLoading('Initializing Quick Scan...');
        try {
            const res = await fetch('/api/quick_scan');
            const data = await res.json();
            renderResults(data.data, 'quick');
            hideLoading();
        } catch (err) {
            showError('Failed to perform quick scan');
        }
    }

    async function runRangeScan() {
        const ipA = document.getElementById('Ip1classA').value;
        const ipB = document.getElementById('Ip1classB').value;
        const ipC = document.getElementById('Ip1classC').value;
        const ipD = document.getElementById('Ip1classD').value;

        if (!ipA || !ipB || !ipC || !ipD) {
            showError('Please complete all IP range fields');
            return;
        }

        const range = `${ipA}.${ipB}.${ipC}.0/${ipD}`;
        showLoading(`Scanning range ${range}... This may take a moment.`);

        try {
            const res = await fetch(`/api/all_cams?iprange=${encodeURIComponent(range)}`);
            const data = await res.json();
            if (data.data) {
                messageArea.innerHTML = data.data;
            } else {
                renderResults(data, 'range');
            }
            hideLoading();
        } catch (err) {
            showError('Range scan failed');
        }
    }

    async function runDefaultRanges() {
        showLoading('Scanning common subnets... This will take a while.');
        resultsArea.innerHTML = '';
        allResults = [];

        for (const range of DEFAULT_SUBNETS) {
            // Update status
            const statusDiv = document.createElement('div');
            statusDiv.textContent = `Scanning ${range}...`;
            statusDiv.style.color = 'var(--text-muted)';
            statusDiv.style.fontSize = '0.8rem';
            statusDiv.style.textAlign = 'center';
            messageArea.appendChild(statusDiv);

            try {
                const res = await fetch(`/api/all_cams?iprange=${encodeURIComponent(range)}`);
                const data = await res.json();
                if (!data.data && data.IP_address) {
                    renderResults(data, 'range', true);
                }
            } catch (err) {
                console.error(`Failed to scan ${range}`);
            }
        }
        hideLoading();
        messageArea.innerHTML = `Scan complete. Found ${allResults.length} devices.`;
    }

    async function handleChangeIp() {
        const currentIp = document.getElementById('OG_IP').value;
        const newIp = document.getElementById('changed_ip').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!currentIp || !newIp || !username || !password) {
            showError('Please fill in all camera configuration fields');
            return;
        }

        showLoading('Attempting to update camera IP...');
        try {
            const params = new URLSearchParams({
                checking_cam: currentIp,
                changing_cam: newIp,
                username,
                password,
                subnet: '255.255.255.0'
            });

            const res = await fetch(`/api/change_cam?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                messageArea.innerHTML = `<div style="color: var(--success)">Success: ${typeof data.data === 'string' ? data.data : JSON.stringify(data.data)}</div>`;
                hideLoading();
            } else {
                showError('Update failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            showError('Request failed');
        }
    }

    function renderResults(data, type, shouldAppend = false) {
        if (!shouldAppend) {
            resultsArea.innerHTML = '';
            allResults = [];
        }

        if (type === 'quick') {
            Object.keys(data).forEach(ip => {
                const macInfo = data[ip];
                const card = createResultCard(ip, macInfo);
                resultsArea.appendChild(card);
                allResults.push({ ip, macInfo, card });
            });
        } else if (type === 'range') {
            data.IP_address.forEach((ip, idx) => {
                const macInfo = data.Mac_address[idx];
                const card = createResultCard(ip, macInfo);
                resultsArea.appendChild(card);
                allResults.push({ ip, macInfo, card });
            });
        }

        if (allResults.length === 0) {
            messageArea.innerHTML = 'No devices discovered.';
        } else {
            messageArea.innerHTML = `Discovered ${allResults.length} devices.`;
        }
    }

    function createResultCard(ip, macInfo) {
        const card = document.createElement('div');
        card.className = 'result-card animate-in';

        const isCamera = ip.toLowerCase().includes('camera');
        const cleanIp = ip.replace('(Camera)', '').trim();

        // Find vendor (server already appends it, but we can style it)
        let vendor = '';
        let cleanMac = macInfo;
        const macParts = macInfo.split(' ');
        if (macParts.length > 1) {
            cleanMac = macParts[0];
            vendor = macParts.slice(1).join(' ');
        }

        card.innerHTML = `
            <div class="result-header">
                <span class="ip-address">${isCamera ? `<a href="http://${cleanIp}" target="_blank">${cleanIp}</a>` : cleanIp}</span>
                <div class="tags">
                    ${isCamera ? '<span class="camera-tag">CAMERA</span>' : ''}
                    ${vendor ? `<span class="vendor-tag">${vendor}</span>` : ''}
                </div>
            </div>
            <div class="mac-address">${cleanMac}</div>
        `;
        return card;
    }

    function showLoading(msg) {
        messageArea.innerHTML = `<div class="loading-spinner"></div> <span>${msg}</span>`;
        submitBtn.disabled = true;
    }

    function hideLoading() {
        submitBtn.disabled = false;
    }

    function showError(msg) {
        messageArea.innerHTML = `<span style="color: var(--error)">${msg}</span>`;
        hideLoading();
    }

    // --- Demo Mode Logic ---
    function handleDemoScan(type) {
        showLoading('Demo Mode: Simulating network scan...');
        setTimeout(() => {
            const mockData = {
                'quick_scan_cam': {
                    '192.168.1.1': '00:11:22:33:44:55 TP-Link',
                    '192.168.1.15': 'AA:BB:CC:DD:EE:FF Dahua Technology',
                    '192.168.1.22': '11:22:33:44:55:66 Apple, Inc.'
                },
                'custom-range': {
                    IP_address: ['192.168.1.15 (Camera)', '192.168.1.1'],
                    Mac_address: ['AA:BB:CC:DD:EE:FF Dahua Technology', '00:11:22:33:44:55 TP-Link']
                }
            };

            const data = mockData[type] || mockData['quick_scan_cam'];
            renderResults(data, type === 'custom-range' ? 'range' : 'quick');
            hideLoading();
        }, 1500);
    }
});
