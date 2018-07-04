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
const {Response, User, Message, TextMessage, LeaveMessage, TopicMessage} = require('hubot');

// Optional dependency, onyl loaded when Control.setMessengerApi() was called
var Messenger;

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

    // Get the keys that are set
    keys() {
        return Object.keys(this.data);
    }

    // Get the number of values that are set
    size() {
        return this.keys().length;
    }
}

// Listener class for consecutive questions
class Listener {
    constructor(msg, callback, question) {
        this.call = this.call.bind(this);
        this.msg = msg;
        this.callback = callback;
        this.question = question;
        this.regex = question.regex || Extra.getTextRegex();

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
    }

    // Called when a message was received for the listener
    call(responseMessage) {
        console.log("call: text: \"" + responseMessage.text + "\"");

        // Check if given regex matches
        this.matches = this.matcher(responseMessage);

        // Check if stop regex maches
        this.stop = this.stopMatcher(responseMessage);

        // Call callback
        this.callback(new Response(this.msg.robot, responseMessage, true), this);
    }
};

class PendingRequest {
    constructor(msg, callback, question) {
        this.call = this.call.bind(this);
        this.msg = msg;
        this.callback = callback;
        this.question = question;
    }

    // Called when an event was received for the request
    call(responseMessage) {
        console.log("call: \"" + responseMessage + "\"");

        // Check if this response if for the correct pending request message
        var requestMessageId;
        if(responseMessage.id && responseMessage.id["message_id"]) {
            requestMessageId = responseMessage.id["message_id"];
        } else {
            requestMessageId = responseMessage.id
        }
        var idMatch = requestMessageId === this.question.requestMessageId;

        var text;

        if(idMatch) {
            var event = responseMessage.text;
            if(event === "conversation_question_answer" || event === "groupchat_question_answer") {
                if(responseMessage.id && responseMessage.id["options"]) {
                    var options = responseMessage.id["options"];
                    var optionText = "";
                    for(var index in options) {
                        if(optionText.length > 0) {
                            optionText += ",";
                        }
                        optionText += options[index];
                    }
                    text = optionText;
                }
            } else if(event === "conversation_verification_accepted" || event === "conversation_verification_rejected"
              || event === "groupchat_verification_accepted" || event === "groupchat_verification_rejected") {
                text = event;
            }
        } else {
            console.log("Message ids do not match on pending request call");
        }

        responseMessage.text = text;

        if(text) {
            this.matches = text.match(this.question.regex);
        }

        // Call callback
        this.callback(new Response(this.msg.robot, responseMessage, true), this);
    }
};

// Class to control the questionnaires with
class Control {
    constructor() {
        // Listeners for active questionnaires
        this.questionnaireListeners = {};

        // Pending requests for active questionnaires
        this.questionnairePendingRequests = {};

        // Timeout timers for active questionnaires
        this.questionnaireTimeoutTimers = {};

        // Accepted commands
        this.acceptedCommands = [];
        this.acceptedRegex = [];
        this.acceptedHelpTexts = {};
        this.acceptedButtonLabels = {};
        this.acceptedButtonStyles = {};

        // Regular expressions
        this.stopRegex = new RegExp(/^[ \n\r\t]*stop[ \n\r\t]*$/, 'gi');
        this.helpRegex = new RegExp(/^[ \n\r\t]*help[ \n\r\t]*$/, 'gi');
        this.robotUserId;
        this.robotMentionRegex;

        // Response timeout milliseconds
        this.responseTimeoutMs = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT || 60000;
        // Response timeout text to send on timeout
        this.responseTimeoutText = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT_TEXT || "RESPONSE_TIMEOUT_TEXT";

        // Catch commands that are not present in the accepted commands list
        this.catchAllCommands = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL || false;
        // Catch all text to send on unaccepted command
        this.catchAllText = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_TEXT || "COMMAND_NOT_FOUND_TEXT";

        // Catch all button name to use on unaccepted command
        this.catchAllButtonName = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_BUTTON_NAME;
        // Catch all button label to use on unaccepted command
        this.catchAllButtonLabel = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_BUTTON_LABEL;
        // Catch all button style to use on unaccepted command
        this.catchAllButtonStyle = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_BUTTON_STYLE;

        // Override default hubot help command
        this.catchHelpCommand = process.env.HUBOT_QUESTIONNAIRE_CATCH_HELP || false;
        // Help text to send when default hubot help command is overridden
        this.catchHelpText = process.env.HUBOT_QUESTIONNAIRE_CATCH_HELP_TEXT || "HELP_TEXT";

        // Catch TopicMessages, used for events
        this.catchTopics = process.env.HUBOT_QUESTIONNAIRE_CATCH_TOPICS || true;

        // Remove a questionnaire listener and pending request when a user leave is detected
        this.removeListenerOnLeave = process.env.HUBOT_QUESTIONNAIRE_REMOVE_ON_LEAVE || false;
    }

