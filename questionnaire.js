// Description:
//   Hubot Questionnaire Framework
//
// Dependencies:
//
// Configuration:
//   OAuth token
//
// Commands:
//
// Author:
//   Alterdesk

// Requirements
var Moment = require('moment');
const {TextMessage, LeaveMessage} = require('hubot');

// Listeners for the bot
var messengerBotListeners = {};

var textRegex = new RegExp(/\w+/, 'i');
var numberRegex = new RegExp(/\d+/, 'i');
var phoneRegex = new RegExp(/^\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d| 2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]| 4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/);
var emailRegex = new RegExp(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/, 'i');
var stopRegex;

// Response settings
var responseTimeoutText = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT_TEXT || "RESPONSE_TIMEOUT_TEXT";
var responseTimeoutMs = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT || 60000;
var catchAllCommands = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL || false;
var catchAllText = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_TEXT || "COMMAND_NOT_FOUND_TEXT";
var catchHelpCommand = process.env.HUBOT_QUESTIONNAIRE_CATCH_HELP || false;
var catchHelpText = process.env.HUBOT_QUESTIONNAIRE_CATCH_HELP_TEXT || "HELP_TEXT";
var removeListenerOnLeave = process.env.HUBOT_QUESTIONNAIRE_REMOVE_ON_LEAVE || false;
var acceptedCommands = [];

module.exports = {

    /*
    *   Override the default receiver
    */

    overrideReceiver: function(robot) {
      if(robot.defaultRobotReceiver != null) {
        // Already overridden
        return;
      }
      robot.defaultRobotReceiver = robot.receive;
        robot.receive = function(message) {
          if(message.user == null) {
            return robot.defaultRobotReceiver(message);
          }
//          console.log("MESSAGE:\n", message);
          var userId;
          // Alterdesk adapter uses separate user id field
          if(message.user.user_id != null) {
            userId = message.user.user_id;
          } else {
            userId = message.user.id;
          }
          var roomId = message.room;
          var isGroup = message.user.is_groupchat;
          var listenerId = roomId + userId;
          if(message instanceof TextMessage) {
//              console.log("receive: " + message);
              var messageString = message.toString().toLowerCase();
              var lst;
              if (messengerBotListeners[listenerId] != null) {
//                console.log("user: " + userId);
                lst = messengerBotListeners[listenerId];
                delete messengerBotListeners[listenerId];
                if (lst.call(message)) {
                  return;
                }
                // Put back to process next message
                messengerBotListeners[listenerId] = lst;
              }
              var isMentioned = false;
              if(isGroup && message.mentions != null) {
                for(var index in message.mentions) {
                  var mention = message.mentions[index];
                  if(robot.user.id === mention["id"]) {
                    isMentioned = true;
                    break;
                  }
                }
              }
              if(isGroup && !isMentioned) {
                // Ignoring message, not mentioned and no listeners for user in room
                console.log("Ignoring message, not mentioned and no listeners for user in room");
                return;
              }
              if(catchHelpCommand && (messageString === "help" || messageString === "[mention=" + robot.user.id + "] help")) {
//                console.log("Captured help");
                var response = new robot.Response(robot, message, true);
                response.send(catchHelpText);
                console.log("Help detected");
                return;
              }
              var unknownCommand = true;
              if(acceptedCommands != null) {
                for(var index in acceptedCommands) {
                  var command = acceptedCommands[index];
                  if(messageString === command || messageString === "[mention=" + robot.user.id + "] " + command) {
                    unknownCommand = false;
                    console.log("Command detected: " + command);
                    break;
                  }
                }
              }
              if(catchAllCommands && unknownCommand) {
                var response = new robot.Response(robot, message, true);
                response.send(catchAllText);
                return;
              }
          } else if(message instanceof LeaveMessage) {
              console.log("Leave detected");
              if(removeListenerOnLeave && messengerBotListeners[listenerId] != null) {
                delete messengerBotListeners[listenerId];
              }
          }
      //    console.log("Passing through original receive");
          return robot.defaultRobotReceiver(message);
        };
    },

    // Listeners for followup questions
    addListener: function(roomId, user, listener) {
      if(user.user_id != null) {
        messengerBotListeners[roomId + user.user_id] = listener;
      } else {
        messengerBotListeners[roomId + user.id] = listener;
      }
    },
    removeListener: function(roomId, user) {
      if(user.user_id != null) {
        delete messengerBotListeners[roomId + user.user_id];
      } else {
        delete messengerBotListeners[roomId + user.id];
      }
    },
//    hasListener: function(roomId, userId) {
//      return messengerBotListeners[roomId + userId] != null;
//    },
//    getListener: function(roomId, userId) {
//      return messengerBotListeners[roomId + userId];
//    },

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

    // Configuration to override default hubot help and commands that it does accept
    setCatchHelp: function(catchHelp) {
      catchHelpCommand = catchHelp;
    },
    setCatchHelpText: function(text) {
      catchHelpText = text;
    },
    addAcceptedCommands(commands) {
      for(var index in commands) {
        acceptedCommands.push(commands[index].toLowerCase());
      }
    },

    /*
    *   Classes
    */

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
            console.log("Response timeout: room: " + msg.message.room + " user: " + msg.message.user.id);
            if(msg.message.user.user_id != null) {
              delete messengerBotListeners[msg.message.room + msg.message.user.user_id];
            } else {
              delete messengerBotListeners[msg.message.room + msg.message.user.id];
            }
            if(responseTimeoutText != null) {
              msg.send(responseTimeoutText);
            }
        }, responseTimeoutMs);
      }

      call(message) {
        clearTimeout(this.timer);
        this.matches = this.matcher(message);
        console.log("Matches on call: " + this.matches);
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
    getNumberRegex: function() {
      return numberRegex;
    },
    getPhoneRegex: function() {
      return phoneRegex;
    },
    getEmailRegex: function() {
      return emailRegex;
    },

    /*
    *   Other helper functions
    */

    // Alterdesk adapter uses separate user id field(user.id in groups consists of (group_id + user_id)
    getUserId: function(user) {
      if(user.user_id != null) {
        return user.user_id;
      }
      return user.id;
    },

    // Only capitalize last word in the name: "de Boer"
    capitalizeLastName: function(string) {
      if(string == null || string == "") {
        return string;
      }
      var words = string.split(" ");
      var result = "";
      for(var index in words) {
        var word = words[index];
        var nextIndex = parseInt(index) + 1;
        if(nextIndex < words.length) {
          result +=  " " + word;
        } else {
          result += " " + this.capitalizeFirstLetter(word);
        }
      }
      return result;
    },

    capitalizeFirstLetter: function(string) {
      if(string == null || string == "") {
        return string;
      }
      return string.charAt(0).toUpperCase() + string.slice(1);
    },

    round: function(value, precision) {
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    },

    formatDate: function(date, customLocale, customFormat) {
        var format = customFormat || "LLLL";
        var locale = customLocale || "en-US";
        return Moment(date).locale(locale).format(format);
    }
}