// Description:
//   Hubot Questionnaire Framework
//
// Dependencies:
//   hubot
//
// Configuration:
//   OAuth token
//
// Commands:
//
// Author:
//   Alterdesk

// Requirements
const {Response, TextMessage, LeaveMessage} = require('hubot');

// Listeners for active questionnaires
var questionnaireListeners = {};

// Accepted commands
var acceptedCommands = [];
var acceptedRegex = [];

// Regular expressions
var textRegex = new RegExp(/\w+/, 'i');
var stopRegex = new RegExp(/stop/, 'i');
var helpRegex = new RegExp(/help/, 'i');
var robotMentionRegex;

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

            // Set the robot mention tag regex
            robotMentionRegex = new RegExp("\\[mention=" + robot.user.id + "\\]+", 'i');

            // Override receive function
            robot.receive = function(message) {

                if(message instanceof TextMessage) {
                    // Check for listeners waiting for a message
                    if (control.hasListener(message)) {
                        var listener = control.removeListener(message);
                        listener.call(message);
                        return;
                    }

                    var userId = control.getUserId(message.user);
                    var roomId = message.room;
                    var isGroup = control.isUserInGroup(message.user);
                    var messageString = message.toString().toLowerCase();

                    // Only listen for messages in groups when mentioned
                    if(isGroup && messageString.match(robotMentionRegex) == null) {
                        // Ignoring message, not mentioned and no listeners for user in room
                        console.log("Ignoring message, not mentioned and no listeners for user in room");
                        return;
                    }

                    // Check if the user has sent the help command
                    if(catchHelpCommand && messageString.match(helpRegex) != null) {
                        var response = new Response(robot, message, true);
                        response.send(catchHelpText);
                        console.log("Help detected");
                        return;
                    }

                    // Check if an accepted command was sent
                    var unknownCommand = true;
                    if(acceptedRegex != null) {
                        for(var index in acceptedRegex) {
                            var match = messageString.match(acceptedRegex[index]);
                            if(match != null) {
                                unknownCommand = false;
                                console.log("Command detected: " + match);
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
            var listener = questionnaireListeners[msg.room + userId];
            delete questionnaireListeners[msg.room + userId];
            return listener;
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

    // Add commands that the overridden receiver will accept
    addAcceptedCommands(commands) {
        for(var index in commands) {
            var command = commands[index].toLowerCase();
            acceptedCommands.push(command);
            acceptedRegex.push(new RegExp(command + "+", 'i'));
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
        constructor(msg, callback, answers, regex, timeoutMs, timeoutCallback) {
            this.call = this.call.bind(this);
            this.robot = msg.robot;
            this.callback = callback;
            this.answers = answers;
            this.regex = regex || textRegex;

            // Matcher for given regex
            this.matcher = (message) => {
                if (message.text != null) {
                    return message.text.match(this.regex);
                }
            };

            // Matcher for stop regex
            this.stopMatcher = (message) => {
                if (message.text != null && stopRegex != null) {
                    return message.text.match(stopRegex);
                }
            };

            // Timeout milliseconds and callback
            var useTimeoutMs = timeoutMs || responseTimeoutMs;
            if(timeoutCallback == null) {
                timeoutCallback = function() {
                    if(responseTimeoutText != null) {
                        msg.send(responseTimeoutText);
                    }
                };
            };

            // Set timer for timeout
            this.timer = setTimeout(function () {
                var userId;
                if(msg.message.user.user_id != null) {
                    userId = msg.message.user.user_id;
                } else {
                    userId = msg.message.user.id;
                }
                console.log("Response timeout from user " + userId + " in room " + msg.message.room);

                // Delete listener
                delete questionnaireListeners[msg.message.room + userId];

                // Call timeout callback
                timeoutCallback();
            }, useTimeoutMs);
        }

        call(message) {
            console.log("call: text: \"" + message.text + "\"");

            // Cancel timeout timer
            clearTimeout(this.timer);

            // Check if given regex matches
            this.matches = this.matcher(message);

            // Check if stop regex maches
            this.stop = this.stopMatcher(message);

            // Call callback
            this.callback(new Response(this.robot, message, true), this);
        }
    }

}