const FileSystem = require('fs');
const FormData = require('form-data');
const UuidV1 = require('uuid/v1');
const Mkdirp = require('mkdirp');
const Request = require('request');
const Path = require('path');
const OS = require('os');

const Logger = require('./../logger.js');

class BaseRestClient {
    constructor(url, port, loggerName) {
        this.loggerName = loggerName || "BaseRestClient";
        this.apiPort = parseInt(port);
        this.timeoutMs = 10000;
        var domain;
        if(url.startsWith("https://")) {
            domain = url.replace("https://", "");
            this.client = require('https');
            this.apiProtocol = "https:";
        } else {
            if(url.startsWith("http://")) {
                domain = url.replace("http://", "");
            } else {
                domain = url;
            }
            this.apiProtocol = "http:";
            this.client = require('http');
        }
        var urlParts = domain.split("/");
        if(!urlParts || urlParts.length === 0) {
            Logger.error(this.loggerName + "::constructor() Invalid URL: " + url);
            return;
        }
        this.apiDomain = urlParts[0];
        this.pathPrefix = domain.replace(this.apiDomain, "");
        Logger.debug(this.loggerName + "::constructor() URL: " + url + " Port: " + port + " Protocol: " + this.apiProtocol + " Domain: " + this.apiDomain + " Path prefix: " + this.pathPrefix);
        this.urlCookies = {};
        this.customHeaders = {};
        this.tmpDownloadDir = Path.resolve(OS.tmpdir(), 'messenger-downloads');
        this.tmpUploadDir = Path.resolve(OS.tmpdir(), 'messenger-uploads');
    }

    setTimeoutMs(timeoutMs) {
        this.timeoutMs = timeoutMs;
    }

    setApiToken(apiToken) {
        Logger.debug(this.loggerName + "::setApiToken() Token: " + apiToken);
        this.apiToken = apiToken;
    }

    setApiBasicAuth(apiBasicUsername, apiBasicPassword) {
        Logger.debug(this.loggerName + "::setApiBasicAuth()");
        this.apiBasicUsername = apiBasicUsername;
        this.apiBasicPassword = apiBasicPassword;
        if(this.apiBasicUsername && this.apiBasicPassword) {
            var auth = this.apiBasicUsername + ":" + this.apiBasicPassword;
            this.apiBasicAuth = Buffer.from(auth).toString('base64');
        }
    }

    setCustomHeader(key, value) {
        Logger.debug(this.loggerName + "::setCustomHeader() Key: \"" + key + "\" Value: \"" + value + "\"");
        this.customHeaders[key] = value;
    }

    setErrorCallback(errorCallback) {
        this.errorCallback = errorCallback;
    }

    sendError(err) {
        if(this.errorCallback) {
            this.errorCallback(err);
        }
    }