    // Set the messenger api instance to use
    setMessengerApi(messengerApi) {
        try {
            Messenger = require('node-messenger-sdk');
            this.messengerApi = messengerApi;
        } catch(error) {
            console.error("setMessengerApi:", error);
        }

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

            if(control.robotUserId == null && robot.user != null) {
                control.robotUserId = robot.user.id;
            }

            if(control.robotMentionRegex == null && robot.user != null) {
                // Set the robot mention tag regex
                control.robotMentionRegex = new RegExp("\\[mention=" + robot.user.id + "\\]+", 'i');
            }

            var className;
            if(message.constructor != null) {
                className = message.constructor.name;
            } else {
                className = null;
                console.error("Unable to retrieve classname for: ", message);
            }

            if(className === "TopicMessage" || message instanceof TopicMessage) {
                var event = message.text;
                console.log("TopicMessage: " + event);
                if(event === "authenticated") {
                    if(control.authenticatedCallback) {
                        control.authenticatedCallback(message.id);
                    }
                } else if(event === "typing" || event === "stop_typing") {
                    if(control.typingCallback) {
                        var userId = control.getUserId(message.user);
                        var isGroup = control.isUserInGroup(message.user);
                        control.typingCallback(userId, event === "typing", message.room, isGroup);
                    }
                } else if(event === "presence_update") {
                    if(control.presenceCallback) {
                        control.presenceCallback(message.user.id, message.id);
                    }
                } else if(event === "new_conversation" || message.text === "new_groupchat") {
                    if(control.newChatCallback) {
                        control.newChatCallback(message.id, message.text === "new_groupchat");
                    }
                } else if(event === "groupchat_removed") {
                    if(control.removedFromChatCallback) {
                        control.removedFromChatCallback(message.id);
                    }
                } else if(event === "groupchat_closed") {
                    if(control.closedChatCallback) {
                        control.closedChatCallback(message.id);
                    }
                } else if(event === "conversation_message_liked" || event === "groupchat_message_liked") {
                    if(control.messageLikedCallback) {
                        var userId = control.getUserId(message.user);
                        var isGroup = control.isUserInGroup(message.user);
                        control.messageLikedCallback(userId, message.id, message.room, isGroup);
                    }
                } else if(event === "conversation_message_deleted" || event === "groupchat_message_deleted") {
                    if(control.messageDeletedCallback) {
                        var userId = control.getUserId(message.user);
                        var isGroup = control.isUserInGroup(message.user);
                        control.messageDeletedCallback(userId, message.id, message.room, isGroup);
                    }
                } else if(event === "conversation_verification_accepted" || event === "conversation_verification_rejected"
                    || event === "groupchat_verification_accepted" || event === "groupchat_verification_rejected") {
                    if(control.hasPendingRequest(message)) {
                        var pendingRequest = control.removePendingRequest(message);
                        pendingRequest.call(message);
                    }
                    if(control.verificationCallback) {
                        var userId = control.getUserId(message.user);
                        var isGroup = control.isUserInGroup(message.user);
                        var accepted = event === "conversation_verification_accepted" || event === "groupchat_verification_accepted";
                        control.verificationCallback(userId, message.id, message.room, isGroup, accepted);
                    }
                } else if(event === "conversation_question_answer" || event === "groupchat_question_answer") {
                    if(control.hasPendingRequest(message)) {
                        var pendingRequest = control.removePendingRequest(message);
                        pendingRequest.call(message);
                    } else if(message.id) {
                        control.checkCommandButton(message);
                    }
                    if(control.questionCallback && message.id) {
                        var userId = control.getUserId(message.user);
                        var isGroup = control.isUserInGroup(message.user);
                        var messageId = message.id["message_id"];
                        var options = message.id["options"];
                        if(messageId && options) {
                            control.questionCallback(userId, messageId, message.room, isGroup, options);
                        }
                    }
                } else if(event === "groupchat_members_added" || event === "groupchat_members_removed") {
                    if(control.groupMemberCallback) {
                        var data = message.id;
                        control.groupMemberCallback(message.room, event === "groupchat_members_added", data.user_id, data.users);
                    }
                } else if(event === "groupchat_subscribed" || event === "groupchat_unsubscribed") {
                    if(control.groupSubscribedCallback) {
                        control.groupSubscribedCallback(message.id, event === "groupchat_subscribed");
                    }
                }
                if(control.catchTopics) {
                    return;
                }
            } else if(className === "TextMessage" || message instanceof TextMessage) {
                console.log("TextMessage: " + message.text);
                // Check for listeners waiting for a message
                if (control.hasListener(message)) {
                    var listener = control.removeListener(message);
                    listener.call(message);
                    return;
                }

                var userId = control.getUserId(message.user);
                var roomId = message.room;
                var isGroup = control.isUserInGroup(message.user);
                var commandString = message.text.toLowerCase();

                var isMentioned;
                if(control.robotMentionRegex != null) {
                    var mentionMatch = commandString.match(control.robotMentionRegex);
                    if(mentionMatch) {
                        commandString = commandString.replace(mentionMatch[0], "");
                    }
                    isMentioned = mentionMatch != null;
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
                if(control.catchHelpCommand && commandString.match(control.helpRegex) != null) {
                    console.log("Help detected");
                    control.sendHelpMessage(message);
                    return;
                }

                // Check if an accepted command was sent
                var unknownCommand = true;
                for(var index in control.acceptedRegex) {
                    var match = commandString.match(control.acceptedRegex[index]);
                    if(match != null) {
                        unknownCommand = false;
                        console.log("Command detected: " + match);
                        break;
                    }
                }

                // Stop if catch all is enabled and an unknown command was sent
                if(control.catchAllCommands && unknownCommand) {
                    console.log("Catched unknown command");
                    control.sendCatchAllMessage(message);
                    return;
                }

            } else if(className === "LeaveMessage" || message instanceof LeaveMessage) {
                console.log("Leave detected: " + message.user.id);
                if(control.removeListenerOnLeave) {
                    if(control.hasListener(message)) {
                        control.removeListener(message);
                    }
                    if(control.hasPendingRequest(message)) {
                        control.removePendingRequest(message);
                    }
                }
            }

            // Pass through default robot receiver
            console.log("Passing through to default receiver");
            return robot.defaultRobotReceiver(message);
        };
    }

    // Add a listeners for followup questions
    addListener(message, listener) {
        listener.configure(this);
        var userId = this.getUserId(message.user);
        console.log("Adding listener for user " + userId + " in room " + message.room);
        this.questionnaireListeners[message.room + userId] = listener;
        if(!this.hasTimeoutTimer(message)) {
            this.addTimeoutTimer(message, listener.msg, listener.question);
        }
    }

    // Remove a listener that was added before
    removeListener(message) {
        var userId = this.getUserId(message.user);
        if(this.questionnaireListeners[message.room + userId] == null) {
            return null;
        }
        console.log("Removing listener for user " + userId + " in room " + message.room);
        var listener = this.questionnaireListeners[message.room + userId];
        delete this.questionnaireListeners[message.room + userId];
        if(this.hasTimeoutTimer(message)) {
            this.removeTimeoutTimer(message, listener.question);
        }
        return listener;
    }

    // Check if a listener is present for a user in a room
    hasListener(message) {
        return this.questionnaireListeners[message.room + this.getUserId(message.user)] != null;
    }

    // Add a pending request for a user
    addPendingRequest(message, pendingRequest) {
        var userId = this.getUserId(message.user);
        console.log("Adding pending request for user " + userId + " in room " + message.room);
        this.questionnairePendingRequests[message.room + userId] = pendingRequest;
        if(!this.hasTimeoutTimer(message)) {
            this.addTimeoutTimer(message, pendingRequest.msg, pendingRequest.question);
        }
    }

    // Remove a pending request for a user
    removePendingRequest(message) {
        var userId = this.getUserId(message.user);
        if(this.questionnairePendingRequests[message.room + userId] == null) {
            return null;
        }
        console.log("Removing pending request for user " + userId + " in room " + message.room);
        var pendingRequest = this.questionnairePendingRequests[message.room + userId];
        delete this.questionnairePendingRequests[message.room + userId];
        if(this.hasTimeoutTimer(message)) {
            this.removeTimeoutTimer(message, pendingRequest.question);
        }
        return pendingRequest;
    }

    // Check if a pending request is present for a user in a room
    hasPendingRequest(message) {
        return this.questionnairePendingRequests[message.room + this.getUserId(message.user)] != null;
    }

    addTimeoutTimer(message, msg, question) {
        var userId = this.getUserId(message.user);
        console.log("Adding timeout timer for user " + userId + " in room " + message.room);
        // Timeout milliseconds and callback
        var useTimeoutMs = question.timeoutMs || this.responseTimeoutMs;
        var useTimeoutText = question.timeoutText || this.responseTimeoutText;
        var useTimeoutCallback = question.timeoutCallback;
        if(useTimeoutCallback == null) {
            useTimeoutCallback = () => {
                if(useTimeoutText != null) {
                    msg.send(useTimeoutText);
                }
            };
        };

        var timer = setTimeout(() => {
            console.log("Timer timeout from user " + userId + " in room " + message.room);
            question.cleanup(message);

            // Call timeout callback
            useTimeoutCallback();
        }, useTimeoutMs);

        this.questionnaireTimeoutTimers[message.room + userId] = timer;
    }

