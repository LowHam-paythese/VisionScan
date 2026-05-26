# VisionScan | Camera Network Discovery Tool

<img width="1447" height="825" alt="image" src="https://github.com/user-attachments/assets/64c4338c-dbef-4374-966e-c07a781d20ff" />
VisionScan is a professional, production-ready network discovery application designed to identify and manage security cameras on a local network. It combines powerful system utilities with a sleek, modern web interface to provide an intuitive experience for network administrators and security professionals.

##  Features

- **Quick Discovery**: Rapidly scan the ARP cache of the host system to identify active devices.
- **Deep Network Scan**: Integration with `arp-scan` and `Nmap` for thorough identification of cameras (RTSP/ONVIF).
- **Vendor Identification**: Correlates MAC addresses with a database of over 20,000 OUI prefixes for precise manufacturer detection.
- **Camera Configuration**: Remote IP management for supported cameras (e.g., Dahua/ONVIF) using Digest Authentication.
- **Demo Mode**: Built-in showcase mode for recruiters and reviewers to test the UI without specialized network hardware.
- **Premium UI**: Modern dark-themed interface with Glassmorphism effects, responsive design, and smooth animations.

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla HTML5, CSS3 (Custom Variables), JavaScript (ES6+)
- **System Integration**: Child Process execution for ARP and Nmap utilities.
- **Authentication**: Custom Digest Auth implementation for camera API calls.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.0.0 or higher)
- [Nmap](https://nmap.org/download.html) (Must be added to system PATH)
- [arp-scan](https://github.com/royhills/arp-scan) (Optional, required for deep scanning)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/LowHam-paythese/VisionScan.git
   cd VisionScan
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the application**:
   ```bash
   npm start
   ```
   Open [http://localhost:5000](http://localhost:5000) in your browser.

4. **Showcase Mode (Recruiters)**:
   To view the application with mocked data without running local network scans:
   [http://localhost:5000?demo=true](http://localhost:5000?demo=true)

## Architecture

The project follows a service-oriented architecture to ensure maintainability:

- `services/scannerService.js`: Encapsulates logic for system-level scanning and data parsing.
- `services/cameraService.js`: Handles vendor-specific camera configurations.
- `server.js`: Clean Express entry point with modularized routing and error logging.
- `public/`: Assets optimized for performance and aesthetic appeal.

## 📄 License

This project is licensed under the ISC License, a permissive open-source license that allows you to use, modify, and distribute the software with minimal restrictions.

---

## Detailed Overview

**VisionScan** was created to address a common challenge faced by network administrators and security professionals: the discovery and management of IP cameras on corporate or home networks. Traditional network scanners often overlook or misclassify these devices, especially when they rely on proprietary protocols like RTSP or ONVIF. VisionScan bridges this gap by:

1. **Aggregating Multiple Detection Methods** – It combines quick ARP cache checks, deep scanning with `arp‑scan` and `Nmap`, and vendor OUI lookups to reliably surface camera devices.
2. **Providing Immediate Configuration Access** – For supported camera models, administrators can adjust network settings (IP, subnet, gateway) directly from the web UI, eliminating the need for vendor‑specific tools.
3. **Enabling Safe Demonstrations** – The optional demo mode (`?demo=true`) showcases the full UI and feature set without requiring any real hardware, making it ideal for interviews, security audits, and educational purposes.

The tool is built with a lightweight stack (Node.js/Express on the backend and vanilla HTML/CSS/JS on the frontend) to keep deployment simple while still delivering a modern, responsive user experience.

---

## Security Considerations

- **Digest Authentication** is used when communicating with camera APIs to avoid transmitting plain‑text credentials.
- All external command executions are performed via Node's `child_process` with strict input sanitization to mitigate command‑injection risks.
- The application runs on a local development server by default; for production deployments, it is recommended to place it behind a reverse proxy with TLS termination and to isolate it within a container or VM.

---

## 📄 License

This project is licensed under the ISC License.
