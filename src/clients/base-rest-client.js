const FileSystem = require('fs');
const FormData = require('form-data');
const HttpClient = require('scoped-http-client');
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
        this.apiPort = port;
        var domain;
        if(url.startsWith("http://")) {
            this.apiProtocol = "http";
            domain = url.replace("http://", "");
        } else {
            this.apiProtocol = "https";
            domain = url.replace("https://", "");
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
        this.httpOptions = {};
        this.httpOptions.port = this.apiPort;
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

    http(url, overrideToken) {
        var client = HttpClient.create(url, this.httpOptions);
        client.header('Content-Type', this.getContentType());
        if(overrideToken && overrideToken.length > 0) {
            client.header('Authorization', 'Bearer ' + overrideToken);
        } else if(this.apiToken && this.apiToken.length > 0) {
            client.header('Authorization', 'Bearer ' + this.apiToken);
        } else if(this.apiBasicAuth && this.apiBasicAuth.length > 0) {
            client.header('Authorization', 'Basic ' + this.apiBasicAuth);
        }
        return client;
    }

    get(getUrl, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                if(overrideToken) {
                    Logger.debug(this.loggerName + "::get() Using override token >> " + getUrl);
                } else {
                    Logger.debug(this.loggerName + "::get() >> " + getUrl);
                }
                this.http(this.apiUrl + getUrl, overrideToken).get()(async (err, resp, body) => {
                    if(!resp) {
                        Logger.error(this.loggerName + "::get() << " + getUrl + ":", err);
                        resolve(null);
                        return;
                    }
                    var status = resp.statusCode;
                    var result;
                    if(body && body !== "") {
                        result = await this.parse(body);
                    }
                    if(!result) {
                        Logger.error(this.loggerName + "::get() << " + getUrl + ": " + status + ": " + body);
                        resolve(null);
                        return;
                    }
                    if(status === 302) {
                        Logger.debug(this.loggerName + "::get() << " + getUrl + ": " + status + ": " + body);
                        var cookie = resp.headers["set-cookie"];
                        if(cookie) {
                            Logger.debug(this.loggerName + "::get() Got cookie " + getUrl + ": " + cookie);
                            var url;
                            if(result && result["link"]) {
                                url = result["link"];
                            } else {
                                url = getUrl;
                            }
                            this.urlCookies[url] = cookie;
                        }
                        resolve(result);
                    } else if(status === 200 || status === 201 || status === 204 || status === 304) {
                        Logger.debug(this.loggerName + "::get() << " + getUrl + ": " + status + ": " + body);
                        resolve(result);
                    } else {
                        Logger.error(this.loggerName + "::get() << " + getUrl + ": " + status + ": " + body);
                        resolve(null);
                    }
                });
            } catch(err) {
                Logger.error(this.loggerName + "::get() << " + getUrl + ":", err);
                resolve(null);
            }
        });
    }

    put(putUrl, putData, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var putJson = await this.formatBody(putData);
                if(overrideToken) {
                    Logger.debug(this.loggerName + "::put() Using override token >> " + putUrl);
                } else {
                    Logger.debug(this.loggerName + "::put() >> " + putUrl);
                }
                this.http(this.apiUrl + putUrl, overrideToken).put(putJson)(async (err, resp, body) => {
                    if(!resp) {
                        Logger.error(this.loggerName + "::put() << " + putUrl + ":", err);
                        resolve(null);
                        return;
                    }
                    var status = resp.statusCode;
                    var result;
                    if(body && body !== "") {
                        result = await this.parse(body);
                    }
                    if(status === 200 || status === 201 || status === 204 || status === 304) {
                        Logger.debug(this.loggerName + "::put() << " + putUrl + ": " + status + ": " + body);
                        resolve(result);
                    } else {
                        Logger.error(this.loggerName + "::put() << " + putUrl + ": " + status + ": " + body);
                        resolve(null);
                    }
                });
            } catch(err) {
                Logger.error(this.loggerName + "::put() << " + putUrl + ":", err);
                resolve(null);
            }
        });
    }

    post(postUrl, postData, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var postJson = await this.formatBody(postData);
                if(overrideToken) {
                    Logger.debug(this.loggerName + "::post() Using override token >> " + postUrl + ": " + postJson);
                } else {
                    Logger.debug(this.loggerName + "::post() >> " + postUrl + ": " + postJson);
                }
                this.http(this.apiUrl + postUrl, overrideToken).post(postJson)(async (err, resp, body) => {
                    if(!resp) {
                        Logger.error(this.loggerName + "::post() << " + postUrl + ":", err);
                        resolve(null);
                        return;
                    }
                    var status = resp.statusCode;
                    var result;
                    if(body && body !== "") {
                        result = await this.parse(body);
                    }
                    if(status === 200 || status === 201 || status === 204 || status === 304) {
                        Logger.debug(this.loggerName + "::post() << " + postUrl + ": " + status + ": " + body);
                        resolve(result);
                    } else {
                        Logger.error(this.loggerName + "::post() << " + postUrl + ": " + status + ": " + body);
                        resolve(null);
                    }
                });
            } catch(err) {
                Logger.error(this.loggerName + "::post() << " + postUrl + ":", err);
                resolve(null);
            }
        });
    }

    postMultipart(postUrl, postData, fileParameter, filePaths, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var postJson = await this.formatBody(postData);
                if(overrideToken) {
                    Logger.debug(this.loggerName + "::postMultipart() Using override token >> " + postUrl + " formData: " + postJson + " filePaths: ", filePaths);
                } else {
                    Logger.debug(this.loggerName + "::postMultipart() >> " + postUrl + " formData: " + postJson + " filePaths: ", filePaths);
                }
                var formData = new FormData();
                if(postData) {
                    for(var propName in postData) {
                        formData.append(propName, postData[propName]);
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
                var auth;
                if(overrideToken && overrideToken.length > 0) {
                    auth = "Bearer " + overrideToken;
                } else if(this.apiToken && this.apiToken.length > 0) {
                    auth = "Bearer " + this.apiToken;
                }
                if(auth) {
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

    delete(deleteUrl, deleteData, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var deleteJson = await this.formatBody(deleteData);
                if(overrideToken) {
                    Logger.debug(this.loggerName + "::delete() Using override token >> " + deleteUrl);
                } else {
                    Logger.debug(this.loggerName + "::delete() >> " + deleteUrl);
                }
                this.http(this.apiUrl + deleteUrl, overrideToken).delete(deleteJson)(async (err, resp, body) => {
                    if(!resp) {
                        Logger.error(this.loggerName + "::delete() << " + deleteUrl + ":", err);
                        resolve(null);
                        return;
                    }
                    var status = resp.statusCode;
                    var result;
                    if(body && body !== "") {
                        result = await this.parse(body);
                    }
                    if(!result) {
                        Logger.error(this.loggerName + "::delete() << " + deleteUrl + ": " + status + ": " + body);
                        resolve(null);
                        return;
                    }
                    if(status === 200 || status === 201 || status === 204 || status === 304) {
                        Logger.debug(this.loggerName + "::delete() << " + deleteUrl + ": " + status + ": " + body);
                        resolve(result);
                    } else {
                        Logger.error(this.loggerName + "::delete() << " + deleteUrl + ": " + status + ": " + body);
                        resolve(null);
                    }
                });
            } catch(err) {
                Logger.error(this.loggerName + "::delete() << " + deleteUrl + ":", err);
                resolve(null);
            }
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
                var token = overrideToken || this.apiToken;
                if(token && token.length > 0) {
                    headers["Authorization"] = "Bearer " + token;
                }
                headers["Accept"] = mime;
                if(cookie && cookie.length > 0) {
                    headers["Cookie"] = cookie;
                }
                requestData["headers"] = headers;
                Logger.debug(this.loggerName + "::download() Request data:", await this.formatBody(requestData));
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
                Logger.error(this.loggerName + "::getTmpDownloadPath() << " + deleteUrl + ":", err);
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
}

module.exports = BaseRestClient;