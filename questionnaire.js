// Description:
//   Hubot Questionnaire Framework
//
// Dependencies:
//   hubot
//   node-messenger-extra
//
// Author:
//   Alterdesk

// Requirements
var Extra = require('node-messenger-extra');
const {Response, User, Message, TextMessage, LeaveMessage} = require('hubot');

// Data container of answers that the user has given
class Answers {
    constructor() {
        this.data = {};
    }

    // Add a value by key
    add(key, value) {
        this.data[key] = value;
    }

    // Get a value by key
    get(key) {
        return this.data[key];
    }

    keys() {
        return Object.keys(this.data);
    }

    size() {
        return this.keys().length;
    }
}

// Listener class for consecutive questions
class Listener {    // TODO Replace regex and timeout parameters with question and remove function setQuestion()
    constructor(msg, callback, answers, regex, timeoutMs, timeoutText, timeoutCallback) {
        this.call = this.call.bind(this);
        this.msg = msg;
        this.callback = callback;
        this.answers = answers;
        this.regex = regex || Extra.getTextRegex();
        this.timeoutMs = timeoutMs;
        this.timeoutText = timeoutText;
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
        this.control = control;
        // Matcher for stop regex
        this.stopMatcher = (responseMessage) => {
            if (responseMessage.text != null && control.stopRegex != null) {
                return responseMessage.text.match(control.stopRegex);
            }
        };

        var msg = this.msg;

        // Timeout milliseconds and callback
        var useTimeoutMs = this.timeoutMs || control.responseTimeoutMs;
        var useTimeoutText = this.timeoutText || control.responseTimeoutText;
        var useTimeoutCallback = this.timeoutCallback;
        if(useTimeoutCallback == null) {
            useTimeoutCallback = function() {
                if(useTimeoutText != null) {
                    msg.send(useTimeoutText);
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

    // Set the corresponding question
    setQuestion(question) {
        this.question = question;
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

        // Store robot instance
        control.robot = robot;

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
        listener.configure(this);
        listener.setQuestion(question);
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

// Class for a flow of questions
class Flow {
    constructor(control, stopText, errorText) {
        this.control = control;
        this.stopText = stopText;
        this.errorText = errorText;
        this.currentStep = 0;
        this.steps = [];
    }

    // Add a question to the flow
    add(question) {
        question.setFlow(this);
        this.steps.push(question);
        this.lastAddedQuestion = question;
        return this;
    }

    // Add new TextQuestion
    text(answerKey, questionText, invalidText) {
        return this.add(new TextQuestion(answerKey, questionText, invalidText));
    }

    length(minLength, maxLength) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to add accepted length to on length()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof TextQuestion)) {
            console.error("Last added Question is not an instance of TextQuestion on length()");
            return this;
        }
        this.lastAddedQuestion.setLength(minLength, maxLength);
        return this;
    }

    // Add new NumberQuestion
    number(answerKey, questionText, invalidText, minValue, maxValue) {
        var numberQuestion = new NumberQuestion(answerKey, questionText, invalidText);
        if(minValue !== null || maxValue !== null) {
            numberQuestion.setRange(minValue, maxValue);
        }
        return this.add(numberQuestion);
    }

    range(minValue, maxValue) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to add number range to on range()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof NumberQuestion)) {
            console.error("Last added Question is not an instance of NumberQuestion on range()");
            return this;
        }
        this.lastAddedQuestion.setRange(minValue, maxValue);
        return this;
    }

    // Add new EmailQuestion
    email(answerKey, questionText, invalidText, allowedDomains) {
        var emailQuestion = new EmailQuestion(answerKey, questionText, invalidText);
        if(allowedDomains != null) {
            for(var index in allowedDomains) {
                emailQuestion.addAllowedDomain(allowedDomains[index]);
            }
        }
        return this.add(emailQuestion);
    }

