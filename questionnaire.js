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
const {Response, TextMessage, LeaveMessage} = require('hubot');

// Listeners for active questionnaires
var questionnaireListeners = {};

// Accepted commands
var acceptedCommands = [];

// Regular expressions
var textRegex = new RegExp(/\w+/, 'i');
var numberRegex = new RegExp(/\d+/, 'i');
var phoneRegex = new RegExp(/^\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d| 2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]| 4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/);
var emailRegex = new RegExp(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/, 'i');
var mentionedAllRegex = new RegExp(/\[mention=@all\]/, 'i');
var stopRegex = new RegExp(/stop/, 'i');
var helpRegex = new RegExp(/help/, 'i');

// Response timeout milliseconds
var responseTimeoutMs = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT || 60000;
// Response timeout text to send on timeout
var responseTimeoutText = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT_TEXT || "RESPONSE_TIMEOUT_TEXT";

// Catch commands that are not present in the accepted commands list
var catchAllCommands = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL || false;
// Catch all text to send on unaccepted command
var catchAllText = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_TEXT || "COMMAND_NOT_FOUND_TEXT";

// Override default hubot help command
var catchHelpCommand = process.env.HUBOT_QUESTIONNAIRE_CATCH_HELP || false;
// Help text to send when default hubot help command is overridden
var catchHelpText = process.env.HUBOT_QUESTIONNAIRE_CATCH_HELP_TEXT || "HELP_TEXT";

// Remove a questionnaire listener when a user leave is detected
var removeListenerOnLeave = process.env.HUBOT_QUESTIONNAIRE_REMOVE_ON_LEAVE || false;

module.exports = {


    Control: class {

        /*
        *   Override the default receiver
        */
        overrideReceiver(robot) {
            // Check if robot receiver is already overridden
            if(robot.defaultRobotReceiver != null) {
                console.error("Robot receiver already overridden!")
                return;
            }

            var control = this;

            // Store default robot receiver in separate variable
            robot.defaultRobotReceiver = robot.receive;

            // Override receive function
            robot.receive = function(message) {

                if(message instanceof TextMessage) {

                    // Check for listeners waiting for a message
                    if (control.hasListener(message)) {
                        var listener = control.getListener(message);
                        control.removeListener(message);
                        listener.call(message);
                        return;
                    }

                    var userId = control.getUserId(message.user);
                    var roomId = message.room;
                    var isGroup = control.isUserInGroup(message.user);
                    var messageString = message.toString().toLowerCase();

                    var isMentionedInGroup = false;
                    if(isGroup && message.mentions != null) {
                        for(var index in message.mentions) {
                            var mention = message.mentions[index];
                            if(robot.user.id === mention["id"]) {
                                isMentionedInGroup = true;
                                break;
                            }
                        }
                    }

                    // Only listen for messages in groups when mentioned
                    if(isGroup && !isMentionedInGroup) {
                        // Ignoring message, not mentioned and no listeners for user in room
                        console.log("Ignoring message, not mentioned and no listeners for user in room");
                        return;
                    }

                    // Check if the user has sent the help command
                    if(catchHelpCommand && messageString.match(helpRegex)) {
                        var response = new Response(robot, message, true);
                        response.send(catchHelpText);
                        console.log("Help detected");
                        return;
                    }

                    // Check if an accepted command was sent
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

                    // Stop if catch all is enabled and an unknown command was sent
                    if(catchAllCommands && unknownCommand) {
                        var response = new Response(robot, message, true);
                        response.send(catchAllText);
                        return;
                    }

                } else if(message instanceof LeaveMessage) {
                    console.log("Leave detected");
                    if(removeListenerOnLeave && control.hasListener(message)) {
                        control.removeListener(msg);
                    }
                }

                // Pass through default robot receiver
                return robot.defaultRobotReceiver(message);
            };
        };

        // Listeners for followup questions
        addListener(msg, listener) {
            var userId = this.getUserId(msg.user);
            console.log("Adding listener for user " + userId + " in room " + msg.room);
            questionnaireListeners[msg.room + userId] = listener;
        };

        removeListener(msg) {
            var userId = this.getUserId(msg.user);
            console.log("Removing listener for user " + userId + " in room " + msg.room);
            delete questionnaireListeners[msg.room + userId];
        };

        getListener(msg) {
          return questionnaireListeners[msg.room + this.getUserId(msg.user)];
        };

        hasListener(msg) {
          return questionnaireListeners[msg.room + this.getUserId(msg.user)] != null;
        };

        // Alterdesk adapter uses separate user id field(user.id in groups consists of (group_id + user_id)
        getUserId(user) {
          if(user.user_id != null) {
            return user.user_id;
          }
          return user.id;
        };

        isUserInGroup(user) {
            if(user.is_groupchat != null) {
                return user.is_groupchat;
            }
            return false;
        };
    },

    // Regex to check if user wants to stop the current process
    setStopRegex: function(s) {
      stopRegex = s;
    },

    // Regex to check if user wants help
    setHelpRegex: function(r) {
      helpRegex = r;
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
      constructor(rob, msg, call, ans, reg, overrideTimeoutMs, overrideTimeoutCallback) {
        this.call = this.call.bind(this);
        this.robot = rob;
        this.callback = call;
        this.answers = ans;
        this.regex = reg || textRegex;
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
        var useTimeoutMs = overrideTimeoutMs || responseTimeoutMs;
        this.timer = setTimeout(function () {
          console.log("Response timeout: room: " + msg.message.room + " user: " + msg.message.user.id);
          if(msg.message.user.user_id != null) {
            delete questionnaireListeners[msg.message.room + msg.message.user.user_id];
          } else {
            delete questionnaireListeners[msg.message.room + msg.message.user.id];
          }
          if(overrideTimeoutCallback != null) {
            overrideTimeoutCallback();
          } else if(responseTimeoutText != null) {
            msg.send(responseTimeoutText);
          }
        }, useTimeoutMs);
      }

      call(message) {
        clearTimeout(this.timer);
        this.matches = this.matcher(message);
        console.log("Matches on call: " + this.matches);
        this.stop = this.stopMatcher(message);
        this.callback(new Response(this.robot, message, true), this);
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
    getMentionedAllRegex: function() {
      return mentionedAllRegex;
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
    },

    formatDate: function(date, customLocale, customFormat) {
        var format = customFormat || "LLLL";
        var locale = customLocale || "en-US";
        return Moment(date).locale(locale).format(format);
    }
}