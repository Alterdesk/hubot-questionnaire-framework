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

// Default listener regex
var textRegex = new RegExp(/\w+/, 'i');

module.exports = {

    // Class to control the questionnaires with
    Control: class {
        constructor() {
            // Listeners for active questionnaires
            this.questionnaireListeners = {};

            // Accepted commands
            this.acceptedCommands = [];
            this.acceptedRegex = [];

            // Regular expressions
            this.stopRegex = new RegExp(/stop/, 'i');
            this.helpRegex = new RegExp(/help/, 'i');
            this.robotMentionRegex;

            // Response timeout milliseconds
            this.responseTimeoutMs = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT || 60000;
            // Response timeout text to send on timeout
            this.responseTimeoutText = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT_TEXT || "RESPONSE_TIMEOUT_TEXT";

            // Catch commands that are not present in the accepted commands list
            this.catchAllCommands = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL || false;
            // Catch all text to send on unaccepted command
            this.catchAllText = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_TEXT || "COMMAND_NOT_FOUND_TEXT";

            // Override default hubot help command
            this.catchHelpCommand = process.env.HUBOT_QUESTIONNAIRE_CATCH_HELP || false;
            // Help text to send when default hubot help command is overridden
            this.catchHelpText = process.env.HUBOT_QUESTIONNAIRE_CATCH_HELP_TEXT || "HELP_TEXT";

            // Remove a questionnaire listener when a user leave is detected
            this.removeListenerOnLeave = process.env.HUBOT_QUESTIONNAIRE_REMOVE_ON_LEAVE || false;
        }

        // Override the default receiver
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
            this.robotMentionRegex = new RegExp("\\[mention=" + robot.user.id + "\\]+", 'i');

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
                    if(isGroup && messageString.match(control.robotMentionRegex) == null) {
                        // Ignoring message, not mentioned and no listeners for user in room
                        console.log("Ignoring message, not mentioned and no listeners for user in room");
                        return;
                    }

                    // Check if the user has sent the help command
                    if(control.catchHelpCommand && messageString.match(control.helpRegex) != null) {
                        var response = new Response(robot, message, true);
                        response.send(control.catchHelpText);
                        console.log("Help detected");
                        return;
                    }

                    // Check if an accepted command was sent
                    var unknownCommand = true;
                    for(var index in control.acceptedRegex) {
                        var match = messageString.match(control.acceptedRegex[index]);
                        if(match != null) {
                            unknownCommand = false;
                            console.log("Command detected: " + match);
                            break;
                        }
                    }

                    // Stop if catch all is enabled and an unknown command was sent
                    if(control.catchAllCommands && unknownCommand) {
                        var response = new Response(robot, message, true);
                        response.send(control.catchAllText);
                        return;
                    }

                } else if(message instanceof LeaveMessage) {
                    console.log("Leave detected");
                    if(control.removeListenerOnLeave && control.hasListener(message)) {
                        control.removeListener(msg);
                    }
                }

                // Pass through default robot receiver
                return robot.defaultRobotReceiver(message);
            };
        }

        // Add a listeners for followup questions
        addListener(message, listener) {
            listener.configure(this);
            var userId = this.getUserId(message.user);
            console.log("Adding listener for user " + userId + " in room " + message.room);
            this.questionnaireListeners[message.room + userId] = listener;
        }

        // Remove a listener that was added before
        removeListener(message) {
            var userId = this.getUserId(message.user);
            console.log("Removing listener for user " + userId + " in room " + message.room);
            var listener = this.questionnaireListeners[message.room + userId];
            delete this.questionnaireListeners[message.room + userId];
            return listener;
        }

        // Check if a listener is present for a user in a room
        hasListener(message) {
            return this.questionnaireListeners[message.room + this.getUserId(message.user)] != null;
        }

        // Alterdesk adapter uses separate user id field(user.id in groups consists of (group_id + user_id)
        getUserId(user) {
            if(user.user_id != null) {
                return user.user_id;
            }
            return user.id;
        }

        // Alterdesk adapter uses user.is_groupchat variable to pass group chat id when message was sent in group
        isUserInGroup(user) {
            if(user.is_groupchat != null) {
                return user.is_groupchat;
            }
            return false;
        }

        // Regex to check if user wants to stop the current process
        setStopRegex(s) {
            this.stopRegex = s;
        }

        // Regex to check if user wants help
        setHelpRegex(r) {
            this.helpRegex = r;
        }

        // Response timeout configuration
        setResponseTimeoutText(t) {
            this.responseTimeoutText = t;
        }
        setResponseTimeoutMs(ms) {
            this.responseTimeoutMs = ms;
        }

        // Catch all given commands and send default message when command is unknown
        setCatchAll(catchAll) {
            this.catchAllCommands = catchAll;
        }
        setCatchAllText(text) {
            this.catchAllText = text;
        }

        // Configuration to override default hubot help and commands that it does accept
        setCatchHelp(catchHelp) {
            this.catchHelpCommand = catchHelp;
        }
        setCatchHelpText(text) {
            this.catchHelpText = text;
        }

        // Add commands that the overridden receiver will accept
        addAcceptedCommands(commands) {
            for(var index in commands) {
                this.addAcceptedCommand(commands[index]);
            }
        }

        // Add a command that the overridden receiver will accept
        addAcceptedCommand(command) {
            var c = command.toLowerCase();
            var configured = false;
            for(var index in this.acceptedCommands) {
                if(c === this.acceptedCommands[index]) {
                    configured = true;
                    break;
                }
            }
            if(configured) {
                console.error("Command already configured as accepted: " + c);
                return;
            }
            console.log("Command configured as accepted: " + c);
            this.acceptedCommands.push(c);
            this.acceptedRegex.push(new RegExp(c + "+", 'i'));
        }
    },

    // Data container of answers that the user has given
    Answers: class {
    },

    // Listener class for consecutive questions
    Listener: class {
        constructor(msg, callback, answers, regex, timeoutMs, timeoutCallback) {
            this.call = this.call.bind(this);
            this.msg = msg;
            this.callback = callback;
            this.answers = answers;
            this.regex = regex || textRegex;
            this.timeoutMs = timeoutMs;
            this.timeoutCallback = timeoutCallback;

            // Matcher for given regex
            this.matcher = (message) => {
                if (message.text != null) {
                    return message.text.match(this.regex);
                }
            };
        }

        // Configure the listener for the given control instance
        configure(control) {
            // Matcher for stop regex
            this.stopMatcher = (responseMessage) => {
                if (responseMessage.text != null && control.stopRegex != null) {
                    return responseMessage.text.match(control.stopRegex);
                }
            };

            var msg = this.msg;

            // Timeout milliseconds and callback
            var useTimeoutMs = this.timeoutMs || control.responseTimeoutMs;
            var useTimeoutCallback = this.timeoutCallback;
            if(useTimeoutCallback == null) {
                useTimeoutCallback = function() {
                    if(control.responseTimeoutText != null) {
                        msg.send(control.responseTimeoutText);
                    }
                };
            };

            var message = this.msg.message;

            // Set timer for timeout
            this.timer = setTimeout(function () {
                console.log("Response timeout from user " + control.getUserId(message.user) + " in room " + message.room);

                // Delete listener
                control.removeListener(message);

                // Call timeout callback
                useTimeoutCallback();
            }, useTimeoutMs);
        }

        // Called when a message was received for the listener
        call(responseMessage) {
            console.log("call: text: \"" + responseMessage.text + "\"");

            // Cancel timeout timer
            clearTimeout(this.timer);

            // Check if given regex matches
            this.matches = this.matcher(responseMessage);

            // Check if stop regex maches
            this.stop = this.stopMatcher(responseMessage);

            // Call callback
            this.callback(new Response(this.msg.robot, responseMessage, true), this);
        }
    }

}