    domains(allowedDomains) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to add accepted domains to on domains()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof EmailQuestion)) {
            console.error("Last added Question is not an instance of EmailQuestion on domains()");
            return this;
        }
        if(allowedDomains != null) {
            this.lastAddedQuestion.addAllowedDomains(allowedDomains);
        }
        return this;
    }

    // Add new PhoneNumberQuestion
    phone(answerKey, questionText, invalidText, allowedCountryCodes) {
        var phoneNumberQuestion = new PhoneNumberQuestion(answerKey, questionText, invalidText);
        if(allowedCountryCodes != null) {
            for(var index in allowedCountryCodes) {
                phoneNumberQuestion.addAllowedCountryCode(allowedCountryCodes[index]);
            }
        }
        return this.add(phoneNumberQuestion);
    }

    countryCodes(allowedCountryCodes) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to add accepted country codes to on countryCodes()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PhoneNumberQuestion)) {
            console.error("Last added Question is not an instance of PhoneNumberQuestion on countryCodes()");
            return this;
        }
        if(allowedCountryCodes != null) {
            this.lastAddedQuestion.addAllowedCountryCodes(allowedCountryCodes);
        }
        return this;
    }

    // Add new MentionQuestion
    mention(answerKey, questionText, invalidText) {
        var mentionQuestion = new MentionQuestion(answerKey, questionText, invalidText);
        return this.add(mentionQuestion);
    }

    robotAllowed(allowed) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to set robot mention allowed to on robotAllowed()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MentionQuestion)) {
            console.error("Last added Question is not an instance of MentionQuestion on robotAllowed()");
            return this;
        }
        this.lastAddedQuestion.setRobotAllowed(allowed);
        return this;
    }

    // Add new PolarQuestion
    polar(answerKey, questionText, invalidText, positiveRegex, negativeRegex, positiveFlow, negativeFlow) {
        var polarQuestion = new PolarQuestion(answerKey, questionText, invalidText);
        if(positiveRegex !== null) {
            polarQuestion.setPositive(positiveRegex, positiveFlow);
        }
        if(negativeRegex !== null) {
            polarQuestion.setNegative(negativeRegex, negativeFlow);
        }
        return this.add(polarQuestion);
    }

    positive(regex, subFlow) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to add positive regex to on positive()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            console.error("Last added Question is not an instance of PolarQuestion on positive()");
            return this;
        }
        this.lastAddedQuestion.setPositive(regex, subFlow);
        return this;
    }

    negative(regex, subFlow) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to add negative regex to on negative()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            console.error("Last added Question is not an instance of PolarQuestion on negative()");
            return this;
        }
        this.lastAddedQuestion.setNegative(regex, subFlow);
        return this;
    }

    multiple(answerKey, questionText, invalidText) {
        var multipleChoiceQuestion = new MultipleChoiceQuestion(answerKey, questionText, invalidText);
        return this.add(multipleChoiceQuestion);
    }

    option(regex, subFlow) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to add multiple choice option to on option()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MultipleChoiceQuestion)) {
            console.error("Last added Question is not an instance of MultipleChoiceQuestion on option()");
            return this;
        }
        this.lastAddedQuestion.addOption(regex, subFlow);
        return this;
    }

    askMentions(mentionAnswerKey) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to change to multi user question to on askMentions()");
            return this;
        }
        this.lastAddedQuestion.setMentionAnswerKey(mentionAnswerKey);
        return this;
    }

    includeMentions(mentions) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to change to multi user question to on includeMentions()");
            return this;
        }
        this.lastAddedQuestion.setIncludeMentions(mentions);
        return this;
    }

    askUserIds(userIds) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to change to multi user question to on askUserIds()");
            return this;
        }
        this.lastAddedQuestion.setUserIds(userIds);
        return this;
    }

    // Summarize the given answers after last added question
    summary(summaryFunction) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to add summary function to on summary()");
            return this;
        }
        this.lastAddedQuestion.setSummaryFunction(summaryFunction);
        return this;
    }

    // Use non-default timeout for last added question
    timeout(ms, text, callback) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow to set override timeout settings to on timeout()");
            return this;
        }
        this.lastAddedQuestion.setTimeout(ms, text, callback);
        return this;
    }

    // Set the flow finished callback function
    finish(finishedCallback) {
        this.finishedCallback = finishedCallback;
        return this;
    }

    // Start the flow
    start(msg, answers) {
        console.log("Flow started");
        if(this.steps.length === 0) {
            console.error("No steps for flow on start");
            if(this.errorText != null) {
                msg.send(this.errorText);
            }
            return;
        }
        this.answers = answers || new Answers();
        this.next(msg);
    }

    // Callback function that is used with Listeners
    callback(response, listener) {
        var question = listener.question;
        var flow = question.flow;

        // Check if the stop regex was triggered
        if(listener.stop) {
            if(flow.stopText != null) {
                response.send(flow.stopText);
            }
            return;
        }

        // Let the Question check and parse the message
        var answerValue = question.checkAndParseAnswer(listener.matches, response.message);
        if(answerValue == null) {
            response.send(question.invalidText + " " + question.questionText);
            return flow.control.addListener(response.message, new Listener(response, this.callback, this.answers, question.regex), question);
        }

        // Is the question asked to multiple users and not all users answered yet
        if(question.isMultiUser) {
            var multiAnswers = this.answers.get(question.answerKey);
            if(!multiAnswers) {
                multiAnswers = new Answers();
                this.answers.add(question.answerKey, multiAnswers);
            }
            var userId = flow.control.getUserId(response.message.user);
            multiAnswers.add(userId, answerValue);
            // Check if still waiting for more answers
            if(question.userIds.length > multiAnswers.size()) {
                return;
            }
        } else {
            // Valid answer, store in the answers object
            this.answers.add(question.answerKey, answerValue);
        }

        // Call summary function if set
        if(question.summaryFunction != null) {
            response.send(question.summaryFunction(this.answers));
        }

        // Trigger sub flow if set in question, otherwise continue
        if(question.subFlow != null) {
            var subFlow = question.subFlow;
            // Set stop text when null
            if(subFlow.stopText == null) {
                subFlow.stopText = flow.stopText;
            }
            // Set error text when null
            if(subFlow.errorText == null) {
                subFlow.errorText = flow.errorText;
            }
            // Continue current flow when sub flow finishes
            subFlow.finish(function(response, answers) {
                flow.next(response);
            });
            // Start the sub flow
            subFlow.start(response, this.answers);
        } else {
            flow.next(response);
        }
    }

    // Execute next question
    next(response) {
        if(this.currentStep < this.steps.length) {
            var question = this.steps[this.currentStep++];
            console.log("Flow nex question: " + question.questionText);
            question.execute(this.control, response, this.callback, this.answers);
        } else {
            console.log("Flow finished");
            if(this.finishedCallback != null) {
                this.finishedCallback(response, this.answers);
            }
        }
    }
};

