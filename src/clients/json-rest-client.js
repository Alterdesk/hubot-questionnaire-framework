const BaseRestClient = require('./base-rest-client.js');
const Logger = require('./../logger.js');

class JsonRestClient extends BaseRestClient {
    constructor(url, port, loggerName) {
        super(url, port, loggerName || "JsonRestClient")
    }

    getContentType() {
        return 'application/json; charset=UTF-8';
    }

    formatBody(data) {
        return new Promise(async (resolve) => {
            try {
                let result = JSON.stringify(data);
                resolve(result);
            } catch(err) {
                Logger.error("JsonRestClient::formatBody()", err);
                this.sendError(err);
                resolve(null);
            }
        });
    }

    parse(body) {
        return new Promise(async (resolve) => {
            try {
                let result = JSON.parse(body);
                resolve(result);
            } catch(err) {
                Logger.error("JsonRestClient::parse()", err);
                this.sendError(err);
                resolve(null);
            }
        });
    }
}

module.exports = JsonRestClient;
