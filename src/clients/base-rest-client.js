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
        this.apiUrl = url;
        this.apiPort = parseInt(port);
        var domain;
        if(url.startsWith("https://")) {
            this.apiProtocol = "https";
            domain = url.replace("https://", "");
        } else if(url.startsWith("http://")) {
            domain = url.replace("http://", "");
        } else {
            domain = url;
        }
        if(this.apiProtocol === "https") {
            this.client = require('https');
        } else {
            this.apiProtocol = "http";
            this.client = require('http');
        }
        this.pathParts = [];
        var urlParts = domain.split("/");
        if(urlParts && urlParts.length > 0) {
            for(let index in urlParts) {
                var urlPart = urlParts[index];
                if(!this.apiDomain) {
                    this.apiDomain = urlPart;
                } else {
                    this.pathParts.push(urlPart);
                }
            }
        }
        Logger.debug(this.loggerName + "::constructor() URL: " + url + " Port: " + port + " Protocol: " + this.apiProtocol + " Domain: " + this.apiDomain + " Path: " + this.pathParts);
        this.urlCookies = {};
        this.tmpDownloadDir = Path.resolve(OS.tmpdir(), 'messenger-downloads');
        this.tmpUploadDir = Path.resolve(OS.tmpdir(), 'messenger-uploads');
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

    http(url, method, data, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                if(overrideToken) {
                    Logger.debug(this.loggerName + "::http() Using override token + " + method + " >> " + url);
                } else {
                    Logger.debug(this.loggerName + "::http() " + method + " >> " + url);
                }
                var options = {};
                options["hostname"] = this.apiDomain;
                options["defaultPort"] = this.apiPort;
                options["port"] = this.apiPort;
                options["path"] = this.apiUrl + url;
                options["protocol"] = this.apiProtocol + ":";
                options["method"] = method;
                var headers = {};
                headers["Content-Type"] = this.getContentType();
                if(data) {
                    var formattedBody = await this.formatBody(data);
                    if(formattedBody && formattedBody.length > 0) {
                        headers["Content-Length"] = Buffer.byteLength(formattedBody);
                    }
                }
                var auth = this.authHeader(overrideToken);
                if(auth && auth.length > 0) {
                    headers["Authorization"] = auth;
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
                        body += chunk;
                    });

                    res.on('end', async () => {
                        var result;
                        if(body && body.length > 0) {
                            result = await this.parse(body);
                        }
                        if(status === 302) {
                            Logger.debug(this.loggerName + "::http() " + method + " << " + url + ": " + status + ": " + body);
                            var cookie = res.headers["set-cookie"];
                            if(cookie) {
                                Logger.debug(this.loggerName + "::http() " + method + " << Got cookie " + url + ": " + cookie);
                                var cookieUrl;
                                if(result && result["link"]) {
                                    cookieUrl = result["link"];
                                } else {
                                    cookieUrl = getUrl;
                                }
                                this.urlCookies[cookieUrl] = cookie;
                            }
                            resolve(result);
                        } else if(status === 200 || status === 201 || status === 204 || status === 304) {
                            Logger.debug(this.loggerName + "::http() " + method + " << " + url + ": " + status + ": " + body);
                            resolve(result);
                        } else {
                            Logger.error(this.loggerName + "::http() " + method + " << " + url + ": " + status + ": " + body);
                            resolve(null);
                        }
                    });

                    res.on('error', (err) => {
                        Logger.error(this.loggerName + "::http() << " + url + ":", err);
                        resolve(result);
                    });
                });
                if(formattedBody && formattedBody.length > 0) {
                    request.write(formattedBody);
                }
                request.end();
            } catch(err) {
                Logger.error(this.loggerName + "::http() << " + url + ":", err);
                resolve(null);
            }
        });
    }

    get(url, overrideToken) {
        return new Promise(async (resolve) => {
            var result = await this.http(url, "GET", null, overrideToken);
            resolve(result);
        });
    }

    put(url, data, overrideToken) {
        return new Promise(async (resolve) => {
            var result = await this.http(url, "PUT", data, overrideToken);
            resolve(result);
        });
    }

    post(url, data, overrideToken) {
        return new Promise(async (resolve) => {
            var result = await this.http(url, "POST", data, overrideToken);
            resolve(result);
        });
    }

    postMultipart(postUrl, data, fileParameter, filePaths, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var postJson = await this.formatBody(data);
                if(overrideToken) {
                    Logger.debug(this.loggerName + "::postMultipart() Using override token >> " + postUrl + " formData: " + postJson + " filePaths: ", filePaths);
                } else {
                    Logger.debug(this.loggerName + "::postMultipart() >> " + postUrl + " formData: " + postJson + " filePaths: ", filePaths);
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

                var usePostUrl;
                if(this.pathParts.length > 0) {
                    usePostUrl = "";
                    for(let index in this.pathParts) {
                        var pathPart = this.pathParts[index];
                        usePostUrl += pathPart + "/";
                    }
                    usePostUrl += postUrl;
                    Logger.debug(this.loggerName + "::postMultipart() Using post url " + usePostUrl);
                } else {
                    usePostUrl = postUrl;
                }

                formData.submit({
                    host: this.apiDomain,
                    port: this.apiPort,
                    protocol: this.apiProtocol + ":",
                    path: "/" + usePostUrl,
                    headers: headers}, (err, res) => {
                    if(err || res == null) {
                        Logger.debug(this.loggerName + "::postMultipart() << " + postUrl + ": " + err);
                        resolve(null);
                        return;
                    }
                    var body = "";
                    // Read incoming data
                    res.on('readable', () => {
                        body += res.read();
                    });
                    // Incoming data ended
                    res.on('end', async () => {
                        if(res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204 || res.statusCode === 304) {
                            Logger.debug(this.loggerName + "::postMultipart() << " + postUrl + ": " + res.statusCode + ": " + body);
                            var result;
                            if(body && body !== "") {
                                result = await this.parse(body);
                            }
                            resolve(result);
                        } else {
                            Logger.error(this.loggerName + "::postMultipart() << " + postUrl + ": " + res.statusCode + ": " + body);
                            resolve(null);
                        }
                    });
                });
            } catch(err) {
                Logger.error(this.loggerName + "::postMultipart() << " + postUrl + ":", err);
                resolve(null);
            }
        });
    }

    delete(url, deleteData, overrideToken) {
        return new Promise(async (resolve) => {
            var result = await this.http(url, "DELETE", deleteData, overrideToken);
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
                Logger.error(this.loggerName + "::getTmpDownloadPath() << " + deleteUrl + ":", err);
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
                Logger.error(this.loggerName + "::getTmpDownloadPath() << " + deleteUrl + ":", err);
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