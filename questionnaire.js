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
const {TextMessage, LeaveMessage} = require('hubot');

// Listeners for the bot
var messengerBotListeners = {};

var textRegex = new RegExp(/\w+/, 'i');
var numberRegex = new RegExp(/\d+/, 'i');
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
var acceptedCommands;

module.exports = {

    /*
    *   Override the default receiver
    */

    setRobotReceiver: function(robot) {
      robot.defaultRobotReceiver = robot.receive;   // TODO Make array of receivers to allow multiple scripts using Questionnaire
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
              var unknownCommand = true;
              if(acceptedCommands != null) {
                for(var index in acceptedCommands) {
                  if(message == acceptedCommands[index]) {
                    unknownCommand = false;
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

    // Configuration to override default hubot help and commands that it does accept
    setCatchHelp: function(catchHelp) {
      catchHelpCommand = catchHelp;
    },
    setCatchHelpText: function(text) {
      catchHelpText = text;
    },
    setAcceptedCommands(commands) {
      acceptedCommands = commands;
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
    }
}