    http(path, method, data, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var options = {};
                options["hostname"] = this.apiDomain;
                options["defaultPort"] = this.apiPort;
                options["port"] = this.apiPort;
                options["path"] = this.pathPrefix + path;
                options["protocol"] = this.apiProtocol;
                options["timeout"] = this.timeoutMs;
                options["method"] = method;
                var headers = {};
                headers["Content-Type"] = this.getContentType();
                var formattedBody;
                if(data) {
                    formattedBody= await this.formatBody(data);
                    if(formattedBody && formattedBody.length > 0) {
                        headers["Content-Length"] = Buffer.byteLength(formattedBody);
                    }
                }
                if(overrideToken) {
                    if(formattedBody) {
                        Logger.debug(this.loggerName + "::http() Using override token " + method + " >> " + path + ": " + formattedBody);
                    } else {
                        Logger.debug(this.loggerName + "::http() Using override token " + method + " >> " + path);
                    }
                } else {
                    if(formattedBody) {
                        Logger.debug(this.loggerName + "::http() " + method + " >> " + path + ": " + formattedBody);
                    } else {
                        Logger.debug(this.loggerName + "::http() " + method + " >> " + path);
                    }
                }
                var auth = this.authHeader(overrideToken);
                if(auth && auth.length > 0) {
                    headers["Authorization"] = auth;
                }
                for(let key in this.customHeaders) {
                    var value = this.customHeaders[key];
                    headers[key] = value;
                    Logger.debug(this.loggerName + "::http() Using custom header ", key, value);
                }
                options["headers"] = headers;

                var request = this.client.request(options, (res) => {
                    var status = res.statusCode;
                    var encoding = this.getEncoding();
                    if(encoding && encoding.length > 0) {
                        res.setEncoding(encoding);
                    }

                    var body = "";
                    res.on('data', (chunk) => {
                        if(chunk != null) {
                            body += chunk;
                        }
                    });

                    res.on('end', async () => {
                        var result;
                        if(body.length > 0) {
                            result = await this.parse(body);
                        } else {
                            result = {};
                        }
                        if(status === 302) {
                            Logger.debug(this.loggerName + "::http() " + method + " << " + path + ": " + status + ": " + body);
                            var cookie = res.headers["set-cookie"];
                            if(cookie) {
                                Logger.debug(this.loggerName + "::http() " + method + " << Got cookie " + path + ": " + cookie);
                                var cookieUrl;
                                if(result && result["link"]) {
                                    cookieUrl = result["link"];
                                } else {
                                    cookieUrl = path;
                                }
                                this.urlCookies[cookieUrl] = cookie;
                            }
                            resolve(result);
                        } else if(status === 200 || status === 201 || status === 204 || status === 304) {
                            Logger.debug(this.loggerName + "::http() " + method + " << " + path + ": " + status + ": " + body);
                            resolve(result);
                        } else {
                            Logger.error(this.loggerName + "::http() " + method + " << " + path + ": " + status + ": " + body);
                            resolve(null);
                        }
                    });

                    res.on('error', (err) => {
                        Logger.error(this.loggerName + "::http() << " + path + ":", err);
                        this.sendError(err);
                        resolve(result);
                    });
                });
                request.setTimeout(this.timeoutMs, () => {
                    Logger.error(this.loggerName + "::http() << " + path + ": Connection timeout: " + this.timeoutMs + " ms");
                    request.destroy();
                    resolve(null);
                });
                request.on('error', (err) => {
                    Logger.error(this.loggerName + "::http() << " + path + ":", err);
                    this.sendError(err);
                    request.destroy();
                    resolve(null);
                });
                if(formattedBody && formattedBody.length > 0) {
                    request.write(formattedBody);
                }
                request.end();
            } catch(err) {
                Logger.error(this.loggerName + "::http() << " + path + ":", err);
                this.sendError(err);
                resolve(null);
            }
        });
    }

    get(path, overrideToken) {
        return new Promise(async (resolve) => {
            var result = await this.http(path, "GET", null, overrideToken);
            resolve(result);
        });
    }

    put(path, data, overrideToken) {
        return new Promise(async (resolve) => {
            var result = await this.http(path, "PUT", data, overrideToken);
            resolve(result);
        });
    }

    post(path, data, overrideToken) {
        return new Promise(async (resolve) => {
            var result = await this.http(path, "POST", data, overrideToken);
            resolve(result);
        });
    }

    postMultipart(path, data, fileParameter, filePaths, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var postJson = await this.formatBody(data);
                if(overrideToken) {
                    Logger.debug(this.loggerName + "::postMultipart() Using override token >> " + path + " formData: " + postJson + " filePaths: ", filePaths);
                } else {
                    Logger.debug(this.loggerName + "::postMultipart() >> " + path + " formData: " + postJson + " filePaths: ", filePaths);
                }
                var formData = new FormData();
                if(data) {
                    for(var propName in data) {
                        formData.append(propName, data[propName]);
                    }
                }
                if(fileParameter && filePaths) {
                    for(var i in filePaths) {
                        var filePath = filePaths[i];
                        try {
                            if(!FileSystem.existsSync(filePath)) {
                                Logger.error(this.loggerName + "::postMultipart() File does not exist: " + filePath);
                                resolve(null);
                                return;
                            }
                            var stat = FileSystem.statSync(filePath);
                            if(stat["size"] === 0) {
                                Logger.error(this.loggerName + "::postMultipart() File is empty: " + filePath);
                                resolve(null);
                                return;
                            }
                            formData.append(fileParameter, FileSystem.createReadStream(filePath));
                            Logger.debug(this.loggerName + "::postMultipart() Uploading file: " + filePath);
                        } catch(err) {
                            Logger.error(this.loggerName + "::postMultipart() Error reading file: " + filePath, err);
                            resolve(null);
                            return;
                        }
                    }
                }
                var headers = formData.getHeaders();
                var auth = this.authHeader(overrideToken);
                if(auth && auth.length > 0) {
                    headers["Authorization"] = auth;
                }
                for(let key in this.customHeaders) {
                    var value = this.customHeaders[key];
                    headers[key] = value;
                    Logger.debug(this.loggerName + "::postMultipart() Using custom header ", key, value);
                }

                formData.submit({
                    host: this.apiDomain,
                    port: this.apiPort,
                    protocol: this.apiProtocol,
                    path: this.pathPrefix + path,
                    headers: headers}, (err, res) => {
                    if(err || res == null) {
                        Logger.debug(this.loggerName + "::postMultipart() << " + path + ": " + err);
                        resolve(null);
                        return;
                    }
                    var body = "";
                    // Read incoming data
                    res.on('readable', () => {
                        var chunk = res.read();
                        if(chunk != null) {
                            body += chunk;
                        }
                    });
                    // Incoming data ended
                    res.on('end', async () => {
                        if(res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204 || res.statusCode === 304) {
                            Logger.debug(this.loggerName + "::postMultipart() << " + path + ": " + res.statusCode + ": " + body);
                            var result;
                            if(body && body !== "") {
                                result = await this.parse(body);
                            }
                            resolve(result);
                        } else {
                            Logger.error(this.loggerName + "::postMultipart() << " + path + ": " + res.statusCode + ": " + body);
                            resolve(null);
                        }
                    });
                });
            } catch(err) {
                Logger.error(this.loggerName + "::postMultipart() << " + path + ":", err);
                resolve(null);
            }
        });
    }

    delete(path, deleteData, overrideToken) {
        return new Promise(async (resolve) => {
            var result = await this.http(path, "DELETE", deleteData, overrideToken);
            resolve(result);
        });
    }

    download(url, name, mime, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var cookie = this.urlCookies[url];
                if(overrideToken) {
                    Logger.debug(this.loggerName + "::download() Using override token >> " + url + " name: " + name + " mime: " + mime + " cookie: " + cookie);
                } else {
                    Logger.debug(this.loggerName + "::download() >> " + url + " name: " + name + " mime: " + mime + " cookie: " + cookie);
                }
                var tmpDownloadPath = await this.getTmpDownloadPath();
                if(!tmpDownloadPath) {
                    Logger.error(this.loggerName + "::download() Unable to create temporary folder: " + tmpDownloadPath)
                    resolve(null);
                    return;
                }
                var path = tmpDownloadPath + "/" + name;
                var requestData = {};
                requestData["uri"] = url;
                requestData["method"] = "get";
                var headers = {};
                var auth = this.authHeader(overrideToken);
                if(auth && auth.length > 0) {
                    headers["Authorization"] = auth;
                }
                headers["Accept"] = mime;
                if(cookie && cookie.length > 0) {
                    headers["Cookie"] = cookie;
                }
                requestData["headers"] = headers;

                var req = Request(requestData);
                var res;
                req.on('response', (response) => {
                    res = response;
                });

                req.on('error', (err) => {
                    Logger.debug(this.loggerName + "::download() << " + url + ": " + err);
                    resolve(null);
                });

                req.on('end', () => {
                    if(res == null) {
                        resolve(null);
                    } else if(res.statusCode == 200) {
                        Logger.debug(this.loggerName + "::download() << " + url + ": " + res.statusCode);
                        resolve(path);
                    } else {
                        Logger.error(this.loggerName + "::download() << " + url + ": " + res.statusCode);
                        resolve(null);
                    }
                });

                req.pipe(FileSystem.createWriteStream(path));
            } catch(err) {
                Logger.error(this.loggerName + "::download() << " + url + ":", err);
                resolve(null);
            }
        });
    }

    getTmpDownloadPath() {
        return new Promise(async (resolve) => {
            try {
                var tmpDownloadPath = this.tmpDownloadDir + "/" + UuidV1();
                Mkdirp(tmpDownloadPath, (mkdirError) => {
                    if(mkdirError != null) {
                        Logger.error(this.loggerName + "::getTmpDownloadPath() Unable to create temporary folder: " + tmpDownloadPath)
                        resolve(null);
                        return;
                    }
                    resolve(tmpDownloadPath);
                });
            } catch(err) {
                Logger.error(this.loggerName + "::getTmpDownloadPath()", err);
                resolve(null);
            }
        });
    }

    getTmpUploadPath(callback) {
        return new Promise(async (resolve) => {
            try {
                var tmpUploadPath = this.tmpUploadDir + "/" + UuidV1();
                Mkdirp(tmpUploadPath, (mkdirError) => {
                    if(mkdirError != null) {
                        Logger.error(this.loggerName + "::getTmpUploadPath() Unable to create temporary folder: " + tmpUploadPath)
                        resolve(null);
                        return;
                    }
                    resolve(tmpUploadPath);
                });
            } catch(err) {
                Logger.error(this.loggerName + "::getTmpDownloadPath()", err);
                resolve(null);
            }
        });
    }

    // Format data to encoded get parameters
    toGetParameters(data) {
        var parameters = "";
        var index = 0;
        for(var field in data) {
            if(index++ == 0) {
                parameters += "?";
            } else {
                parameters += "&";
            }
            parameters += encodeURIComponent(field) + "=" + encodeURIComponent(data[field]);
        };
        return parameters;
    }

    getContentType() {
        return "text/plain; charset=UTF-8"
    }

    getEncoding() {
        return "utf-8";
    }

    authHeader(overrideToken) {
        if(overrideToken && overrideToken.length > 0) {
            return "Bearer " + overrideToken;
        } else if(this.apiToken && this.apiToken.length > 0) {
            return "Bearer " + this.apiToken;
        } else if(this.apiBasicAuth && this.apiBasicAuth.length > 0) {
            return "Basic " + this.apiBasicAuth;
        }
        return "";
    }

    formatBody(data) {
        return new Promise(async (resolve) => {
            resolve(data);
        });
    }

    parse(body) {
        return new Promise(async (resolve) => {
            resolve(body);
        });
    }

}

module.exports = BaseRestClient;
