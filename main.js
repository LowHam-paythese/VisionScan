const filePath = 'errorlog.txt'

const fs = require('fs')

try {
    const { exec, spawn } = require('child_process')
    const { change_cam_ip } = require('./api')
    const express = require('express')
    const path = require('path')

    const json_data = require('./mac-vendors-export.json')

    const process = require('process')

    let cameraCount = 0

    let quick_scan = []

    const app = express()

    app.get('/', (req, res) => {
        if (!process.versions.node) {
            res.write('<h1>Please install node</h1>' + '<a href="https://nodejs.org/en/download/prebuilt-installer">Download NodeJS</a>')
            return
        }
        res.sendFile(path.join(process.cwd(), '/index.html'))
    })
    app.get('/fetch-data', (req, res) => {
        try {
            res.json(json_data)
        } catch (error) {
            fs.writeFile(filePath, 'Error found ' + error, (err) => {
                if (err) {
                    console.error('Error creating/opening file:', err)
                } else {
                    console.log('File created/opened successfully!')
                }
            })
        }
    })
    app.get('/api/quick_scan', async (req, res) => {
        try {
            await normal_scan().then((response) => {
                res.send({ data: response })
            })
        } catch (error) {
            fs.writeFile(filePath, 'Error found ' + error, (err) => {
                if (err) {
                    console.error('Error creating/opening file:', err)
                } else {
                    console.log('File created/opened successfully!')
                }
            })
        }
    })

    app.get('/api/change_cam', (req, res) => {
        //change ip to another
        try {
            const checking_cam = req.query.checking_cam
            const changing_cam = req.query.changing_cam
            const username = req.query.username
            const password = req.query.password
            const subnet = req.query.subnet
            console.log('ALL data received for change_cam', checking_cam, changing_cam, username, password, subnet)
            let output = change_cam_ip(checking_cam, changing_cam, subnet, username, password)
            res.json({ data: output })
        } catch (error) {
            res.json({ data: 'error found', error })
            fs.writeFile(filePath, 'Error found ' + error, (err) => {
                if (err) {
                    console.error('Error creating/opening file:', err)
                } else {
                    console.log('File created/opened successfully!')
                }
            })
        }
    })

    app.get('/api/all_cams', async (req, res) => {
        try {
            const ipRange = req.query.iprange

            let arp_ips_arr = {}
            console.log('All cams', ipRange)
            const report = await range_check(ipRange)
                .then((response) => {
                    //receive 2 arr with all ip and mac
                    arp_ips_arr = response
                })
                .catch((error) => {
                    console.log('error found in api/cams ' + error)

                    res.json({ data: 'No working cameras on ' + ipRange })
                })
            console.log("arp_ips_arr" , arp_ips_arr)
            let IP_address = []
            let Mac_address = []

            const scan_nmap = async () => {
                if (typeof arp_ips_arr === 'object') {
                    let index = 0
                    let mac_string = ''
                    for (const element of arp_ips_arr.IP_address) {
                        let responses = await scanCustomCamera(element) //nmap function
                            .then((response) => {
                                response.IP_address.forEach((ip, ipIndex) => {
                                    IP_address.push(ip + ' (Camera) ')

                                    let var_found = false
                                    let mac = response.Mac_address[ipIndex]

                                    console.log(JSON.stringify(arp_ips_arr.Mac_address), index)

                                    for (let j = 0; j < json_data.length; j++) {
                                        //mac scan find vendor details
                                        if (mac.includes(json_data[j].macPrefix)) {
                                            var_found = true
                                            mac_string = mac.split('(')[0] + ' ' + json_data[j].vendorName
                                            // Mac_address.push(mac.split('(')[0] + ' ' + json_data[j].vendorName)
                                            break
                                        }
                                    }

                                    if (!var_found) {
                                        // send mac if no vendor found
                                        mac_string = mac
                                        // Mac_address.push(mac)
                                    }
                                    if (mac_string.includes(arp_ips_arr.Mac_address[index])) {
                                        console.log('all goods')
                                    } else {
                                        console.log('Something wrong with ip ', arp_ips_arr.Mac_address[index], ' Mac string ', mac_string)

                                        var_found = false

                                        for (let j = 0; j < json_data.length; j++) {
                                            //mac scan find vendor details

                                            if (arp_ips_arr.Mac_address[index].includes(json_data[j].macPrefix)) {
                                                var_found = true
                                                mac_string +=
                                                    '<b style="color: red;"> DUPLICATE FOUND! </b>' +
                                                    arp_ips_arr.Mac_address[index] +
                                                    // mac.split('(')[0] +
                                                    ' ' +
                                                    json_data[j].vendorName
                                                // Mac_address.push(mac.split('(')[0] + ' ' + json_data[j].vendorName)
                                                break
                                            }
                                        }
                                        if (!var_found) {
                                            mac_string += ' DUPLICATE FOUND! No vendor ' + arp_ips_arr.Mac_address[index] //duplicate found no mac vendor
                                        }
                                    }
                                    Mac_address.push(mac_string)
                                    console.log(ip + ' (Camera) ', Mac_address[Mac_address.length - 1])
                                })
                            })
                            .catch((error) => {
                                if (error.includes(element)) {
                                    let ip_index = arp_ips_arr.IP_address.indexOf(element)
                                    IP_address.push(arp_ips_arr.IP_address[ip_index])
                                    let searching = arp_ips_arr.Mac_address[ip_index]

                                    let var_found = false

                                    for (let index = 0; index < json_data.length; index++) {
                                        if (searching.includes(json_data[index].macPrefix)) {
                                            var_found = true
                                            Mac_address.push(arp_ips_arr.Mac_address[ip_index] + ' ' + json_data[index].vendorName)
                                        }
                                    }
                                    if (!var_found) {
                                        Mac_address.push(arp_ips_arr.Mac_address[ip_index])
                                    }
                                } else {
                                    console.log('error found ', error)
                                }
                            })
                        index += 1
                    }
                    const sending_data = () => {
                        let res_data = {
                            IP_address: IP_address,
                            Mac_address: Mac_address,
                        }
                        console.log('arp arp_ips_arr', arp_ips_arr)
                        console.log('nmap res_data ', res_data)
                        res.json(res_data)
                    }

                    sending_data()
                } else {
                    //console.log(arp_ips_arr)
                    res.json({ data: arp_ips_arr })
                    return
                }
            }
            // await Promise.all(scanpromise)
            await scan_nmap()
        } catch (error) {
            fs.writeFile(filePath, 'Error found ' + error, (err) => {
                if (err) {
                    console.error('Error creating/opening file:', err)
                } else {
                    console.log('File created/opened successfully!')
                }
            })
        }
    })

    app.listen(5000, () => {
        exec(`start http://localhost:5000`)
    })

    const normal_scan = () => {
        return new Promise((resolve, reject) => {
            try {
                const arpProcess = spawn('arp', ['-a'])
                let ip_mac_data = {}
                arpProcess.stdout.on('data', (data) => {
                    let send = data.toString().split('\r\n  ')
                    let counter = 0

                    for (const element of send) {
                        let ip = element.split(' ').filter((n) => n)

                        if (ip.some((ip_check) => ip_check.includes('.') || ip_check.includes('-'))) {
                            let ip_found = ''
                            for (const IP_details of ip) {
                                if (IP_details.includes('.')) {
                                    quick_scan.push(IP_details.trim())
                                    counter += 1
                                    ip_found = IP_details.trim()
                                } else if (IP_details.split('-').length > 4 && !IP_details.substring(0, 9).includes('00-00-00')) {
                                    if (ip_found) {
                                        let searching = IP_details.trim().toUpperCase().replaceAll('-', ':')
                                        ip_mac_data[ip_found] = searching
                                        for (const jsonEntry of json_data) {
                                            if (searching.includes(jsonEntry.macPrefix)) {
                                                ip_mac_data[ip_found] = searching + ' ' + jsonEntry.vendorName
                                                break
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                })

                arpProcess.on('exit', (code) => {
                    resolve(ip_mac_data)
                })
            } catch (error) {
                console.error(error)
            }
        })
    }

    const scanForCamera = (ip) => {
        return new Promise((resolve, reject) => {
            try {
                let command = `nmap -p 554 -open ${ip} --unprivileged -T4`

                command = 'ls'

                const results = spawn(command)
                results.stdout.on('data', (data) => {})
                results.stderr.on('data', (data) => {})
                results.on('close', (data) => {})
                results.on('end', (data) => {
                    console.log('end data', data)
                })
            } catch (error) {
                console.log('error found in ScanForCamera', error)
            }
        })
    }
    const scanCustomCamera = (ip) => {
        return new Promise((resolve, reject) => {
            try {
                const command = `nmap -p 554 -T4 -A --open ${ip}`
                console.log("command nmap",command)
                exec(command, (err, stdout) => {
                    if (err) {
                        return reject(`Error executing nmap command for ${ip}: ${err.message}`)
                    }

                    if (stdout.includes('rtsp')) {
                        let ip_found = stdout.split(' ')

                        const ip_list = []
                        ip_found.map((item, i) => {
                            if (item) {
                                if (item.length > 0 && parseInt(item[0]) &&parseInt(item.split('.')[0]) && parseInt(item.split('.')[1]) &&item.split('.').length > 3 && !ip_list.includes(item.split('\r')[0])) {
                                    ip_list.push(item.split('\r')[0])
                                } else {
                                    return null
                                }
                            }
                        })

                        cameraCount += 1

                        let searching_mac = stdout.split('\r\n')

                        let found_mac = []
                        searching_mac.forEach((element) => {
                            if (element.includes('MAC Address:')) {
                                found_mac.push(element.split('MAC Address: ')[1].trim())
                            }
                        })

                        let sending_data = {
                            IP_address: ip_list,
                            Mac_address: found_mac,
                        }
                        console.log('sending_data', sending_data)
                        resolve(sending_data)
                    } else {
                        reject(`${ip} is not a working camera`)
                    }
                })
            } catch (error) {
                console.log('error in scanCustomCamera', error)
            }
        })
    }

    const range_check = async (ipRange) => {
        return new Promise((resolve, reject) => {
            try {
                let has_output = false
                const arpScanPath = path.resolve(process.cwd(), './arp-scan.exe')

                const args = ['-t', ipRange]

                const arpProcess = spawn(arpScanPath, args)
                console.log('Ip command ', ipRange, arpScanPath, args)
                arpProcess.stdout.on('data', (data) => {
                    try {
                        // console.log('data for ip', ipRange, ' ', data.toString())
                        has_output = true
                        let ip_found = data.toString().split(' ')

                        let ip_list = []
                        let mac_list = []

                        ip_found.map((item, i) => {
                            if (item) {
                                if (item.length > 0 && parseInt(item[0]) && item.split('.').length > 2) {
                                    // console.log('ip ', item.split('\r')[0])

                                    ip_list.push(item.split('\r')[0])
                                } else if (item.length > 0 && item.split(':').length > 3) {
                                    // console.log('Mac found ', item)
                                    mac_list.push(item)
                                } else {
                                    return null
                                }
                            }
                        })

                        let sending_data = {
                            IP_address: ip_list,
                            Mac_address: mac_list,
                        }

                        resolve(sending_data)
                    } catch (error) {
                        console.log('error in range check arpProcess stdout', error)
                    }
                })
                arpProcess.stderr.on('data', (error) => {
                    has_output = true
                    console.log(`stdout: ${error}`)
                })
                arpProcess.on('exit', (code) => {
                    if (!has_output) {
                        resolve('Nothing found for ' + ipRange)
                    }
                })
            } catch (error) {
                console.error(error)
            }
        })
    }
} catch (error) {
    fs.writeFile(filePath, 'Error found ' + error, (err) => {
        if (err) {
            console.error('Error creating/opening file:', err)
        } else {
            console.log('File created/opened successfully!')
        }
    })
}