    removeTimeoutTimer(message) {
        var userId = this.getUserId(message.user);
        if(this.questionnaireTimeoutTimers[message.room + userId] == null) {
            return;
        }
        console.log("Removing timeout timer for user " + userId + " in room " + message.room);
        var timer = this.questionnaireTimeoutTimers[message.room + userId];
        delete this.questionnaireTimeoutTimers[message.room + userId];
        clearTimeout(timer);
    }

    hasTimeoutTimer(message) {
        return this.questionnaireTimeoutTimers[message.room + this.getUserId(message.user)] != null;
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
    setCatchAllButton(name, label, style) {
        this.catchAllButtonName = name;
        this.catchAllButtonLabel = label;
        this.catchAllButtonStyle = style;
    }

    // Configuration to override default hubot help and commands that it does accept
    setCatchHelp(catchHelp) {
        this.catchHelpCommand = catchHelp;
    }
    setCatchHelpText(text) {
        this.catchHelpText = text;
    }

    // Callback that is called when the robot instance is authenticated
    setAuthenticatedCallback(authenticatedCallback) {
        this.authenticatedCallback = authenticatedCallback;
    }

    // Callback that is called when a user typing or user stopped typing is detected
    setTypingCallback(typingCallback) {
        this.typingCallback = typingCallback;
    }

    // Callback that is called when a user presence is detected
    setPresenceCallback(presenceCallback) {
        this.presenceCallback = presenceCallback;
    }

    // Callback that is called when a new chat is detected
    setNewChatCallback(newChatCallback) {
        this.newChatCallback = newChatCallback;
    }

    // Callback that is called when remove from chat is detected
    setRemovedFromChatCallback(removedFromChatCallback) {
        this.removedFromChatCallback = removedFromChatCallback;
    }

    // Callback that is called when a chat close is detected
    setClosedChatCallback(closedChatCallback) {
        this.closedChatCallback = closedChatCallback;
    }

    // Callback that is called when a message is liked
    setMessageLikedCallback(messageLikedCallback) {
        this.messageLikedCallback = messageLikedCallback;
    }

    // Callback that is called when a message is deleted
    setMessageDeletedCallback(messageDeletedCallback) {
        this.messageDeletedCallback = messageDeletedCallback;
    }

    // Callback that is called when a verification request is accepted or rejected
    setVerificationCallback(verificationCallback) {
        this.verificationCallback = verificationCallback;
    }

    // Callback that is called when a question request is answered
    setQuestionCallback(questionCallback) {
        this.questionCallback = questionCallback;
    }

    // Callback that is called when a group member is added or removed
    setGroupMemberCallback(groupMemberCallback) {
        this.groupMemberCallback = groupMemberCallback;
    }

    // Callback that is called when subscribed/unsubscribed to/from a chat
    setGroupSubscribedCallback(groupSubscribedCallback) {
        this.groupSubscribedCallback = groupSubscribedCallback;
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
    addAcceptedCommand(command, helpText, buttonLabel, buttonStyle) {
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
        this.acceptedRegex.push(new RegExp("^[ \\n\\r\\t]*" + c + "+[ \\n\\r\\t]*$", 'gi'));
        if(helpText != null) {
            this.acceptedHelpTexts[command] = helpText;
        }
        if(buttonLabel != null) {
            this.acceptedButtonLabels[command] = buttonLabel;
        }
        if(buttonStyle != null) {
            this.acceptedButtonStyles[command] = buttonStyle;
        }
    }

    checkCommandButton(message) {
        if(!this.messengerApi) {
            return;
        }
        var acceptedCommand = false;
        var options = message.id["options"];
        var optionText = "";
        for(var index in options) {
            if(optionText.length > 0) {
                optionText += ",";
            }
            optionText += options[index];
        }
        var helpCommand = optionText.match(this.helpRegex);
        if(!helpCommand) {
            for(var index in this.acceptedCommands) {
                if(optionText === this.acceptedCommands[index]) {
                    acceptedCommand = true;
                    break;
                }
            }
            if(!acceptedCommand) {
                return;
            }
        }
        var userId = this.getUserId(message.user);
        var roomId = message.room;
        var isGroup = this.isUserInGroup(message.user);
        var messageId = message.id["message_id"];
        this.messengerApi.getMessage(messageId, roomId, isGroup, false, (success, json) => {
            if(!success) {
                console.error("Unable to retrieve request message on checkCommandButton");
                return;
            }
            if(json != null && json["user"] && json["user"]["id"] === this.robotUserId) {
                if(helpCommand) {
                    this.sendHelpMessage(message);
                } else {
                    var textMessage = new TextMessage(message.user);
                    textMessage.room = roomId;
                    textMessage.text = optionText;
                    this.robot.defaultRobotReceiver(textMessage);
                }
            }
        });
    }

    sendHelpMessage(message) {
        var helpText = this.catchHelpText;
        for(var field in this.acceptedHelpTexts) {
            helpText += "\n • \'" + field + "\' - " + this.acceptedHelpTexts[field];
        }
        if(this.messengerApi && Object.keys(this.acceptedButtonLabels).length > 0) {
            var messageData = new Messenger.SendMessageData();
            messageData.message = helpText;
            messageData.chatId = message.room;
            messageData.isGroup = this.isUserInGroup(message.user);
            messageData.isAux = false;

            var questionPayload = new Messenger.QuestionPayload();
            questionPayload.multiAnswer = false;
//            questionPayload.style = "horizontal";
            for(var key in this.acceptedButtonLabels) {
                var questionOption = new Messenger.QuestionOption();
                questionOption.style = this.acceptedButtonStyles[key] || "red";
                questionOption.label = this.acceptedButtonLabels[key];
                questionOption.name = key;
                questionPayload.addQuestionOption(questionOption);
            }
            questionPayload.addUserId(this.getUserId(message.user));
            messageData.payload = questionPayload;

            // Send the message and parse result in callback
            this.messengerApi.sendMessage(messageData, (success, json) => {
                console.log("Send help successful: " + success);
                if(json == null) {
                    // Fallback
                    var response = new Response(this.robot, message, true);
                    response.send(helpText);
                }
            });
        } else {
            var response = new Response(this.robot, message, true);
            response.send(helpText);
        }
    }

    sendCatchAllMessage(message) {
        if(this.messengerApi && this.catchAllButtonName && this.catchAllButtonLabel) {
            var messageData = new Messenger.SendMessageData();
            messageData.message = this.catchAllText;
            messageData.chatId = message.room;
            messageData.isGroup = this.isUserInGroup(message.user);
            messageData.isAux = false;

            var questionPayload = new Messenger.QuestionPayload();
            questionPayload.multiAnswer = false;
//            questionPayload.style = "horizontal";
            var questionOption = new Messenger.QuestionOption();
            questionOption.style = this.catchAllButtonStyle || "red";
            questionOption.label = this.catchAllButtonLabel;
            questionOption.name = this.catchAllButtonName;
            questionPayload.addQuestionOption(questionOption);
            questionPayload.addUserId(this.getUserId(message.user));
            messageData.payload = questionPayload;

            // Send the message and parse result in callback
            this.messengerApi.sendMessage(messageData, function(success, json) {
                console.log("Send help successful: " + success);
                if(json == null) {
                    // Fallback
                    var response = new Response(this.robot, message, true);
                    response.send(this.catchAllText);
                }
            });
        } else {
            var response = new Response(this.robot, message, true);
            response.send(this.catchAllText);
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

    // Add a information message to the flow
    info(text, waitMs) {
        this.steps.push(new Information(text, waitMs));
        return this;
    }

    // Add an external action to the flow
    action(callback, waitMs) {
        this.steps.push(new Action(callback, waitMs));
        return this;
    }

    // Add new TextQuestion
    text(answerKey, questionText, invalidText) {
        return this.add(new TextQuestion(answerKey, questionText, invalidText));
    }

    // Use an alternative regular expression for the last added TextQuestion
    regex(regex) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on regex()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof TextQuestion)) {
            console.error("Last added Question is not an instance of TextQuestion on regex()");
            return this;
        }
        this.lastAddedQuestion.setRegex(regex);
        return this;
    }

    // Set the minimum and/or maximum length of the last added TextQuestion
    length(minLength, maxLength) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on length()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof TextQuestion)) {
            console.error("Last added Question is not an instance of TextQuestion on length()");
            return this;
        }
        this.lastAddedQuestion.setLength(minLength, maxLength);
        return this;
    }

    // Capitalize the first letter of the answer of the last added TextQuestion
    capitalize() {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on capitalize()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof TextQuestion)) {
            console.error("Last added Question is not an instance of TextQuestion on capitalize()");
            return this;
        }
        this.lastAddedQuestion.setFormatAnswerFunction(Extra.capitalizeFirstLetter);
        return this;
    }

    // Capitalize the answer as a last name of the last added TextQuestion
    lastName() {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on lastName()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof TextQuestion)) {
            console.error("Last added Question is not an instance of TextQuestion on lastName()");
            return this;
        }
        this.lastAddedQuestion.setFormatAnswerFunction(Extra.capitalizeLastName);
        return this;
    }

    // Add new NumberQuestion
    number(answerKey, questionText, invalidText) {
        return this.add(new NumberQuestion(answerKey, questionText, invalidText));
    }

    // Set the minimum and/or maximum value range of the last added NumberQuestion
    range(minValue, maxValue) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on range()");
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
    email(answerKey, questionText, invalidText) {
        return this.add(new EmailQuestion(answerKey, questionText, invalidText));
    }

    // Set the allowed email domains of the last added EmailQuestion
    domains(allowedDomains) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on domains()");
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
    phone(answerKey, questionText, invalidText) {
        return this.add(new PhoneNumberQuestion(answerKey, questionText, invalidText));
    }

    // Set the allowed country codes of the last added PhoneNumberQuestion
    countryCodes(allowedCountryCodes) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on countryCodes()");
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
        return this.add(new MentionQuestion(answerKey, questionText, invalidText));
    }

    // Add mentions to include after answer of the last added MentionQuestion
    includeMentions(mentions) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on includeMentions()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MentionQuestion)) {
            console.error("Last added Question is not an instance of MentionQuestion on includeMentions()");
            return this;
        }
        this.lastAddedQuestion.setIncludeMentions(mentions);
        return this;
    }

    // Change if the all mentioned tag is allowed of the last added MentionQuestion
    allAllowed(allowed) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on allAllowed()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MentionQuestion)) {
            console.error("Last added Question is not an instance of MentionQuestion on allAllowed()");
            return this;
        }
        this.lastAddedQuestion.setAllAllowed(allowed);
        return this;
    }

    // Change if the robot mentioned tag is allowed of the last added MentionQuestion
    robotAllowed(allowed) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on robotAllowed()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MentionQuestion)) {
            console.error("Last added Question is not an instance of MentionQuestion on robotAllowed()");
            return this;
        }
        this.lastAddedQuestion.setRobotAllowed(allowed);
        return this;
    }

    // Add new AttachmentQuestion
    attachment(answerKey, questionText, invalidText) {
        return this.add(new AttachmentQuestion(answerKey, questionText, invalidText));
    }

    // Set the minimum and/or maximum count of attachments of the last added AttachmentQuestion
    count(minCount, maxCount) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on count()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof AttachmentQuestion)) {
            console.error("Last added Question is not an instance of AttachmentQuestion on count()");
            return this;
        }
        this.lastAddedQuestion.setCountRange(minCount, maxCount);
        return this;
    }

    // Set the minimum and/or maximum file size in bytes of attachments of the last added AttachmentQuestion
    size(minSize, maxSize) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on size()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof AttachmentQuestion)) {
            console.error("Last added Question is not an instance of AttachmentQuestion on size()");
            return this;
        }
        this.lastAddedQuestion.setSizeRange(minSize, maxSize);
        return this;
    }

    extensions(allowedExtensions) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on extensions()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof AttachmentQuestion)) {
            console.error("Last added Question is not an instance of AttachmentQuestion on extensions()");
            return this;
        }
        this.lastAddedQuestion.addAllowedExtensions(allowedExtensions);
        return this;
    }

    // Add new PolarQuestion
    polar(answerKey, questionText, invalidText) {
        return this.add(new PolarQuestion(answerKey, questionText, invalidText));
    }

    // Set the positive regex and optional sub flow of the last added PolarQuestion
    positive(regex, subFlow) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on positive()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            console.error("Last added Question is not an instance of PolarQuestion on positive()");
            return this;
        }
        this.lastAddedQuestion.setPositive(regex, subFlow);
        return this;
    }

    positiveButton(name, label, style) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on positiveButton()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            console.error("Last added Question is not an instance of PolarQuestion on positiveButton()");
            return this;
        }
        this.lastAddedQuestion.setPositiveButton(name, label, style);
        return this;
    }

    // Set the negative regex and optional sub flow of the last added PolarQuestion
    negative(regex, subFlow) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on negative()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            console.error("Last added Question is not an instance of PolarQuestion on negative()");
            return this;
        }
        this.lastAddedQuestion.setNegative(regex, subFlow);
        return this;
    }

    negativeButton(name, label, style) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on negativeButton()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            console.error("Last added Question is not an instance of PolarQuestion on negativeButton()");
            return this;
        }
        this.lastAddedQuestion.setNegativeButton(name, label, style);
        return this;
    }

    // Add new MultipleChoiceQuestion
    multiple(answerKey, questionText, invalidText) {
        return this.add(new MultipleChoiceQuestion(answerKey, questionText, invalidText));
    }

    // Add an option regex, optional sub flow and optional value of the last added MultipleChoiceQuestion
    option(regex, subFlow, value) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on option()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MultipleChoiceQuestion)) {
            console.error("Last added Question is not an instance of MultipleChoiceQuestion on option()");
            return this;
        }
        this.lastAddedQuestion.addOption(regex, subFlow, value);
        return this;
    }

    button(name, label, style) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on button()");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MultipleChoiceQuestion)) {
            console.error("Last added Question is not an instance of MultipleChoiceQuestion on button()");
            return this;
        }
        this.lastAddedQuestion.addButton(name, label, style);
        return this;
    }

    // Add new VerificationQuestion
    verification(answerKey, provider) {
        var verificationQuestion = new VerificationQuestion(answerKey, "", "");
        verificationQuestion.setProvider(provider);
        return this.add(verificationQuestion);
    }

    // Ask the last added question to the users that were mentioned a MentionQuestion earlier (multi user question)
    askMentions(mentionAnswerKey) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on askMentions()");
            return this;
        }
        this.lastAddedQuestion.setMentionAnswerKey(mentionAnswerKey);
        return this;
    }

    // Ask the last added question to a list of user ids (multi user question)
    askUserIds(userIds) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on askUserIds()");
            return this;
        }
        this.lastAddedQuestion.setUserIds(userIds);
        return this;
    }

    // Break multi user question on a certain answer value, and set if the flow should continue or stop
    breakOnValue(value, stop) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on breakOnValue()");
            return this;
        }
        this.lastAddedQuestion.setBreakOnValue(value, stop);
        return this;
    }

    // Break multi user question when an answer matches the given regex, and set if the flow should continue or stop
    breakOnRegex(regex, stop) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on breakOnRegex()");
            return this;
        }
        this.lastAddedQuestion.setBreakOnRegex(regex, stop);
        return this;
    }

    // Break multi user question on a certain number of answers
    breakOnCount(count) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on breakOnCount()");
            return this;
        }
        this.lastAddedQuestion.setBreakOnCount(count);
        return this;
    }

    // Set a callback to format the question text with by the answers given earlier
    formatAnswer(formatAnswerFunction) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on formatAnswer()");
            return this;
        }
        this.lastAddedQuestion.setFormatAnswerFunction(formatAnswerFunction);
        return this;
    }

    // Set a callback to format the question text with by the answers given earlier
    formatQuestion(formatQuestionFunction) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on formatQuestion()");
            return this;
        }
        this.lastAddedQuestion.setFormatQuestionFunction(formatQuestionFunction);
        return this;
    }

    // Set a callback to summarize given answers after every user answer for a multi user question
    multiUserSummary(multiUserSummaryFunction) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on multiUserSummary()");
            return this;
        }
        this.lastAddedQuestion.setMultiUserSummaryFunction(multiUserSummaryFunction);
        return this;
    }

    // Set a callback to summarize the given answers after last added question
    summary(summaryFunction) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on summary()");
            return this;
        }
        this.lastAddedQuestion.setSummaryFunction(summaryFunction);
        return this;
    }

    // Add a delay to the last added question
    delay(ms) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on delay()");
            return this;
        }
        this.lastAddedQuestion.setDelay(ms);
        return this;
    }

    // Use non-default timeout for last added question
    timeout(ms, text, callback) {
        if(this.lastAddedQuestion == null) {
            console.error("No Question added to flow on timeout()");
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
        } else if(msg == null) {
            console.error("msg is null on start");
            if(this.errorText != null) {
                msg.send(this.errorText);
            }
            return;
        }
        this.msg = msg;
        this.answers = answers || new Answers();
        this.next();
    }

    // Callback function that is used with Listeners and PendingRequests
    callback(response, listenerOrPendingRequest) {
        var question = listenerOrPendingRequest.question;
        var flow = question.flow;

        if(listenerOrPendingRequest instanceof Listener) {
            var listener = listenerOrPendingRequest;

            // Check if the stop regex was triggered
            if(listener.stop) {
                question.cleanup(response.message);
                if(flow.stopText != null) {
                    response.send(flow.stopText);
                }
                return;
            }

            // Let the Question check and parse the message
            var answerValue = question.checkAndParseAnswer(listener.matches, response.message);
            if(answerValue == null) {
                console.log("No valid answer value from listener, resetting listener");
                response.send(question.invalidText + " " + question.questionText);
                return flow.control.addListener(response.message, new Listener(response, this.callback, question));
            }
            flow.onAnswer(response, question, answerValue);
        } else if(listenerOrPendingRequest instanceof PendingRequest) {
            var pendingRequest = listenerOrPendingRequest;

            var answerValue = question.checkAndParseAnswer(pendingRequest.matches, response.message);
            if(answerValue == null) {
                console.log("No valid answer value from pending request or wrong request message id, resetting pending request");
                return flow.control.addPendingRequest(response.message, new PendingRequest(response, this.callback, question));
            }
            flow.onAnswer(response, question, answerValue);
        } else {
            response.send(flow.errorText);
        }
    }

    // Process question answer
    onAnswer(response, question, answerValue) {
        var flow = question.flow;

        // Format the given answer if a function was set
        if(question.formatAnswerFunction) {
            var formatted = question.formatAnswerFunction(answerValue);
            if(formatted && formatted !== "") {
                answerValue = formatted;
            }
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
            console.log("Added multi-user answer: key: \"" + question.answerKey + "\" value: \"" + answerValue + "\"");
            var answerCount = multiAnswers.size();

            // Check if a value was set to break multi user question on and use it
            var breaking = false;
            var stopping = false;
            if(question.breakOnValue != null && question.breakOnValue === answerValue) {
                breaking = true;
                stopping = question.stopOnBreak;
            } else if(question.breakOnRegex != null && answerValue.match(question.breakOnRegex) != null) {
                breaking = true;
                stopping = question.stopOnBreak;
            } else if(question.breakOnCount != null && answerCount != question.userIds.length && answerCount >= question.breakOnCount) {
                breaking = true;
            }

            // Call multi user answers summary function if set
            if(question.multiUserSummaryFunction != null) {
                var summary = question.multiUserSummaryFunction(this.answers, userId, breaking);
                if(summary && summary !== "") {
                    response.send(summary);
                }
            }

            // Cleanup on breaking and stop if configured
            if(breaking) {
                question.cleanup(response.message);
                if(stopping) {
                    if(flow.stopText != null) {
                        response.send(flow.stopText);
                    }
                    return;
                }
            }

            // Check if still waiting for more answers
            if(!breaking && question.userIds.length > answerCount) {
                return;
            }
        } else {
            // Valid answer, store in the answers object
            this.answers.add(question.answerKey, answerValue);
            console.log("Added answer: key: \"" + question.answerKey + "\" value: \"" + answerValue + "\"");
        }

        // Trigger sub flow if set in question, otherwise continue
        if(question.subFlow != null) {
            var subFlow = question.subFlow;
            // Set control when null
            if(subFlow.control == null) {
                subFlow.control = flow.control;
            }
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
                // Call summary function if set
                if(question.summaryFunction != null) {
                    var summary = question.summaryFunction(this.answers);
                    if(summary && summary !== "") {
                        response.send(summary);
                    }
                }

                flow.next();
            });
            // Start the sub flow
            subFlow.start(this.msg, this.answers);
        } else {
            // Call summary function if set
            if(question.summaryFunction != null) {
                var summary = question.summaryFunction(this.answers);
                if(summary && summary !== "") {
                    response.send(summary);
                }
            }

            flow.next();
        }
    }

    // Execute next question
    next() {
        // Check if has more steps or flow is finished
        if(this.currentStep < this.steps.length) {
            var step = this.steps[this.currentStep++];
            if(step instanceof Question) {
                var question = step;
                if(this.answers.get(question.answerKey)) {
                    console.log("Already have answer for \"" + question.answerKey + "\", skipping question");
                    this.next();
                    return;
                }
                console.log("Flow next question: " + question.questionText);

                // Delay executing this message if a delay was set
                if(question.delayMs && question.delayMs > 0) {
                    console.log("Executing question delayed by " + question.delayMs + " milliseconds");
                    setTimeout(() => {
                        question.execute(this.control, this.msg, this.callback, this.answers);
                    }, question.delayMs);
                } else {
                    question.execute(this.control, this.msg, this.callback, this.answers);
                }
            } else if(step instanceof Information) {
                var information = step;
                information.execute(this, this.msg);
            } else if(step instanceof Action) {
                var action = step;
                action.execute(this, this.msg, this.answers);
            } else {
                console.error("Invalid step: ", step);
                this.next();
            }
        } else {
            console.log("Flow finished");
            if(this.finishedCallback != null) {
                this.finishedCallback(this.msg, this.answers);
            }
        }
    }
};

