var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

const change_cam_ip = async (checking_cam, changing_cam, subnet = '255.255.255.0', username, password) => {
    try {
        var digestAuthRequest = function (method, url, username, password) {
            var self = this;

            if (typeof CryptoJS === 'undefined' && typeof require === 'function') {
                var CryptoJS = require('crypto-js');
            }

            this.scheme = null;
            this.nonce = null;
            this.realm = null;
            this.qop = null;
            this.response = null;
            this.opaque = null;
            this.nc = 1;
            this.cnonce = null;
            this.timeout = 10000;
            this.loggingOn = false;
            this.post = false;

            if (method.toLowerCase() === 'post' || method.toLowerCase() === 'put') {
                this.post = true;
            }

            this.request = function (successFn, errorFn, data) {
                if (data) {
                    self.data = JSON.stringify(data);
                }
                self.successFn = successFn;
                self.errorFn = errorFn;

                if (!self.nonce) {
                    self.makeUnauthenticatedRequest(self.data);
                } else {
                    self.makeAuthenticatedRequest();
                }
            };

            this.makeUnauthenticatedRequest = function (data) {
                self.firstRequest = new XMLHttpRequest();
                self.firstRequest.open(method, url, true);
                self.firstRequest.timeout = self.timeout;

                if (self.post) {
                    self.firstRequest.setRequestHeader('Content-type', 'application/json');
                }

                self.firstRequest.onreadystatechange = function () {
                    if (self.firstRequest.readyState === 2) {
                        var responseHeaders = self.firstRequest.getAllResponseHeaders();
                        responseHeaders = responseHeaders.split('\n');
                        var digestHeaders;
                        for (var i = 0; i < responseHeaders.length; i++) {
                            if (responseHeaders[i].match(/www-authenticate/i) != null) {
                                digestHeaders = responseHeaders[i];
                            }
                        }

                        if (digestHeaders != null) {
                            digestHeaders = digestHeaders.slice(digestHeaders.indexOf(':') + 1, -1);
                            digestHeaders = digestHeaders.split(',');
                            self.scheme = digestHeaders[0].split(/\s/)[1];
                            for (var i = 0; i < digestHeaders.length; i++) {
                                var equalIndex = digestHeaders[i].indexOf('='),
                                    key = digestHeaders[i].substring(0, equalIndex),
                                    val = digestHeaders[i].substring(equalIndex + 1);
                                val = val.replace(/['"]+/g, '');
                                if (key.match(/realm/i) != null) self.realm = val;
                                if (key.match(/nonce/i) != null) self.nonce = val;
                                if (key.match(/opaque/i) != null) self.opaque = val;
                                if (key.match(/qop/i) != null) self.qop = val;
                            }
                            self.cnonce = self.generateCnonce();
                            self.nc++;
                            self.makeAuthenticatedRequest();
                        }
                    }
                    if (self.firstRequest.readyState === 4) {
                        if (self.firstRequest.status === 200) {
                            if (self.firstRequest.responseText !== 'undefined') {
                                if (self.firstRequest.responseText.length > 0) {
                                    if (self.isJson(self.firstRequest.responseText)) {
                                        self.successFn(JSON.parse(self.firstRequest.responseText));
                                    } else {
                                        self.successFn(self.firstRequest.responseText);
                                    }
                                }
                            } else {
                                self.successFn();
                            }
                        }
                    }
                };

                if (self.post) {
                    self.firstRequest.send(self.data);
                } else {
                    self.firstRequest.send();
                }

                self.firstRequest.onerror = function () {
                    if (self.firstRequest.status !== 401) {
                        self.errorFn(self.firstRequest.status);
                    }
                };
            };

            this.makeAuthenticatedRequest = function () {
                self.response = self.formulateResponse();
                self.authenticatedRequest = new XMLHttpRequest();
                self.authenticatedRequest.open(method, url, true);
                self.authenticatedRequest.timeout = self.timeout;
                var digestAuthHeader =
                    self.scheme + ' ' +
                    'username="' + username + '", ' +
                    'realm="' + self.realm + '", ' +
                    'nonce="' + self.nonce + '", ' +
                    'uri="' + url + '", ' +
                    'response="' + self.response + '", ' +
                    'opaque="' + self.opaque + '", ' +
                    'qop=' + self.qop + ', ' +
                    'nc=' + ('00000000' + self.nc).slice(-8) + ', ' +
                    'cnonce="' + self.cnonce + '"';
                self.authenticatedRequest.setRequestHeader('Authorization', digestAuthHeader);

                if (self.post) {
                    self.authenticatedRequest.setRequestHeader('Content-type', 'application/json');
                }

                self.authenticatedRequest.onload = function () {
                    if (self.authenticatedRequest.status >= 200 && self.authenticatedRequest.status < 400) {
                        self.nc++;
                        if (self.authenticatedRequest.responseText !== 'undefined' && self.authenticatedRequest.responseText.length > 0) {
                            if (self.isJson(self.authenticatedRequest.responseText)) {
                                self.successFn(JSON.parse(self.authenticatedRequest.responseText));
                            } else {
                                self.successFn(self.authenticatedRequest.responseText);
                            }
                        } else {
                            self.successFn();
                        }
                    } else {
                        self.nonce = null;
                        self.errorFn(self.authenticatedRequest.status);
                    }
                };

                self.authenticatedRequest.onerror = function () {
                    self.nonce = null;
                    self.errorFn(self.authenticatedRequest.status);
                };

                if (self.post) {
                    self.authenticatedRequest.send(self.data);
                } else {
                    self.authenticatedRequest.send();
                }
            };

            this.formulateResponse = function () {
                var HA1 = CryptoJS.MD5(username + ':' + self.realm + ':' + password).toString();
                var HA2 = CryptoJS.MD5(method + ':' + url).toString();
                var response = CryptoJS.MD5(
                    HA1 + ':' + self.nonce + ':' + ('00000000' + self.nc).slice(-8) + ':' + self.cnonce + ':' + self.qop + ':' + HA2
                ).toString();
                return response;
            };

            this.generateCnonce = function () {
                var characters = 'abcdef0123456789';
                var token = '';
                for (var i = 0; i < 16; i++) {
                    var randNum = Math.round(Math.random() * characters.length);
                    token += characters.substr(randNum, 1);
                }
                return token;
            };

            this.abort = function () {
                if (self.firstRequest != null) {
                    if (self.firstRequest.readyState != 4) self.firstRequest.abort();
                }
                if (self.authenticatedRequest != null) {
                    if (self.authenticatedRequest.readyState != 4) self.authenticatedRequest.abort();
                }
            };

            this.isJson = function (str) {
                try { JSON.parse(str); } catch (e) { return false; }
                return true;
            };

            this.version = function () { return '0.8.0'; };
        };

        const camera_api_call = (url, message) => {
            return new Promise((resolve, reject) => {
                var getRequest = new digestAuthRequest('GET', url, username, password);
                getRequest.request(
                    function (data) {
                        resolve('camera_api_call data: ' + data);
                    },
                    function (errorCode) {
                        reject('camera_api_call error: ' + errorCode);
                    }
                );
            });
        };

        let gateway = changing_cam.substr(0, changing_cam.lastIndexOf('.')) + '.1';
        let url = `http://${checking_cam}/cgi-bin/configManager.cgi?action=setConfig&Network.eth0.IPAddress=${changing_cam}&&Network.eth0.DefaultGateway=${gateway}&&Network.eth0.SubnetMask=${subnet}`;
        let message = ' asdf';
        await camera_api_call(url, message)
            .then((response) => {
                return 'Camera Setup res: ' + response;
            })
            .catch((error) => {
                return 'Cam setup reject ' + error;
            });
    } catch (error) {
        console.log('Setup cam error: ' + error);
    }
};

module.exports = { change_cam_ip };