// Class for defining questions
class Question {
    constructor(answerKey, questionText, invalidText) {
        this.answerKey = answerKey || "ANSWER_KEY";
        this.questionText = questionText || "QUESTION_TEXT";
        this.invalidText = invalidText || "INVALID_TEXT";
        this.isMultiUser = false;
    }

    // Set the parent flow
    setFlow(flow) {
        this.flow = flow;
    }

    // Set the sub flow to execute after this question
    setSubFlow(subFlow) {
        this.subFlow = subFlow;
    }

    setSummaryFunction(summaryFunction) {
        this.summaryFunction = summaryFunction;
    }

    // Use non-default timeout settings for this question
    setTimeout(ms, text, callback) {
        this.timeoutMs = ms;
        this.timeoutText = text;
        this.timeoutCallback = callback;
    }

    setMentionAnswerKey(mentionAnswerKey) {
        this.mentionAnswerKey = mentionAnswerKey;
        this.isMultiUser = true;
    }

    setIncludeMentions(mentions) {
        this.includeMentions = mentions;
        this.isMultiUser = true;
    }

    setUserIds(userIds) {
        this.userIds = userIds;
        this.isMultiUser = true;
    }

    execute(control, response, callback, answers) {
        response.send(this.questionText);
        if(this.isMultiUser) {
            if(!this.userIds && this.mentionAnswerKey) {
                var mentions = answers.get(this.mentionAnswerKey);
                if(mentions) {
                    this.userIds = [];
                    for(var index in mentions) {
                        var mention = mentions[index];
                        var userId = mention["id"];
                        if(userId.toUpperCase() === "@ALL") {
                            console.log("Skipping @All tag on execute()");
                            continue;
                        }
                        if(userId) {
                            this.userIds.push(userId);
                        }
                    }
                }
            }

            if(this.userIds && this.includeMentions !== null) {
                for(var index in this.includeMentions) {
                    var mention = this.includeMentions[index];
                    var userId = mention["id"];
                    if(!userId) {
                        continue;
                    }
                    var add = true;
                    for(var i in this.userIds) {
                        if(userId == this.userIds[i]) {
                            add = false;
                            break;
                        }
                    }
                    if(add) {
                        this.userIds.push(userId);
                    }
                }
            }

            if(this.userIds && this.userIds.length > 0) {
                var question = this;
                question.timedOut = false;
                question.multiUserMessages = [];

                for(var index in this.userIds) {
                    var userId = this.userIds[index];
                    var user = new User(userId);
                    var userMessage = new Message(user);
                    userMessage.room = response.message.room;

                    question.multiUserMessages.push(userMessage);

                    control.addListener(userMessage, new Listener(response, callback, answers, this.regex, this.timeoutMs, null, function() {
                        if(question.timedOut) {
                            return;
                        }
                        question.timedOut = true;
                        for(var index in question.multiUserMessages) {
                            control.removeListener(question.multiUserMessages[index]);
                        }
                        if(question.timeoutCallback) {
                            question.timeoutCallback();
                        } else {
                            var timeoutText = question.timeoutText || control.responseTimeoutText;
                            response.send(timeoutText);
                        }
                    }), this);
                }
                return;
            }
            console.error("Empty userId list for multi-user question");
            response.send(this.flow.errorText);
            return;
        }
        control.addListener(response.message, new Listener(response, callback, answers, this.regex, this.timeoutMs, this.timeoutText, this.timeoutCallback), this);
    }

