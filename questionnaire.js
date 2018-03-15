// Description:
//   Hubot Questionnaire Framework
//
// Dependencies:
//   hubot
//
// Author:
//   Alterdesk

// Requirements
var Extra = require('node-messenger-extra');
const {Response, TextMessage, LeaveMessage} = require('hubot');

// Data container of answers that the user has given
class Answers {
    constructor() {
        this.data = {};
    }

    add(key, value) {
        this.data[key] = value;
    }

    get(key) {
        return this.data[key];
    }
}

// Listener class for consecutive questions
class Listener {
    constructor(msg, callback, answers, regex, timeoutMs, timeoutCallback) {
        this.call = this.call.bind(this);
        this.msg = msg;
        this.callback = callback;
        this.answers = answers;
        this.regex = regex || Extra.getTextRegex();
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
    configure(control, question) {
        this.control = control;
        this.question = question;
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
                if(question != null && question.timeoutText != null) {
                    msg.send(question.timeoutText);
                } else if(control.responseTimeoutText != null) {
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
};

// Class to control the questionnaires with
class Control {
    constructor() {
        // Listeners for active questionnaires
        this.questionnaireListeners = {};

        // Accepted commands
        this.acceptedCommands = [];
        this.acceptedRegex = [];
        this.acceptedHelpTexts = {};

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

        // Override receive function
        robot.receive = function(message) {

            if(control.robotMentionRegex == null && robot.user != null) {
                // Set the robot mention tag regex
                control.robotMentionRegex = new RegExp("\\[mention=" + robot.user.id + "\\]+", 'i');
            }

            var className;
            if(message.constructor != null) {
                className = message.constructor.name;
                console.log("Received " + className);
            } else {
                className = null;
                console.error("Unable to retrieve classname for: ", message);
            }

            if(className === "TextMessage" || message instanceof TextMessage) {
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

                var isMentioned;
                if(control.robotMentionRegex != null) {
                    isMentioned = messageString.match(control.robotMentionRegex) != null;
                } else {
                    isMentioned = false;
                }

                // Only listen for messages in groups when mentioned
                if(isGroup && !isMentioned) {
                    // Ignoring message, not mentioned and no listeners for user in room
                    console.log("Ignoring message, not mentioned and no listeners for user in room");
                    return;
                }

                // Check if the user has sent the help command
                if(control.catchHelpCommand && messageString.match(control.helpRegex) != null) {
                    console.log("Help detected");
                    var response = new Response(robot, message, true);
                    var helpText = control.catchHelpText;
                    for(var field in control.acceptedHelpTexts) {
                        helpText += "\n • \'" + field + "\' - " + control.acceptedHelpTexts[field];
                    }
                    response.send(helpText);
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
                    console.log("Catched unknown command");
                    var response = new Response(robot, message, true);
                    response.send(control.catchAllText);
                    return;
                }

            } else if(className === "LeaveMessage" || message instanceof LeaveMessage) {
                console.log("Leave detected");
                if(control.removeListenerOnLeave && control.hasListener(message)) {
                    control.removeListener(msg);
                }
            }

            // Pass through default robot receiver
            console.log("Passing through to default receiver");
            return robot.defaultRobotReceiver(message);
        };
    }

    // Add a listeners for followup questions
    addListener(message, listener, question) {
        listener.configure(this, question);
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

    // Should a listener for a user be removed when a leave is detected
    setRemoveListenerOnLeave(remove) {
        this.removeListenerOnLeave = remove;
    }

    // Add commands that the overridden receiver will accept
    addAcceptedCommands(commands) {
        for(var index in commands) {
            this.addAcceptedCommand(commands[index]);
        }
    }

    // Add a command that the overridden receiver will accept
    addAcceptedCommand(command, helpText) {
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
        if(helpText != null) {
            this.acceptedHelpTexts[command] = helpText;
        }
    }
}

class Flow {
    constructor(control, stopText, errorText) {
        this.control = control;
        this.stopText = stopText;
        this.errorText = errorText;
        this.timeoutText = control.responseTimeoutText;
    }

    setStartQuestion(question) {
        question.setFlow(this);
        this.startQuestion = question;
    }

    setFinishedCallback(finishedCallback) {
        this.finishedCallback = finishedCallback;
    }

    setTimeoutText(timeoutText) {
        this.timeoutText = timeoutText;
    }

    start(msg, answers) {
        console.log("Flow started");
        if(this.startQuestion == null) {
            console.error("Start question is null on start");
            msg.send(this.errorText);
            return;
        }
        this.triggerQuestion(this.startQuestion, msg, answers);
    }

    triggerQuestion(question, msg, answers) {
        console.log("Triggering flow question: " + question.questionText);
        msg.send(question.questionText);
        this.control.addListener(msg.message, new Listener(msg, this.callback, answers, question.regex), question);
    }

    callback(response, listener) {
        var question = listener.question;
        var flow = question.flow;

        // Check if the stop regex was triggered
        if(listener.stop) {
            response.send(flow.stopText);
            return;
        }

        var answers = listener.answers;

        // Let the Question check and parse the message
        var answerValue = question.checkAndParseAnswer(listener.matches, response.message.text);
        if(answerValue == null) {
            response.send(question.invalidText + " " + question.questionText);
            return flow.control.addListener(response.message, new Listener(response, this.callback, answers, question.regex), question);
        }

        // Valid answer, store in the answers object
        answers.add(question.answerKey, answerValue);

        // Trigger followup question if present, otherwise finish the flow
        if(question.followupQuestion != null) {
            flow.triggerQuestion(question.followupQuestion, response, answers);
        } else {
            flow.finish(response, answers);
        }
    }

    finish(response, answers) {
        console.log("Flow finished");
        if(this.finishedCallback != null) {
            this.finishedCallback(response, answers);
        }
    }
};

class Question {
    constructor(answerKey, questionText, invalidText) {
        this.answerKey = answerKey;
        this.questionText = questionText;
        this.invalidText = invalidText;
    }

    setFlow(flow) {
        this.flow = flow;
    }

    setFollowupQuestion(question) {
        question.setFlow(this.flow);
        this.followupQuestion = question;
    }

    checkAndParseAnswer(matches, text) {
        return null;
    }
};

class TextQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
    }

    checkAndParseAnswer(matches, text) {
        if(matches == null) {
            return null;
        }
        return text;
    }
};

class NumberQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getNumberRegex();
    }

