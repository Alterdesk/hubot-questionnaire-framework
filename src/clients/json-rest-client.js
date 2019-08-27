const FileSystem = require('fs');
const FormData = require('form-data');
const HttpClient = require('scoped-http-client');
const UuidV1 = require('uuid/v1');
const Mkdirp = require('mkdirp');
const Request = require('request');
const Path = require('path');
const OS = require('os');

const Logger = require('./../logger.js');

class JsonRestClient {
    constructor(url, port) {
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
        Logger.debug("JsonRestClient::constructor() URL: " + url + " Port: " + port + " Protocol: " + this.apiProtocol + " Domain: " + this.apiDomain + " Path: " + this.pathParts);
        this.httpOptions = {};
        this.httpOptions.port = this.apiPort;
        this.urlCookies = {};
        this.tmpDownloadDir = Path.resolve(OS.tmpdir(), 'messenger-downloads');
        this.tmpUploadDir = Path.resolve(OS.tmpdir(), 'messenger-uploads');
    }

    setApiToken(apiToken) {
        Logger.debug("JsonRestClient::setApiToken() Token: " + apiToken);
        this.apiToken = apiToken;
    }

    setApiBasicAuth(apiBasicUsername, apiBasicPassword) {
        Logger.debug("JsonRestClient::setApiBasicAuth()");
        this.apiBasicUsername = apiBasicUsername;
        this.apiBasicPassword = apiBasicPassword;
        if(this.apiBasicUsername && this.apiBasicPassword) {
            var auth = this.apiBasicUsername + ":" + this.apiBasicPassword;
            this.apiBasicAuth = Buffer.from(auth).toString('base64');
        }
    }