    // Answer given by the user is parsed and checked here
    checkAndParseAnswer(matches, message) {
        return null;
    }
};

// Text Question, accepts non empty text
class TextQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
    }

    setLength(min, max) {
        this.min = min;
        this.max = max;
    }

    checkAndParseAnswer(matches, message) {
        if(matches == null) {
            return null;
        }
        if(this.acceptedLength(message.text)) {
            return message.text;
        }
        return null;
    }

    acceptedLength(text) {
        if(this.min != null && this.max != null) {
            return text.length >= this.min && text.length <= this.max;
        } else if(this.min != null) {
            return text.length >= this.min;
        } else if(this.max != null) {
            return text.length <= this.max;
        }
        return true;
    }
};

// Number Question, accepts numbers, can limit to accepted range
class NumberQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getNumberRegex();
    }

    // Limit the valid answer to range
    setRange(min, max) {
        this.min = min;
        this.max = max;
    }

    // Parse given number as float and only accept if in range
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        var value = parseFloat(message.text);
        if(this.inRange(value)) {
            return value;
        }
        return null;
    }

    // Check if the value is in range
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

// Email Question, accepts email addresses, able to limit to domains
class EmailQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getEmailRegex();
        this.allowedDomains = [];
    }

    // Check for valid email and if domain is allowed
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        var email = matches[0];
        if(this.allowedDomains.length === 0) {
            return email;
        }
        for(var index in this.allowedDomains) {
            if(email.endsWith(this.allowedDomains[index])) {
                return email;
            }
        }
        return null;
    }

    // Add a domain to limit accepted answers to
    addAllowedDomain(domain) {
        for(var index in this.allowedDomains) {
            if(domain === this.allowedDomains[index]) {
                console.error("Domain already configured as allowed for EmailQuestion: " + domain);
                return;
            }
        }
        this.allowedDomains.push(domain);
    }

    addAllowedDomains(domains) {
        for(var index in domains) {
            this.addAllowedDomain(domains[index]);
        }
    }
};

// Phone Number Question, accepts phone numbers, able to limit to country codes
class PhoneNumberQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getPhoneRegex();
        this.allowedCountryCodes = [];
    }

    // Check if valid phone number and if country code is allowed
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        var phone = matches[0];
        if(this.allowedCountryCodes.length === 0) {
            return phone;
        }
        for(var index in this.allowedCountryCodes) {
            if(phone.startsWith(this.allowedCountryCodes[index])) {
                return phone;
            }
        }
        return null;
    }

    // Add a country code to limit accepted answers to
    addAllowedCountryCode(code) {
        for(var index in this.allowedCountryCodes) {
            if(code === this.allowedCountryCodes[index]) {
                console.error("Country code already configured as allowed for PhoneNumberQuestion: " + code);
                return;
            }
        }
        this.allowedCountryCodes.push(code);
    }

    addAllowedCountryCodes(codes) {
        for(var index in codes) {
            this.addAllowedCountryCode(codes[index]);
        }
    }
};