    setRange(min, max) {
        this.min = min;
        this.max = max;
    }

    checkAndParseAnswer(matches, text) {
        if(matches == null || text == null) {
            return null;
        }
        var value = parseFloat(text);
        if(this.inRange(value)) {
            return value;
        }
        return null;
    }

    inRange(value) {
        if(this.min != null && this.max != null) {
            return value >= this.min && value <= this.max;
        } else if(this.min != null) {
            return value >= this.min;
        } else if(this.max != null) {
            return value <= this.max;
        }
        return true;
    }
};

class PolarQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
    }

    setPositive(text, followupQuestion) {
        this.positiveRegex = new RegExp(text + "+", 'i');
        if(followupQuestion != null) {
            followupQuestion.setFlow(this.flow);
            this.positiveFollowupQuestion = followupQuestion;
        }
    }

    setNegative(text, followupQuestion) {
        this.negativeRegex = new RegExp(text + "+", 'i');
        if(followupQuestion != null) {
            followupQuestion.setFlow(this.flow);
            this.negativeFollowupQuestion = followupQuestion;
        }
    }

    checkAndParseAnswer(matches, text) {
        if(matches == null || text == null) {
            return null;
        }else if(text.match(this.positiveRegex)) {
            this.setFollowupQuestion(this.positiveFollowupQuestion);
            return true;
        } else if(text.match(this.negativeRegex)) {
            this.setFollowupQuestion(this.negativeFollowupQuestion);
            return false;
        }
        return null;
    }
};

class EmailQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getEmailRegex();
    }

    checkAndParseAnswer(matches, text) { // TODO Only return email address
        return text;    // TODO Add possibility to limit to a domain(".com")
    }
};

class PhoneNumberQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getPhoneRegex();
    }

    checkAndParseAnswer(matches, text) {    // TODO Add possibility to limit to net number("+31")
        return text;    // TODO Only return phone number
    }
};

class MentionQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getMentionedRegex();
    }

    checkAndParseAnswer(matches, text) {
        if(matches == null || text == null) {
            return null;
        }
        var value = [];
        if(text.match(Extra.getMentionedAllRegex()) != null) {
            value.push("@all");
        } else {
            var mentionedUserRegex = Extra.getMentionedUserRegex();
            var uuidRegex = Extra.getUuidRegex();
            var result;
            while((result = mentionedUserRegex.exec(text)) !== null) {
                var uuid = result[0].match(uuidRegex);
                if(uuid != null) {
                    value.push(uuid[0]);
                }
            }
        }
        if(value.length != 0) {
            return value;
        }
        return null;
    }
};

// TODO AcceptQuestion(accept/reject, two outputs, multiuser)

module.exports = {

    Answers : Answers,
    Listener : Listener,
    Control : Control,
    Flow : Flow,
    TextQuestion : TextQuestion,
    NumberQuestion : NumberQuestion,
    PolarQuestion : PolarQuestion,
    EmailQuestion : EmailQuestion,
    PhoneNumberQuestion : PhoneNumberQuestion,
    MentionQuestion : MentionQuestion

}