    http(url, overrideToken) {
        var client = HttpClient.create(url, this.httpOptions);
        client.header('Content-Type', 'application/json; charset=UTF-8');
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
                    Logger.debug("JsonRestClient::get() Using override token >> " + getUrl);
                } else {
                    Logger.debug("JsonRestClient::get() >> " + getUrl);
                }
                this.http(this.apiUrl + getUrl, overrideToken).get()((err, resp, body) => {
                    if(!resp) {
                        Logger.error("JsonRestClient::get() << " + getUrl + ":", err);
                        resolve(null);
                        return;
                    }
                    var status = resp.statusCode;
                    var json;
                    if(body && body !== "") {
                        try {
                            json = JSON.parse(body);
                        } catch(err) {
                            Logger.error("JsonRestClient::get() << " + getUrl + ":", err, body);
                            resolve(null);
                            return;
                        }
                    }
                    if(!json) {
                        Logger.error("JsonRestClient::get() << " + getUrl + ": " + status + ": " + body);
                        resolve(null);
                        return;
                    }
                    if(status === 302) {
                        Logger.debug("JsonRestClient::get() << " + getUrl + ": " + status + ": " + body);
                        var cookie = resp.headers["set-cookie"];
                        if(cookie) {
                            Logger.debug("JsonRestClient::get() Got cookie " + getUrl + ": " + cookie);
                            var url;
                            if(json && json["link"]) {
                                url = json["link"];
                            } else {
                                url = getUrl;
                            }
                            this.urlCookies[url] = cookie;
                        }
                        resolve(json);
                    } else if(status === 200 || status === 201 || status === 204 || status === 304) {
                        Logger.debug("JsonRestClient::get() << " + getUrl + ": " + status + ": " + body);
                        resolve(json);
                    } else {
                        Logger.error("JsonRestClient::get() << " + getUrl + ": " + status + ": " + body);
                        resolve(null);
                    }
                });
            } catch(err) {
                Logger.error("JsonRestClient::get() << " + getUrl + ":", err);
                resolve(null);
            }
        });
    }

    put(putUrl, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                if(overrideToken) {
                    Logger.debug("JsonRestClient::put() Using override token >> " + putUrl);
                } else {
                    Logger.debug("JsonRestClient::put() >> " + putUrl);
                }
                this.http(this.apiUrl + putUrl, overrideToken).put()((err, resp, body) => {
                    if(!resp) {
                        Logger.error("JsonRestClient::put() << " + putUrl + ":", err);
                        resolve(null);
                        return;
                    }
                    var status = resp.statusCode;
                    var json;
                    if(body && body !== "") {
                        try {
                            json = JSON.parse(body);
                        } catch(err) {
                            Logger.error("JsonRestClient::put() << " + putUrl + ":", err, body);
                            resolve(null);
                            return;
                        }
                    }
                    if(!json) {
                        Logger.error("JsonRestClient::put() << " + putUrl + ": " + status + ": " + body);
                        resolve(null);
                        return;
                    }
                    if(status === 200 || status === 201 || status === 204 || status === 304) {
                        Logger.debug("JsonRestClient::put() << " + putUrl + ": " + status + ": " + body);
                        resolve(json);
                    } else {
                        Logger.error("JsonRestClient::put() << " + putUrl + ": " + status + ": " + body);
                        resolve(null);
                    }
                });
            } catch(err) {
                Logger.error("JsonRestClient::put() << " + putUrl + ":", err);
                resolve(null);
            }
        });
    }

    post(postUrl, postJson, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                if(overrideToken) {
                    Logger.debug("JsonRestClient::post() Using override token >> " + postUrl + ": " + postJson);
                } else {
                    Logger.debug("JsonRestClient::post() >> " + postUrl + ": " + postJson);
                }
                this.http(this.apiUrl + postUrl, overrideToken).post(postJson)((err, resp, body) => {
                    if(!resp) {
                        Logger.error("JsonRestClient::post() << " + postUrl + ":", err);
                        resolve(null);
                        return;
                    }
                    var status = resp.statusCode;
                    var json;
                    if(body && body !== "") {
                        try {
                            json = JSON.parse(body);
                        } catch(err) {
                            Logger.error("JsonRestClient::post() << " + postUrl + ":", err, body);
                            resolve(null);
                            return;
                        }
                    }
                    if(!json) {
                        Logger.error("JsonRestClient::post() << " + postUrl + ": " + status + ": " + body);
                        resolve(null);
                        return;
                    }
                    if(status === 200 || status === 201 || status === 204 || status === 304) {
                        Logger.debug("JsonRestClient::post() << " + postUrl + ": " + status + ": " + body);
                        resolve(json);
                    } else {
                        Logger.error("JsonRestClient::post() << " + postUrl + ": " + status + ": " + body);
                        resolve(null);
                    }
                });
            } catch(err) {
                Logger.error("JsonRestClient::post() << " + postUrl + ":", err);
                resolve(null);
            }
        });
    }

    postMultipart(postUrl, postData, fileParameter, filePaths, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var postJson = JSON.stringify(postData);
                if(overrideToken) {
                    Logger.debug("JsonRestClient::postMultipart() Using override token >> " + postUrl + " formData: " + postJson + " filePaths: ", filePaths);
                } else {
                    Logger.debug("JsonRestClient::postMultipart() >> " + postUrl + " formData: " + postJson + " filePaths: ", filePaths);
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
                                Logger.error("JsonRestClient::postMultipart() File does not exist: " + filePath);
                                resolve(null);
                                return;
                            }
                            var stat = FileSystem.statSync(filePath);
                            if(stat["size"] === 0) {
                                Logger.error("JsonRestClient::postMultipart() File is empty: " + filePath);
                                resolve(null);
                                return;
                            }
                            formData.append(fileParameter, FileSystem.createReadStream(filePath));
                            Logger.debug("JsonRestClient::postMultipart() Uploading file: " + filePath);
                        } catch(err) {
                            Logger.error("JsonRestClient::postMultipart() Error reading file: " + filePath, err);
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
                    Logger.debug("JsonRestClient::postMultipart() Using post url " + usePostUrl);
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
                        Logger.debug("JsonRestClient::postMultipart() << " + postUrl + ": " + err);
                        resolve(null);
                        return;
                    }
                    var body = "";
                    // Read incoming data
                    res.on('readable', () => {
                        body += res.read();
                    });
                    // Incoming data ended
                    res.on('end', () => {
                        if(res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204 || res.statusCode === 304) {
                            Logger.debug("JsonRestClient::postMultipart() << " + postUrl + ": " + res.statusCode + ": " + body);
                            var json;
                            if(body && body !== "") {
                                json = JSON.parse(body);
                            }
                            resolve(json);
                        } else {
                            Logger.error("JsonRestClient::postMultipart() << " + postUrl + ": " + res.statusCode + ": " + body);
                            resolve(null);
                        }
                    });
                });
            } catch(err) {
                Logger.error("JsonRestClient::postMultipart() << " + postUrl + ":", err);
                resolve(null);
            }
        });
    }

    delete(deleteUrl, deleteJson, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                if(overrideToken) {
                    Logger.debug("JsonRestClient::delete() Using override token >> " + deleteUrl);
                } else {
                    Logger.debug("JsonRestClient::delete() >> " + deleteUrl);
                }
                this.http(this.apiUrl + deleteUrl, overrideToken).delete(deleteJson)((err, resp, body) => {
                    if(!resp) {
                        Logger.error("JsonRestClient::delete() << " + deleteUrl + ":", err);
                        resolve(null);
                        return;
                    }
                    var status = resp.statusCode;
                    var json;
                    if(body && body !== "") {
                        try {
                            json = JSON.parse(body);
                        } catch(err) {
                            Logger.error("JsonRestClient::delete() << " + deleteUrl + ":", err, body);
                            resolve(null);
                            return;
                        }
                    }
                    if(!json) {
                        Logger.error("JsonRestClient::delete() << " + deleteUrl + ": " + status + ": " + body);
                        resolve(null);
                        return;
                    }
                    if(status === 200 || status === 201 || status === 204 || status === 304) {
                        Logger.debug("JsonRestClient::delete() << " + deleteUrl + ": " + status + ": " + body);
                        resolve(json);
                    } else {
                        Logger.error("JsonRestClient::delete() << " + deleteUrl + ": " + status + ": " + body);
                        resolve(null);
                    }
                });
            } catch(err) {
                Logger.error("JsonRestClient::delete() << " + deleteUrl + ":", err);
                resolve(null);
            }
        });
    }

    download(url, name, mime, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                var cookie = this.urlCookies[url];
                if(overrideToken) {
                    Logger.debug("JsonRestClient::download() Using override token >> " + url + " name: " + name + " mime: " + mime + " cookie: " + cookie);
                } else {
                    Logger.debug("JsonRestClient::download() >> " + url + " name: " + name + " mime: " + mime + " cookie: " + cookie);
                }
                var tmpDownloadPath = await this.getTmpDownloadPath();
                if(!tmpDownloadPath) {
                    Logger.error("JsonRestClient::download() Unable to create temporary folder: " + tmpDownloadPath)
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
                Logger.debug("JsonRestClient::download() Request data:", JSON.stringify(requestData));
                var req = Request(requestData);
                var res;
                req.on('response', (response) => {
                    res = response;
                });

                req.on('error', (err) => {
                    Logger.debug("JsonRestClient::download() << " + url + ": " + err);
                    resolve(null);
                });

                req.on('end', () => {
                    if(res == null) {
                        resolve(null);
                    } else if(res.statusCode == 200) {
                        Logger.debug("JsonRestClient::download() << " + url + ": " + res.statusCode);
                        resolve(path);
                    } else {
                        Logger.error("JsonRestClient::download() << " + url + ": " + res.statusCode);
                        resolve(null);
                    }
                });

                req.pipe(FileSystem.createWriteStream(path));
            } catch(err) {
                Logger.error("JsonRestClient::getTmpDownloadPath() << " + deleteUrl + ":", err);
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
                        Logger.error("JsonRestClient::getTmpDownloadPath() Unable to create temporary folder: " + tmpDownloadPath)
                        resolve(null);
                        return;
                    }
                    resolve(tmpDownloadPath);
                });
            } catch(err) {
                Logger.error("JsonRestClient::getTmpDownloadPath() << " + deleteUrl + ":", err);
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
                        Logger.error("JsonRestClient::getTmpUploadPath() Unable to create temporary folder: " + tmpUploadPath)
                        resolve(null);
                        return;
                    }
                    resolve(tmpUploadPath);
                });
            } catch(err) {
                Logger.error("JsonRestClient::getTmpDownloadPath() << " + deleteUrl + ":", err);
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
}

module.exports = JsonRestClient;