// Class to preform an external action during a flow
class Action {
    constructor(callback, waitMs) {
        this.callback = callback;
        this.waitMs = waitMs;
    }

    // Execute this action
    execute(flow, msg, answers) {
        // Trigger action callback
        this.callback(msg, answers, () => {
            // Wait after executing action if wait time was set
            if(this.waitMs && this.waitMs > 0) {
                console.log("Waiting after executing action for " + this.waitMs + " milliseconds");
                setTimeout(() => {
                    flow.next();
                }, this.waitMs)
            } else {
                flow.next();
            }
        });
    }
};

// Class to send the user information during a flow
class Information {
    constructor(text, waitMs) {
        this.text = text;
        this.waitMs = waitMs;
    }

    // Execute this information message
    execute(flow, msg) {
        // Send information message text
        msg.send(this.text);
        // Wait after sending message if wait time was set
        if(this.waitMs && this.waitMs > 0) {
            console.log("Waiting after sending information for " + this.waitMs + " milliseconds");
            setTimeout(() => {
                flow.next();
            }, this.waitMs)
        } else {
            flow.next();
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
        this.useListeners = true;
        this.usePendingRequests = false;
    }

    // Set the parent flow
    setFlow(flow) {
        this.flow = flow;
    }

    // Set the sub flow to execute after this question
    setSubFlow(subFlow) {
        this.subFlow = subFlow;
    }

    // Set a format function to format given answer with
    setFormatAnswerFunction(formatAnswerFunction) {
        this.formatAnswerFunction = formatAnswerFunction;
    }

    // Set a format question text callback function
    setFormatQuestionFunction(formatQuestionFunction) {
        this.formatQuestionFunction = formatQuestionFunction;
    }

    // Set a summary callback function to trigger after answer
    setSummaryFunction(summaryFunction) {
        this.summaryFunction = summaryFunction;
    }

    // Add a delay before executing this question
    setDelay(ms) {
        this.delayMs = ms;
    }

    // Use non-default timeout settings for this question
    setTimeout(ms, text, callback) {
        this.timeoutMs = ms;
        this.timeoutText = text;
        this.timeoutCallback = callback;
    }

    // Ask this question to users that were mentioned earlier
    setMentionAnswerKey(mentionAnswerKey) {
        this.mentionAnswerKey = mentionAnswerKey;
        this.isMultiUser = true;
    }

    // Ask this question to a list of user ids
    setUserIds(userIds) {
        this.userIds = userIds;
        this.isMultiUser = true;
    }

    // Break this multi user question on an answer value and optionally stop the flow
    setBreakOnValue(value, stop) {
        this.breakOnValue = value;
        this.stopOnBreak = stop;
        this.isMultiUser = true;
    }

    // Break this multi user question when an answer matches the given regex and optionally stop the flow
    setBreakOnRegex(regex, stop) {
        this.breakOnRegex = regex;
        this.stopOnBreak = stop;
        this.isMultiUser = true;
    }

    // Break this multi user question when a certain number of answers is reached
    setBreakOnCount(count) {
        this.breakOnCount = count;
        this.isMultiUser = true;
    }

    // Set a summary callback function to trigger after every user answer
    setMultiUserSummaryFunction(multiUserSummaryFunction) {
        this.multiUserSummaryFunction = multiUserSummaryFunction;
        this.isMultiUser = true;
    }

    // Execute this question
    execute(control, msg, callback, answers) {

        if(this.formatQuestionFunction != null) {
            var formatted = this.formatQuestionFunction(answers);
            if(formatted && formatted !== "") {
                // Set formatted question as question text
                this.questionText = formatted;

            }
        }

        // Generate user id list by mentioned users
        if(this.isMultiUser && !this.userIds && this.mentionAnswerKey) {
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

        // Send question text
        this.send(control, msg, callback);
    }

    // Send the message text
    send(control, msg, callback) {
        msg.send(this.questionText);
        this.setListenersAndPendingRequests(control, msg, callback);
    }

    // Set the Listeners and PendingRequests for this Question
    setListenersAndPendingRequests(control, msg, callback) {
        // Check if listeners or pending requests should be added
        if(!this.useListeners && !this.usePendingRequests || (this.pendingRequest && !control.messengerApi)) {
            return;
        }

        // Check if the question should be asked to multiple users
        if(this.isMultiUser) {
            // Check if user id list is available and not empty
            if(this.userIds && this.userIds.length > 0) {
                var question = this;
                question.timedOut = false;
                question.multiUserMessages = [];

                var configuredTimeoutCallback = question.timeoutCallback;

                question.timeoutCallback = function() {
                    // Check if question was already timed out
                    if(question.timedOut) {
                        return;
                    }
                    // Mark question as timed out
                    question.timedOut = true;
                    // Clean up remaining listeners
                    question.cleanup(msg.message);
                    // Trigger timeout callback
                    if(configuredTimeoutCallback) {
                        configuredTimeoutCallback();
                    } else {
                        var timeoutText = question.timeoutText || control.responseTimeoutText;
                        if(timeoutText != null) {
                            msg.send(timeoutText);
                        }
                    }
                };

                // Create listener for every user id
                for(var index in this.userIds) {
                    var userId = this.userIds[index];

                    // Create Message for each user id in list
                    var user = new User(userId);
                    var userMessage = new Message(user);
                    userMessage.room = msg.message.room;

                    // Store for cleanup if needed
                    question.multiUserMessages.push(userMessage);

                    if(question.useListeners) {
                        // Add listener for user and wait for answer
                        control.addListener(userMessage, new Listener(msg, callback, this));
                    }
                    if(question.usePendingRequests) {
                        // Add listener for user and wait for answer
                        control.addPendingRequest(userMessage, new PendingRequest(msg, callback, this));
                    }
                }
                return;
            }
            console.error("Empty userId list for multi-user question");
            msg.send(this.flow.errorText);
            return;
        }

        if(this.useListeners) {
            // Add listener for single user and wait for answer
            control.addListener(msg.message, new Listener(msg, callback, this));
        }
        if(this.usePendingRequests) {
            // Add a pending request for single user and wait for answer
            control.addPendingRequest(msg.message, new PendingRequest(msg, callback, this));
        }
    }

    // Clean up question if timed out or stopped
    cleanup(msg) {
        if(msg) {
            this.flow.control.removeListener(msg);
            this.flow.control.removePendingRequest(msg);
        }
        if(this.multiUserMessages != null) {
            for(var index in this.multiUserMessages) {
                var userMessage = this.multiUserMessages[index];
                this.flow.control.removeListener(userMessage);
                this.flow.control.removePendingRequest(userMessage);
            }
        }
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

    // Use an alternative regular expression
    setRegex(regex) {
        this.regex = regex;
    }

    // Set the accepted length of the answer
    setLength(min, max) {
        this.min = min;
        this.max = max;
    }

    // Check if valid text and if length is accepted
    checkAndParseAnswer(matches, message) {
        if(matches == null) {
            return null;
        }
        if(this.acceptedLength(message.text)) {
            return message.text;
        }
        return null;
    }

    // Check the text length
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

    // Add a list of accepted domains
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

    // Add a list of accepted country codes
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
        this.allAllowed = true;
        this.robotAllowed = false;
    }

    // Include these mentions after question is answered
    setIncludeMentions(mentions) {
        this.includeMentions = mentions;
    }

    // Change if if the mentioned all tag is allowed
    setAllAllowed(allowed) {
        this.allAllowed = allowed;
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

        // Check for the mentioned all tag
        if(message.text.match(Extra.getMentionedAllRegex()) !== null) {
            // Check if the all tag is configured as allowed
            if(!this.allAllowed) {
                return null;
            }
            var mention = {};
            mention["id"] = "@all";
            value.push(mention);
            return value;
        }

        var mentions;

        // Copy mention data if already parsed by gateway
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

        // Check for duplicates and robot mention
        for(var index in mentions) {
            var mention = mentions[index];
            var userId = mention["id"];
            // Skip robot mention if not allowed
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

        // If a valid answer has been given, add the include mention list
        if(value.length != 0) {
            if(this.includeMentions != null) {
                for(var index in this.includeMentions) {
                    var includeMention = this.includeMentions[index];
                    var userId = includeMention["id"];
                    var add = true;
                    for(var i in value) {
                        if(userId === value[i]["id"]) {
                            add = false;
                            break;
                        }
                    }
                    if(add) {
                        value.push(includeMention);
                    }
                }
            }
            return value;
        }
        return null;
    }
};

class AttachmentQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
        this.allowedExtensions = [];
    }

    // Get attachments that were sent with the message
    checkAndParseAnswer(matches, message) {
        if(message.attachments === null) {
            return null;
        }
        var value = [];

        for(var index in message.attachments) {
            var attachment = message.attachments[index];
            if(this.minSize !== null || this.maxSize !== null) {
                var size = parseFloat(attachment["size"]);
                if(!this.inSizeRange(size)) {
                    continue;
                }
            }
            if(this.allowedExtensions.length != 0) {
                var name = attachment["name"];
                var allowed = false;
                for(var i in this.allowedExtensions) {
                    if(name.endsWith(this.allowedExtensions[i])) {
                        allowed = true;
                        break;
                    }
                }
                if(!allowed) {
                    continue;
                }
            }
            value.push(attachment);
        }

        if(value.length != 0 && this.inCountRange(value.length)) {
            return value;
        }
        return null;
    }

    // Check if the value is in range
    inCountRange(value) {
        if(this.minCount != null && this.maxCount != null) {
            return value >= this.minCount && value <= this.maxCount;
        } else if(this.minCount != null) {
            return value >= this.minCount;
        } else if(this.maxCount != null) {
            return value <= this.maxCount;
        }
        return true;
    }

    // Check if the value is in range
    inSizeRange(value) {
        if(this.minSize != null && this.maxSize != null) {
            return value >= this.minSize && value <= this.maxSize;
        } else if(this.minSize != null) {
            return value >= this.minSize;
        } else if(this.maxSize != null) {
            return value <= this.maxSize;
        }
        return true;
    }

    // Set a minimum and/or maximum count of attachments to accept
    setCountRange(minCount, maxCount) {
        this.minCount = minCount;
        this.maxCount = maxCount;
    }

    // Set a minimum and/or maximum size to accept
    setSizeRange(minSize, maxSize) {
        this.minSize = minSize;
        this.maxSize = maxSize;
    }

    // Add an extension to limit accepted answers to
    addAllowedExtension(extension) {
        for(var index in this.allowedExtensions) {
            if(extension === this.allowedExtensions[index]) {
                console.error("Extension already configured as allowed for AttachmentQuestion: " + extension);
                return;
            }
        }
        this.allowedExtensions.push(extension);
    }

    // Add a list of accepted extensions
    addAllowedExtensions(extensions) {
        for(var index in extensions) {
            this.addAllowedExtension(extensions[index]);
        }
    }
};

// Polar Question, accepts by positive or negative regex, and can set sub flow for an answer
class PolarQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
        this.useButtons = false;
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

