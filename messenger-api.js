// Requirements
var FormData = require('form-data');
var Http = require('http');
var FileSystem = require('fs');

module.exports = {

    get: function(msg, apiUrl, getUrl, messengerToken, callback) {
      console.log("Messenger::get() >> " + getUrl);
      msg.http(apiUrl + getUrl).header('Authorization', 'Bearer ' + messengerToken).header('Content-Type', 'application/json; charset=UTF-8').get()(function(err, resp, body) {
        if (resp.statusCode === 200) {
          console.log("Messenger::get() << " + getUrl + ": " + body);
          var json = JSON.parse(body);
          callback(true, json);
        } else {
          console.error("Messenger::get() << " + getUrl + ": " + resp.statusCode + ": " + body);
          callback(false, null);
        }
      });
    },

    post: function(msg, apiUrl, postUrl, postJson, messengerToken, callback) {
      console.log("Messenger::post() >>" + postUrl + ": " + postJson);
      msg.http(apiUrl + postUrl).header('Authorization', 'Bearer ' + messengerToken).header('Content-Type', 'application/json; charset=UTF-8').post(postJson)(function(err, resp, body) {
        if(resp.statusCode === 201) {
          console.log("Messenger::post() << " + postUrl + ": " + body);
          var json = JSON.parse(body);
          callback(true, json);
        } else {
          console.error("Messenger::post() << " + postUrl + ": " + resp.statusCode + ": " + body);
          callback(false, null);
        }
      });
    },

    postMultipart: function(msg, apiDomain, apiPort, apiProtocol, apiVersion, postUrl, postData, attachmentPaths, messengerToken, callback) {
      console.log("Messenger::postMultipart() >> " + postUrl + " formData: " + postData);
      // npm install --save form-data (https://github.com/form-data/form-data)
      var formData = new FormData();
      for(var propName in postData) {
        formData.append(propName, postData[propName]);
      }
      for(var i in attachmentPaths) {
        try {
          formData.append('files', FileSystem.createReadStream(attachmentPaths[i]));
        } catch(err) {
          console.error(err);
        }
      }
      var headers = formData.getHeaders();
      headers["Authorization"] = ("Bearer " + messengerToken);
      formData.submit({
        host: apiDomain,
        port: apiPort,
        protocol: apiProtocol + ":",
        path: "/" + apiVersion + "/" + postUrl,
        headers: headers}, function(err, res) {
          if(err != null) {
            console.error(err);
          }
          if(res == null) {
            callback(false, null);
            return;
          }
          var body = "";
          // Read incoming data
          res.on('readable', function() {
            body += res.read();
          });
          // Incoming data ended
          res.on('end', function() {
            if(res.statusCode === 201) {
              console.log("Messenger::postMultipart() << " + postUrl + ": " + body);
              var json = JSON.parse(body);
              callback(true, json);
            } else {
              console.error("Messenger::postMultipart() << " + postUrl + ": " + res.statusCode + ": " + body);
              callback(false, null);
            }
          });
        });
    }
}