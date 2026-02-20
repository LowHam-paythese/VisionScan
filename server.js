const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const scannerService = require('./services/scannerService');
const cameraService = require('./services/cameraService');
const json_data = require('./mac-vendors-export.json');

const app = express();
const PORT = process.env.PORT || 5000;
const ERROR_LOG = 'errorlog.txt';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/fetch-data', (req, res) => {
    try {
        res.json(json_data);
    } catch (error) {
        logError('Error fetching JSON data', error);
        res.status(500).json({ error: 'Failed to fetch vendor data' });
    }
});

app.get('/api/quick_scan', async (req, res) => {
    try {
        const data = await scannerService.quickScan();
        res.json({ data });
    } catch (error) {
        logError('Quick scan failed', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/all_cams', async (req, res) => {
    const { iprange } = req.query;
    if (!iprange) return res.status(400).json({ error: 'IP Range is required' });

    try {
        console.log(`Starting scan for range: ${iprange}`);
        const arpData = await scannerService.rangeCheck(iprange);

        // If it's just a message/error
        if (arpData.data || arpData.error) {
            return res.json({ data: arpData.data || 'Scan failed' });
        }

        const ipList = arpData.IP_address || [];
        const macList = arpData.Mac_address || [];

        // Now enrich with camera detection for found IPs
        const enrichedResults = {
            IP_address: [],
            Mac_address: []
        };

        // We'll scan each IP sequentially for camera features (RTSP port 554)
        for (let i = 0; i < ipList.length; i++) {
            const ip = ipList[i];
            const mac = macList[i];

            try {
                const camData = await scannerService.scanCameraFeatures(ip);
                enrichedResults.IP_address.push(`${ip} (Camera)`);
                // Append vendor if possible
                let vendorInfo = getVendor(mac);
                enrichedResults.Mac_address.push(`${mac} ${vendorInfo}`);
            } catch (err) {
                // Not a camera, just add base info
                enrichedResults.IP_address.push(ip);
                enrichedResults.Mac_address.push(`${mac} ${getVendor(mac)}`);
            }
        }

        res.json(enrichedResults);
    } catch (error) {
        logError('Range scan failed', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/change_cam', async (req, res) => {
    const { checking_cam, changing_cam, username, password, subnet } = req.query;

    try {
        const result = await cameraService.updateCameraIp(checking_cam, changing_cam, username, password, subnet);
        res.json(result);
    } catch (error) {
        logError('Change IP failed', error);
        res.status(500).json({ error: error.message });
    }
});

function logError(message, error) {
    const entry = `[${new Date().toISOString()}] ${message}: ${error}\n`;
    fs.appendFileSync(ERROR_LOG, entry);
    console.error(entry);
}

function getVendor(mac) {
    if (!mac) return '';
    const formattedMac = mac.toUpperCase().replaceAll('-', ':');
    for (const entry of json_data) {
        if (formattedMac.includes(entry.macPrefix)) {
            return entry.vendorName;
        }
    }
    return '';
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    // Optional: Open browser on start
    // exec(`start http://localhost:${PORT}`);
});