    setPositiveButton(name, label, style) {
        this.useButtons = true;
        this.positiveName = name;
        this.positiveLabel = label;
        this.positiveStyle = style;
    }

    setNegativeButton(name, label, style) {
        this.useButtons = true;
        this.negativeName = name;
        this.negativeLabel = label;
        this.negativeStyle = style;
    }

    send(control, msg, callback) {
        if(control.messengerApi && this.useButtons) {
            var messageData = new Messenger.SendMessageData();
            messageData.message = this.questionText;
            messageData.chatId = msg.message.room;
            messageData.isGroup = control.isUserInGroup(msg.message.user);
            messageData.isAux = false;

            var questionPayload = new Messenger.QuestionPayload();
            questionPayload.multiAnswer = false;
//            questionPayload.style = "horizontal";

            var labelPositive = this.positiveLabel || this.positiveRegex;
            if(!labelPositive) {
                labelPositive = "Positive";
            }
            var namePositive = this.positiveName || this.positiveRegex;
            if(namePositive) {
                namePositive = namePositive.toLowerCase();
            } else {
                namePositive = "positive";
            }
            var positiveOption = new Messenger.QuestionOption();
            positiveOption.style = this.positiveStyle || "green";
            positiveOption.label = labelPositive;
            positiveOption.name = namePositive;
            questionPayload.addQuestionOption(positiveOption);

            var labelNegative = this.negativeLabel || this.negativeRegex;
            if(!labelNegative) {
                labelNegative = "Negative";
            }
            var nameNegative = this.negativeName || this.negativeRegex;
            if(nameNegative) {
                nameNegative = nameNegative.toLowerCase();
            } else {
                nameNegative = "negative";
            }
            var negativeOption = new Messenger.QuestionOption();
            negativeOption.style = this.negativeStyle || "red";
            negativeOption.label = labelNegative;
            negativeOption.name = nameNegative;
            questionPayload.addQuestionOption(negativeOption);

            if(this.userIds && this.userIds.length > 0) {
                questionPayload.addUserIds(this.userIds);
            } else {
                questionPayload.addUserId(control.getUserId(msg.message.user));
            }
            messageData.payload = questionPayload;

            var question = this;

            // Send the message and parse result in callback
            control.messengerApi.sendMessage(messageData, function(success, json) {
                console.log("Send question successful: " + success);
                if(json != null) {
                    var messageId = json["id"];
                    console.log("Question message id: " + messageId);
                    question.requestMessageId = messageId;
                    question.usePendingRequests = true;
                } else {
                    // Fallback
                    msg.send(question.questionText);
                }
                question.setListenersAndPendingRequests(control, msg, callback);
            });
        } else {
            msg.send(this.questionText);
            this.setListenersAndPendingRequests(control, msg, callback);
        }
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

// Multiple choice question, add options by regex and optional sub flow
class MultipleChoiceQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getNonEmptyRegex();
        this.options = [];
        this.useButtons = false;
    }

