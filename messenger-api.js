// Description:
//   Messenger API helper script
//
// Dependencies:
//   form-data
//   scoped-http-client
//   fs
//
// Configuration:
//   OAuth token
//
// Commands:
//
// Author:
//   Alterdesk

// Requirements
var FormData = require('form-data');
var HttpClient = require('scoped-http-client');
var FileSystem = require('fs');
const {TextMessage, LeaveMessage} = require('hubot');

// Listeners for the bot
var messengerBotListeners = {};

var textRegex = new RegExp(/\w+/, 'i');
var phoneRegex = new RegExp(/^\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d| 2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]| 4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/);
var emailRegex = new RegExp(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/, 'i');
var stopRegex;

// Response settings
var responseTimeoutText;
var responseTimeoutMs = 60000;
var catchAllCommands = false;
var catchAllText = "COMMAND_NOT_FOUND_TEXT";
var catchHelpCommand = false;
var catchHelpText = "HELP_TEXT";

module.exports = {

    // Api connection class
    Api: class {

        /*
        *   High level messenger API helper functions
        */

        invite(inviteUserData, callback) {
          var inviteData = {};
          inviteData["create_conversation"] = inviteUserData.createConversation;
          if(inviteUserData.email != null) {
            inviteData["email"] = inviteUserData.email;
          } else if(inviteUsersData.phoneNumber != null) {
//            inviteData["phone_number"] = inviteUserData.phoneNumber; // TODO
          }
          inviteData["first_name"] = inviteUserData.firstName;
          inviteData["last_name"] = inviteUserData.lastName;
          if(answers.inviteMessage != null) {
            inviteData["invite_text"] = inviteUserData.inviteMessage;  // Only used when creating conversation
          }
          var invitePostJson = JSON.stringify(inviteData);

          if(inviteUserData.inviteType == "coworker") {
              this.post("users/invite/coworker", invitePostJson, callback);
          } else if(inviteUserData.inviteType == "contact") {
              this.post("users/invite/contact", invitePostJson, callback);
          } else if(inviteUserData.inviteType == "private_user") {
              this.post("users/invite/private", invitePostJson, callback);
          } else {
            console.error("Unknown invite type on invite: \"" + inviteUserData.inviteType + "\"")
            callback(false, null);
          }
        };

        createGroup(groupData, callback) {
          // Group chat settings
          var settingsPostData = {};
          settingsPostData["allow_contacts"] = groupData.allowContacts;
          settingsPostData["auto_close_after"] = groupData.autoCloseAfter;
          settingsPostData["auto_expire_after"] = groupData.autoExpireAfter;
          settingsPostData["hybrid_messaging"] = groupData.hybridMessaging;
          settingsPostData["members_can_invite"] = groupData.membersCanInvite;

          // Invite user data
          var inviteUsersData = [];
          for(var inviteIndex in groupData.inviteUsers) {
             var invite = groupData.inviteUsers[inviteIndex];
             var inviteData = {};
             inviteData["create_conversation"] = invite.createConversation;
             inviteData["email"] = invite.email;
             inviteData["first_name"] = invite.firstName;
             inviteData["last_name"] = invite.lastName;
             if(invite.inviteMessage != null) {
               inviteData["invite_text"] = invite.inviteMessage;  // Only used when creating conversation
             }
             inviteData["invite_type"] = invite.inviteType;
             inviteUsersData.push(inviteData);
          }

          // Group data
          var groupPostData = {};
          groupPostData["invite_users"] = inviteUsersData;
          groupPostData["members"] = groupData.memberIds;
          groupPostData["settings"] = settingsPostData;
          groupPostData["subject"] = groupData.subject;

          var groupPostJson = JSON.stringify(groupPostData);
          this.post("groupchats", groupPostJson, callback, groupData.overrideToken);
        };

        sendGroupMessage(groupId, messageData, callback) {
            var messagePostData = {};
            if(messageData.attachmentPaths != null) {
              messagePostData["message"] = messageData.message;
              this.postMultipart("groupchats/" + groupId + "/attachments", messagePostData, messageData.attachmentPaths, callback, messageData.overrideToken);
            } else {
              messagePostData["body"] = messageData.message;
              var messageJson = JSON.stringify(messagePostData);
              this.post("groupchats/" + groupId + "/messages", messageJson, callback, messageData.overrideToken);
            }
        };


        /*
        *   Messenger API helper functions
        */

        http(url) {//, options) {
          return HttpClient.create(url);//, this.extend({}, this.globalHttpOptions, options));
        };

        get(getUrl, callback, overrideToken) {
          console.log("Messenger::get() >> " + getUrl);
          var token = overrideToken || this.apiToken;
          this.http(this.apiUrl + getUrl).header('Authorization', 'Bearer ' + token).header('Content-Type', 'application/json; charset=UTF-8').get()(function(err, resp, body) {
            if (resp.statusCode === 200) {
              console.log("Messenger::get() << " + getUrl + ": " + body);
              var json = JSON.parse(body);
              callback(true, json);
            } else {
              console.error("Messenger::get() << " + getUrl + ": " + resp.statusCode + ": " + body);
              callback(false, null);
            }
          });
        }

        post(postUrl, postJson, callback, overrideToken) {
          console.log("Messenger::post() >>" + postUrl + ": " + postJson);
          var token = overrideToken || this.apiToken;
          this.http(this.apiUrl + postUrl).header('Authorization', 'Bearer ' + token).header('Content-Type', 'application/json; charset=UTF-8').post(postJson)(function(err, resp, body) {
            if(resp.statusCode === 201) {
              console.log("Messenger::post() << " + postUrl + ": " + body);
              var json = JSON.parse(body);
              callback(true, json);
            } else {
              console.error("Messenger::post() << " + postUrl + ": " + resp.statusCode + ": " + body);
              callback(false, null);
            }
          });
        };

        postMultipart(postUrl, postData, attachmentPaths, callback, overrideToken) {
          console.log("Messenger::postMultipart() >> " + postUrl + " formData: " + postData);
          var token = overrideToken || this.apiToken;
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
          headers["Authorization"] = ("Bearer " + token);
          formData.submit({
            host: this.apiDomain,
            port: this.apiPort,
            protocol: this.apiProtocol + ":",
            path: "/" + this.apiVersion + "/" + postUrl,
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
        };


        /*
        *   API destination settings
        */

        setApiDestination(protocol, domain, version, port) {
          this.apiProtocol = protocol;// = "https";
          this.apiDomain = domain;// = "localapi.alterdesk.com";
          this.apiVersion = version;// = "v1";
          this.apiPort = port;// = 443;
          this.apiUrl = protocol + "://" + domain + "/" + version + "/";
          console.log("API Destination URL: " + this.apiUrl);
        };

        setApiToken(token) {
          this.apiToken = token;
        };


        /*
        *   Limit bot access to userIds, coworkers or everyone
        */

        limitUsage(limitType, limitData) {
          this.limitType = limitType;
          this.limitData = limitData;

          if(limitType == "coworkers") {
            var api = this;
            this.get("me", function(success, json) {
              if(success) {
                api.botCompanyId = json["company_id"];
                console.log("Bot company id: " + api.botCompanyId);
              } else {
                console.error("Unable to retrieve bot account");
              }
            });
          }
        };

        userAllowed(userId, callback) {
          console.log("userAllowed: userId: " + userId + " limitType: " + this.limitType + " limitData: " + this.limitData);
          if(this.limitType == null) {
            console.error("Usage limit not configured");
            callback(false);
          } else if(this.limitType == "everyone") {
            callback(true);
          } else if(this.limitType == "coworkers") {
            if(api.botCompanyId == null) {
              console.error("Bot company id not set");
              callback(false);
              return;
            }
            var api = this;
            this.get("users/" + userId, function(success, json) {
              if(success) {
                var userCompanyId = json["company_id"];
                var isCoworker = api.botCompanyId == userCompanyId && userCompanyId != null;
                console.log("Coworker check: isCoworker: " + isCoworker + "bot: " + api.botCompanyId + " user: " + userCompanyId);
                callback(isCoworker);
              } else {
                console.error("Unable to retrieve user by id on userAllowed: " + userId);
                callback(false);
              }
            });
          } else if(this.limitType == "userIds") {
            if(this.limitData == null) {
              console.error("Limit data not set when using type \"userIds\" on userAllowed");
              callback(false);
              return;
            }
            for(var index in this.limitData) {
              var id = this.limitData[index];
              if(userId == id) {
                console.log("UserId found in allowed user ids list on userAllowed");
                callback(true);
                return;
              }
            }
            console.log("UserId not found in allowed user ids list on userAllowed");
            callback(false);
          } else {
            console.error("Unknown limit type on userAllowed: \"" + this.limitType + "\"");
            callback(false);
          }
        };
    },


    /*
    *   Override the default receiver
    */

    setRobotReceiver: function(robot) {
      robot.defaultRobotReceiver = robot.receive;
        robot.receive = function(message) {
          var userId;
          if(message.user != null) {
            userId = message.user.id;
          }
          if(message instanceof TextMessage) {
//              console.log("receive: " + message);
              var lst;
              if (userId != null && messengerBotListeners[userId] != null) {
//                console.log("user: " + userId);
                lst = messengerBotListeners[userId];
                delete messengerBotListeners[userId];
                if (lst.call(message)) {
                  return;
                }
                // Put back to process next message
                messengerBotListeners[userId] = lst;
              }
              if(catchHelpCommand && (message == robot.name + " help" || message == "help")) {  // TODO Maybe use regex
//                console.log("Captured help");
                var response = new robot.Response(robot, message, true);
                response.send(catchHelpText);
                return;
              }
              if(catchAllCommands && message != "uitnodigen" && message != "test" && message != "toegang") {    // TODO
                var response = new robot.Response(robot, message, true);
                response.send(catchAllText);
                return;
              }
          } else if(message instanceof LeaveMessage) {
              console.log("Leave detected");
              if(userId != null && messengerBotListeners[userId] != null) {
                delete messengerBotListeners[userId];
              }
          }
      //    console.log("Passing through original receive");
          return robot.defaultRobotReceiver(message);
        };
    },

    // Listeners for followup questions
    addListener: function(userId, listener) {
      messengerBotListeners[userId] = listener;
    },
    removeListener: function(userId) {
      delete messengerBotListeners[userId];
    },
    hasListener: function(userId) {
      return messengerBotListeners[userId] != null;
    },
    getListener: function(userId) {
      return messengerBotListeners[userId];
    },

    // Regex to check if user wants to stop the current process
    setStopRegex: function(s) {
      stopRegex = s;
    },

    // Response timeout configuration
    setResponseTimeoutText: function(t) {
      responseTimeoutText = t;
    },
    setResponseTimeoutMs: function(ms) {
      responseTimeoutMs = ms;
    },

    // Catch all given commands and send default message when command is unknown
    setCatchAll: function(catchAll) {
      catchAllCommands = catchAll;
    },
    setCatchAllText: function(text) {
      catchAllText = text;
    },

    // Configuration to override default hubot help
    setCatchHelp: function(catchHelp) {
      catchHelpCommand = catchHelp;
    },
    setCatchHelpText: function(text) {
      catchHelpText = text;
    },


    /*
    *   Classes
    */

    // Data container for inviting users
    InviteUserData: class {
        constructor() {
            this.createConversation = false;
        };
    },

    // Data container for creating group chats
    CreateGroupData: class {
        constructor() {
            // Users to invite
            this.inviteUsers = [];

            // Default thread settings
            this.allowContacts = true;
            this.autoCloseAfter = 0;
            this.autoExpireAfter = 0;
            this.hybridMessaging = false;
            this.membersCanInvite = false;
        };

        addInvite(inviteUserData) {
            this.inviteUsers.push(inviteUserData);
        };
    },

    SendMessageData: class {
      constructor() {
        this.attachmentPaths = [];
      };

      addAttachmentPath(path) {
        this.attachmentPaths.push(path);
      };
    },

    // Data container of answers that the user has given
    Answers: class {
    },

    // Listener class for consecutive questions
    Listener: class {
      constructor(rob, msg, call, ans, reg) {
        this.call = this.call.bind(this);
        this.robot = rob;
        this.callback = call;
        this.answers = ans;
        if(reg != null) {
          this.regex = reg;
        } else {
          this.regex = textRegex;
        }
//        if (r.enableSlash) {
//          this.regex = new RegExp(`^(?:\/|${rob.name}:?)\\s*(.*?)\\s*$`, 'i');
//        } else {
//          this.regex = new RegExp(`^${rob.name}:?\\s*(.*?)\\s*$`, 'i');
//        }
        this.matcher = (message) => {
          if (message.text != null) {
            return message.text.match(this.regex);
          }
        };
        this.stopMatcher = (message) => {
          if (message.text != null && stopRegex != null) {
            return message.text.match(stopRegex);
          }
        };
        this.timer = setTimeout(function () {
            console.log("Response timeout: user: " + msg.message.user.id);
            delete messengerBotListeners[msg.message.user.id];
            if(responseTimeoutText != null) {
              msg.send(responseTimeoutText);
            }
        }, responseTimeoutMs);
      }

      call(message) {
        clearTimeout(this.timer);
        this.matches = this.matcher(message);
        this.stop = this.stopMatcher(message);
        this.callback(new this.robot.Response(this.robot, message, true), this);
        return true;
      }
    },


    /*
    *   Regex
    */

    getTextRegex: function() {
      return textRegex;
    },
    getPhoneRegex: function() {
      return phoneRegex;
    },
    getEmailRegex: function() {
      return emailRegex;
    }
}