// Mention Question, accepts mentioned all and mentioned user tags
class MentionQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getMentionedRegex();
        this.robotAllowed = false;
    }

    // Change if it is allowed to mention robot
    setRobotAllowed(allowed) {
        this.robotAllowed = allowed;
    }

    // Parse mentioned users or mentioned all tags
    checkAndParseAnswer(matches, message) {
        if(matches === null || message.text === null) {
            return null;
        }
        var value = [];
        if(message.text.match(Extra.getMentionedAllRegex()) !== null) {
            var mention = {};
            mention["id"] = "@all";
            value.push(mention);
            return value;
        }

        var mentions;

        console.log("Mentions parsed by gateway: " + (message.mentions !== null));
        if(message.mentions !== null) {
            // Parsed by gateway
            mentions = message.mentions;
        } else {
            // Not parsed yet
            mentions = [];
            var mentionedUserRegex = Extra.getMentionedUserRegex();
            var uuidRegex = Extra.getUuidRegex();
            var mentionResult;
            while((mentionResult = mentionedUserRegex.exec(message.text)) !== null) {
                var userResult = mentionResult[0].match(uuidRegex);
                if(userResult == null) {
                    continue;
                }
                var mention = {};
                mention["id"] = userResult[0];
                mentions.push(mention);
            }
        }

        // Retrieve robot id if available
        var robotId = null;
        if(this.flow.control.robot.user != null) {
            robotId = this.flow.control.robot.user.id;
        }

        for(var index in mentions) {
            var mention = mentions[index];
            var userId = mention["id"];
            if(!this.robotAllowed && robotId !== null && userId === robotId) {
                console.log("Removed robot mention")
                continue;
            }
            var add = true;
            for(var index in value) {
                if(userId === value[index]["id"]) {
                    console.log("User id already mentioned: " + userId);
                    add = false;
                    break;
                }
            }
            if(add) {
                console.log("Adding mentioned user id: " + userId);
                value.push(mention);
            }
        }

        if(value.length != 0) {
            return value;
        }
        return null;
    }
};

// Polar Question, accepts by positive or negative regex, and can set sub flow for an answer
class PolarQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
    }

    // Set the positive answer regex and optional sub flow to start when a positive answer was given
    setPositive(regex, subFlow) {
        this.positiveRegex = regex
        this.positiveFlow = subFlow;
    }

    // Set the negative answer regex and optional sub flow to start when a negative answer was given
    setNegative(regex, subFlow) {
        this.negativeRegex = regex
        this.negativeFlow = subFlow;
    }

    // Check if the positive regex or negative regex matches, and set corresponding sub flow to execute
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        } else if(message.text.match(this.positiveRegex)) {
            this.setSubFlow(this.positiveFlow);
            return true;
        } else if(message.text.match(this.negativeRegex)) {
            this.setSubFlow(this.negativeFlow);
            return false;
        }
        return null;
    }
};

class MultipleChoiceQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
        this.options = [];
    }

    addOption(regex, subFlow) {
        this.options.push(new MultipleChoiceOption(regex, subFlow));
    }

    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        var choice = matches[0];
        for(var index in this.options) {
            var option = this.options[index];
            if(choice.match(option.regex)) {
                this.setSubFlow(option.subFlow);
                return choice;
            }
        }
    }
};

class MultipleChoiceOption {
    constructor(regex, subFlow) {
        this.regex = regex;
        this.subFlow = subFlow;
    }
};

module.exports = {

    Answers : Answers,
    Listener : Listener,
    Control : Control,
    Flow : Flow,
    TextQuestion : TextQuestion,
    NumberQuestion : NumberQuestion,
    EmailQuestion : EmailQuestion,
    PhoneNumberQuestion : PhoneNumberQuestion,
    MentionQuestion : MentionQuestion,
    PolarQuestion : PolarQuestion,
    MultipleChoiceQuestion : MultipleChoiceQuestion
};