    // Add an option answer regex and optional sub flow
    addOption(regex, subFlow, value) {
        this.options.push(new MultipleChoiceOption(regex, subFlow, value));
    }

    addButton(name, label, style) {
        this.useButtons = true;
        if(this.options && this.options.length > 0) {
            var option = this.options[this.options.length - 1];
            if(option) {
                option.name = name;
                option.label = label;
                option.style = style;
            }
        }
    }

    send(control, msg, callback) {
        if(control.messengerApi && this.useButtons) {
            var messageData = new Messenger.SendMessageData();
            messageData.message = this.questionText;
            messageData.chatId = msg.message.room;
            messageData.isGroup = control.isUserInGroup(msg.message.user);
            messageData.isAux = false;

            var questionPayload = new Messenger.QuestionPayload();
            questionPayload.multiAnswer = false;
//            questionPayload.style = "horizontal";
            for(var i in this.options) {
                var option = this.options[i];

                var label = option.label || option.regex;
                if(!label) {
                    label = "Label" + i;
                }

                var name = option.name || option.regex;
                if(name) {
                    name = name.toLowerCase();
                } else {
                    name = "name" + i;
                }

                var questionOption = new Messenger.QuestionOption();
                questionOption.style = option.style || "red";
                questionOption.label = label;
                questionOption.name = name;
                questionPayload.addQuestionOption(questionOption);
            }
            if(this.userIds && this.userIds.length > 0) {
                questionPayload.addUserIds(this.userIds);
            } else {
                questionPayload.addUserId(control.getUserId(msg.message.user));
            }
            messageData.payload = questionPayload;

            var question = this;

            // Send the message and parse result in callback
            control.messengerApi.sendMessage(messageData, function(success, json) {
                console.log("Send question successful: " + success);
                if(json != null) {
                    var messageId = json["id"];
                    console.log("Question message id: " + messageId);
                    question.requestMessageId = messageId;
                    question.usePendingRequests = true;
                } else {
                    var fallbackText = question.questionText;
                    for(var i in questionPayload.questionOptions) {
                        var option = questionPayload.questionOptions[i];
                        fallbackText += "\n • \"" + option.name + "\" - " + option.label;
                    }
                    msg.send(fallbackText);
                }
                question.setListenersAndPendingRequests(control, msg, callback);
            });
        } else {
            msg.send(this.questionText);
            this.setListenersAndPendingRequests(control, msg, callback);
        }
    }

    // Check the if one of the option regex matches, and set the corresponding sub flow to execute
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        var choice = matches[0];
        var longestMatch = null;
        var optionMatch = null;
        for(var index in this.options) {
            var option = this.options[index];
            var match = choice.match(option.regex);
            if(match) {
                var matchString = match[0];
                if(longestMatch) {
                    if(longestMatch.length > matchString.length) {
                        continue;
                    }
                }
                longestMatch = matchString;
                optionMatch = option;
            }
        }
        if(optionMatch) {
            // Set the sub flow if available
            var subFlow = optionMatch.subFlow;
            if(subFlow) {
                this.setSubFlow(subFlow);
            }
            // Return value if set
            var value = optionMatch.value;
            if(typeof value !== typeof undefined) {
                return value;
            }
        }
        // Return text match
        return longestMatch;
    }
};

// Class to contain a option of a multiple choice question
class MultipleChoiceOption {
    constructor(regex, subFlow, value) {
        this.regex = regex;
        this.subFlow = subFlow;
        this.value = value;
    }
};

// Verification question
class VerificationQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.useListeners = false;
        this.usePendingRequests = true;
    }

    setProvider(provider) {
        this.provider = provider;
    }

    send(control, msg, callback) {
        // Unable to preform question without messenger api
        if(!control.messengerApi) {
            msg.send(this.flow.errorText);
            return;
        }

        if(this.isMultiUser && this.userIds && this.userIds.length > 0) {
            for(var index in this.userIds) {
                this.sendForUserId(control, msg, callback, this.userIds[index]);
            }
        } else {
            this.sendForUserId(control, msg, callback, control.getUserId(msg.message.user));
        }
    }

    sendForUserId(control, msg, callback, userId) {
        var question = this;

        // Try to retrieve provider for user
        control.messengerApi.getUserProviders(userId, function(providerSuccess, providerJson) {
            if(!providerSuccess) {
                msg.send(question.flow.errorText);
                return;
            }
            var providerId;
            for(var i in providerJson) {
                var provider = providerJson[i];
                if(provider["name"] === question.provider) {
                    providerId = provider["provider_id"];
                    break;
                }
            }
            if(providerId) {
                // Got provider, send verification request
                var chatId = msg.message.room;
                var isGroup = control.isUserInGroup(msg.message.user);

                control.messengerApi.askUserVerification(userId, providerId, chatId, isGroup, false, function(askSuccess, askJson) {
                    if(!askSuccess) {
                        msg.send(question.flow.errorText);
                        return;
                    }
                    var messageId = askJson["id"];
                    console.log("Verification message id: " + messageId);
                    question.requestMessageId = messageId;
                    question.setListenersAndPendingRequests(control, msg, callback);
                });
            } else {
                // Unable to get provider for this user, check if user already verified via provider
                control.messengerApi.getUserVerifications(userId, function(verificationsSuccess, verificationsJson) {
                    if(!verificationsSuccess) {
                        msg.send(question.flow.errorText);
                        return;
                    }
                    var isVerified = false;
                    var userVerifications = verificationsJson["user"];
                    for(var i in userVerifications) {
                        var verification = userVerifications[i];
                        if(verification["name"] === question.provider) {
                            isVerified = true;
                            break;
                        }
                    }
                    if(isVerified) {
                        question.flow.onAnswer(msg, question, true);
                    } else {
                        msg.send(question.flow.errorText);
                        return;
                    }
                });
            }
        });
    }

    checkAndParseAnswer(matches, message) {
        if(matches === null || !matches || message.text == null) {
            return null;
        }
        var event = message.text;
        if(event === "conversation_verification_accepted" || event === "groupchat_verification_accepted") {
            return true;
        } else if(event === "conversation_verification_rejected" || event === "groupchat_verification_rejected") {
            return false;
        }
        return null;
    }
};

// Export the classes
module.exports = {

    Answers : Answers,
    Listener : Listener,
    PendingRequest : PendingRequest,
    Control : Control,
    Flow : Flow,
    TextQuestion : TextQuestion,
    NumberQuestion : NumberQuestion,
    EmailQuestion : EmailQuestion,
    PhoneNumberQuestion : PhoneNumberQuestion,
    MentionQuestion : MentionQuestion,
    AttachmentQuestion : AttachmentQuestion,
    PolarQuestion : PolarQuestion,
    MultipleChoiceQuestion : MultipleChoiceQuestion,
    VerificationQuestion : VerificationQuestion

};