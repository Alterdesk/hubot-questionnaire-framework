const {Response, User, Message, TextMessage, LeaveMessage, TopicMessage} = require('hubot');
const Extra = require('node-messenger-extra');

const Logger = require('./logger.js');

// Optional dependency, only loaded when Control.setMessengerApi() was called
var Messenger;

// Class to control the questionnaires with
class Control {
    constructor() {
        // Listeners for active questionnaires
        this.pendingListeners = {};

        // Pending requests for active questionnaires
        this.pendingRequests = {};

        // Timeout timers for active questionnaires
        this.timeoutTimers = {};

        // Active questionnaires
        this.activeQuestionnaires = {};

        // Accepted commands
        this.acceptedCommands = [];
        this.acceptedRegex = [];
        this.acceptedHelpTexts = {};
        this.acceptedButtonLabels = {};
        this.acceptedButtonStyles = {};

        // Regular expressions
        this.stopRegex = new RegExp(/^[ \n\r\t]*stop[ \n\r\t]*$/, 'gi');
        this.backRegex = null;//new RegExp(/^[ \n\r\t]*back[ \n\r\t]*$/, 'gi');
        this.checkpointRegex = null;//new RegExp(/^[ \n\r\t]*checkpoint[ \n\r\t]*$/, 'gi');
        this.helpRegex = new RegExp(/^[ \n\r\t]*help[ \n\r\t]*$/, 'gi');
        this.robotUserId;
        this.robotMentionRegex;

        // Response timeout milliseconds
        this.responseTimeoutMs = parseInt(process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT || 60000);
        // Response timeout text to send on timeout
        this.responseTimeoutText = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT_TEXT || "RESPONSE_TIMEOUT_TEXT";

        // Need to mention robot in group to trigger command
        this.needMentionInGroup = process.env.HUBOT_QUESTIONNAIRE_NEED_MENTION_IN_GROUP || false;

        // Catch commands that are not present in the accepted commands list
        this.catchAllCommands = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL || false;
        // Catch all text to send on unaccepted command
        this.catchAllText = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_TEXT || "COMMAND_NOT_FOUND_TEXT";
        // Start command when unknown command is catched and only one command is available
        this.catchAllStartCommand = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_START_COMMAND || false;

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

        // Milliseconds to show hubot as "Typing..."
        this.typingDelayMs = parseInt(process.env.HUBOT_ALTERDESK_TYPING_DELAY || 2500);
    }

    // Set the messenger api instance to use
    setMessengerApi(messengerApi) {
        try {
            Messenger = require('node-messenger-sdk');
            this.messengerApi = messengerApi;
        } catch(error) {
            Logger.error("Control::setMessengerApi() ", error);
        }
    }

    // Override the default receiver
    overrideReceiver(robot) {
        this.robot = robot;
        // Check if robot receiver is already overridden
        if(robot.defaultRobotReceiver != null) {
            Logger.error("Control::overrideReceiver() Robot receiver already overridden!")
            return;
        }

        var control = this;

        // Store robot instance
        control.robot = robot;

        // Store default robot receiver in separate variable
        robot.defaultRobotReceiver = robot.receive;

        // Override receive function
        robot.receive = (message) => {
            Logger.debug("Control::receive() Message:", message);

            if(control.robotUserId == null && robot.user != null) {
                control.robotUser = robot.user;
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
                Logger.error("Control::receive() Unable to retrieve classname for: ", message);
            }

            if(className === "TopicMessage" || message instanceof TopicMessage) {
                var event = message.text;
                Logger.debug("Control::receive() TopicMessage: \"" + event + "\"");
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
                Logger.debug("Control::receive() TextMessage: \"" + message.text + "\"");
                // Check for listeners waiting for a message
                if (control.hasListener(message)) {
                    var listener = control.removeListener(message);
                    listener.call(message);
                    return;
                }

                if(this.hasActiveQuestionnaire(message)) {
                    Logger.debug("Control::receive() Ignoring message, has active questionnaire for user in room");
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
                if(isGroup && !isMentioned && control.needMentionInGroup) {
                    // Ignoring message, not mentioned and no listeners for user in room
                    Logger.debug("Control::receive() Ignoring message, not mentioned when needed and no listeners for user in room");
                    return;
                }

                // Check if the user has sent the help command
                if(control.catchHelpCommand && commandString.match(control.helpRegex) != null) {
                    Logger.debug("Control::receive() Help detected");
                    control.sendHelpMessage(message);
                    return;
                }

                // Check if an accepted command was sent
                var unknownCommand = true;
                for(let index in control.acceptedRegex) {
                    var match = commandString.match(control.acceptedRegex[index]);
                    if(match != null) {
                        unknownCommand = false;
                        Logger.debug("Control::receive() Command detected: \"" + match + "\"");
                        break;
                    }
                }

                // Stop if catch all is enabled and an unknown command was sent
                if(control.catchAllCommands && unknownCommand) {
                    if(control.catchAllStartCommand && (!isGroup || isMentioned) && control.acceptedCommands.length === 1) {
                        var accepted = control.acceptedCommands[0];
                        Logger.debug("Control::receive() Catched unknown command, changed to \"" + accepted + "\"");
                        message.text = accepted;
                    } else {
                        if(!isGroup || isMentioned) {
                            Logger.debug("Control::receive() Catched unknown command");
                            control.sendCatchAllMessage(message);
                        } else {
                            Logger.debug("Control::receive() Ignoring unknown command in group");
                        }
                        return;
                    }
                }

            } else if(className === "LeaveMessage" || message instanceof LeaveMessage) {
                Logger.debug("Control::receive() Leave detected: " + message.user.id);
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
            Logger.debug("Control::receive() Passing through to default receiver");
            return robot.defaultRobotReceiver(message);
        };
    }

    // Add a listeners for followup questions
    addListener(message, listener) {
        listener.configure(this);
        var userId = this.getUserId(message.user);
        Logger.debug("Control::addListener() userId: " + userId + " room: " + message.room);
        this.pendingListeners[message.room + "/" + userId] = listener;
        if(!this.hasTimeoutTimer(message)) {
            this.addTimeoutTimer(message, listener.msg, listener.question);
        }
    }

    // Remove a listener that was added before
    removeListener(message) {
        var userId = this.getUserId(message.user);
        if(this.pendingListeners[message.room + "/" + userId] == null) {
            return null;
        }
        Logger.debug("Control::removeListener() userId: " + userId + " room: " + message.room);
        var listener = this.pendingListeners[message.room + "/" + userId];
        delete this.pendingListeners[message.room + "/" + userId];
        if(this.hasTimeoutTimer(message)) {
            this.removeTimeoutTimer(message, listener.question);
        }
        return listener;
    }

    // Check if a listener is present for a user in a room
    hasListener(message) {
        return this.pendingListeners[message.room + "/" + this.getUserId(message.user)] != null;
    }

    // Add a pending request for a user
    addPendingRequest(message, pendingRequest) {
        var userId = this.getUserId(message.user);
        Logger.debug("Control::addPendingRequest() userId: " + userId + " room: " + message.room);
        this.pendingRequests[message.room + "/" + userId] = pendingRequest;
        if(!this.hasTimeoutTimer(message)) {
            this.addTimeoutTimer(message, pendingRequest.msg, pendingRequest.question);
        }
    }

    // Remove a pending request for a user
    removePendingRequest(message) {
        var userId = this.getUserId(message.user);
        if(this.pendingRequests[message.room + "/" + userId] == null) {
            return null;
        }
        Logger.debug("Control::removePendingRequest() userId: " + userId + " room: " + message.room);
        var pendingRequest = this.pendingRequests[message.room + "/" + userId];
        delete this.pendingRequests[message.room + "/" + userId];
        if(this.hasTimeoutTimer(message)) {
            this.removeTimeoutTimer(message, pendingRequest.question);
        }
        return pendingRequest;
    }

    // Check if a pending request is present for a user in a room
    hasPendingRequest(message) {
        return this.pendingRequests[message.room + "/" + this.getUserId(message.user)] != null;
    }

    // Add a timeout timer for a user
    addTimeoutTimer(message, msg, question) {
        var userId = this.getUserId(message.user);
        Logger.debug("Control::addTimeoutTimer() userId: " + userId + " room: " + message.room);
        // Timeout milliseconds and callback
        var useTimeoutMs = question.timeoutMs || this.responseTimeoutMs;
        var useTimeoutText = question.timeoutText;
        if(useTimeoutText == null) {
            useTimeoutText = this.responseTimeoutText;
        }
        var useTimeoutCallback = question.timeoutCallback;
        if(useTimeoutCallback == null && useTimeoutText && useTimeoutText.length > 0) {
            Logger.debug("Control::addTimeoutTimer() ms: " + useTimeoutMs + " text: " + useTimeoutText);
            useTimeoutCallback = () => {
                question.flow.sendRestartMessage(useTimeoutText);
            };
        } else if(useTimeoutCallback != null) {
            Logger.debug("Control::addTimeoutTimer() callback: " + useTimeoutCallback);
        }

        var timer = setTimeout(() => {
            var userId = this.getUserId(msg.message.user);
            Logger.debug("Timer timeout from user " + userId + " in room " + message.room);
            question.cleanup(message);

            question.flow.stop(false);

            if(this.questionnaireTimedOutCallback) {
                var userId = this.getUserId(msg.message.user);
                this.questionnaireTimedOutCallback(userId, question.flow.answers);
            }

            // Call timeout callback
            if(useTimeoutCallback) {
                useTimeoutCallback();
            }
        }, useTimeoutMs);

        this.timeoutTimers[message.room + "/" + userId] = timer;
    }

    // Remove a timeout timer for a user
    removeTimeoutTimer(message) {
        var userId = this.getUserId(message.user);
        if(this.timeoutTimers[message.room + "/" + userId] == null) {
            return;
        }
        Logger.debug("Control::removeTimeoutTimer() userId: " + userId + " room: " + message.room);
        var timer = this.timeoutTimers[message.room + "/" + userId];
        delete this.timeoutTimers[message.room + "/" + userId];
        clearTimeout(timer);
    }

    // Check if a timeout timer is present for a user in a room
    hasTimeoutTimer(message) {
        return this.timeoutTimers[message.room + "/" + this.getUserId(message.user)] != null;
    }

    addActiveQuestionnaire(message, flow) {
        var userId = this.getUserId(message.user);
        if(this.activeQuestionnaires[message.room + "/" + userId]) {
            Logger.error("Control::addActiveQuestionnaire() Already have an active questionnaire for userId: " + userId + " room: " + message.room);
            return;
        }
        Logger.debug("Control::addActiveQuestionnaire() userId: " + userId + " room: " + message.room + " flow: " + flow.name);
        this.activeQuestionnaires[message.room + "/" + userId] = flow;
        Logger.debug("Control::addActiveQuestionnaire() Active questionnaires: " + this.getActiveQuestionnaireCount());
    }

    getActiveQuestionnaire(message) {
        return this.activeQuestionnaires[message.room + "/" + this.getUserId(message.user)];
    }

    hasActiveQuestionnaire(message) {
        return this.getActiveQuestionnaire(message) != null;
    }

    getActiveQuestionnaires() {
        return Object.keys(this.activeQuestionnaires);
    }

    getActiveQuestionnaireCount() {
        return this.getActiveQuestionnaires().length;
    }

    removeActiveQuestionnaire(message) {
        var userId = this.getUserId(message.user);
        var flow = this.activeQuestionnaires[message.room + "/" + userId];
        if(!flow) {
            Logger.error("Control::removeActiveQuestionnaire() No active questionnaire for userId: " + userId + " room: " + message.room);
            return null;
        }
        Logger.debug("Control::removeActiveQuestionnaire() userId: " + userId + " room: " + message.room + " flow: " + flow.name);
        delete this.activeQuestionnaires[message.room + "/" + userId];
        var count = this.getActiveQuestionnaireCount();
        Logger.debug("Control::removeActiveQuestionnaire() Active questionnaires: " + count);
        if(count === 0 && this.exitOnIdle) {
            Logger.debug("Control::removeActiveQuestionnaire() Exit on idle was armed, exiting");
            process.exit(0);
        }
        return flow;
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
    // Message text to send when a Flow is stopped with the stop command
    setFlowStopText(text) {
        this.flowStopText = text;
    }

    // Regex to check if user wants to correct the last question
    setBackRegex(b) {
        this.backRegex = b;
    }
    // Message text to send when going back a question with the back command
    setFlowBackText(text) {
        this.flowBackText = text;
    }

    // Regex to check if user wants to correct the last checkpoint
    setCheckpointRegex(c) {
        this.checkpointRegex = c;
    }
    // Message text to send when going back to last checkpoint with the checkpoint command
    setFlowCheckpointText(text) {
        this.flowCheckpointText = text;
    }

    // Message text to send when a flow stops with an error
    setFlowErrorText(text) {
        this.flowErrorText = text;
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

    setTypingDelayMs(ms) {
        this.typingDelayMs = ms;
    }

    // Catch all given commands and send default message when command is unknown
    setCatchAll(catchAll) {
        this.catchAllCommands = catchAll;
    }
    setCatchAllText(text) {
        this.catchAllText = text;
    }
    setCatchAllStartCommand(start) {
        this.catchAllStartCommand = start;
    }
    setCatchAllButton(name, label, style) {
        this.catchAllButtonName = name;
        this.catchAllButtonLabel = label;
        this.catchAllButtonStyle = style;
    }

    // Restart button
    setRestartButton(name, label, style) {
        this.restartButtonName = name;
        this.restartButtonLabel = label;
        this.restartButtonStyle = style;
    }

    // Configuration to override default hubot help and commands that it does accept
    setCatchHelp(catchHelp) {
        this.catchHelpCommand = catchHelp;
    }
    setCatchHelpText(text) {
        this.catchHelpText = text;
    }

    // Need to mention robot in group to trigger command
    setNeedMentionInGroup(need) {
        this.needMentionInGroup = need;
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

    // Callback that is called when a question is asked
    setQuestionAskedCallback(questionAskedCallback) {
        this.questionAskedCallback = questionAskedCallback;
    }

    // Callback that is called when a question answer is rejected
    setQuestionAnswerRejectedCallback(questionAnswerRejectedCallback) {
        this.questionAnswerRejectedCallback = questionAnswerRejectedCallback;
    }

    // Callback that is called when a question is answered
    setQuestionAnsweredCallback(questionAnsweredCallback) {
        this.questionAnsweredCallback = questionAnsweredCallback;
    }

    // Callback that is called when a action is done
    setActionDoneCallback(actionDoneCallback) {
        this.actionDoneCallback = actionDoneCallback;
    }

    // Callback that is called when a questionnaire is timed out
    setQuestionnaireTimedOutCallback(questionnaireTimedOutCallback) {
        this.questionnaireTimedOutCallback = questionnaireTimedOutCallback;
    }

    // Callback that is called when a questionnaire is going back a question or to latest checkpoint
    setQuestionnaireBackCallback(questionnaireBackCallback) {
        this.questionnaireBackCallback = questionnaireBackCallback;
    }

    // Callback that is called when a questionnaire is stopped
    setQuestionnaireStoppedCallback(questionnaireStoppedCallback) {
        this.questionnaireStoppedCallback = questionnaireStoppedCallback;
    }

    // Should a listener for a user be removed when a leave is detected
    setRemoveListenerOnLeave(remove) {
        this.removeListenerOnLeave = remove;
    }

    // Add commands that the overridden receiver will accept
    addAcceptedCommands(commands) {
        for(let index in commands) {
            this.addAcceptedCommand(commands[index]);
        }
    }

    // Add a command that the overridden receiver will accept
    addAcceptedCommand(command, helpText, buttonLabel, buttonStyle) {
        var c = command.toLowerCase();
        var configured = false;
        for(let index in this.acceptedCommands) {
            if(c === this.acceptedCommands[index]) {
                configured = true;
                break;
            }
        }
        if(configured) {
            Logger.error("Control::addAcceptedCommand() Command already configured as accepted: " + c);
            return;
        }
        Logger.debug("Control::addAcceptedCommand() Command configured as accepted: " + c);
        this.acceptedCommands.push(c);
        this.acceptedRegex.push(Extra.getStartCommandRegex(c));
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

    // Set the question payload style of the help message
    setHelpQuestionStyle(style) {
        this.helpQuestionStyle = style;
    }

    createHubotResponse(userId, chatId, isGroup) {
        var user = new User(userId);
        user.is_groupchat = isGroup;
        var message = new Message(user);
        message.room = chatId;
        return new Response(this.robot, message, true);
    }

    // Check if the received answer was a command and trigger it if so
    checkCommandButton(message) {
        if(!this.messengerApi) {
            Logger.error("Control:checkCommandButton() Messenger API instance not set");
            return;
        }
        var acceptedCommand = false;
        var options = message.id["options"];
        var optionText = "";
        for(let index in options) {
            if(optionText.length > 0) {
                optionText += ",";
            }
            optionText += options[index];
        }
        var helpCommand = optionText.match(this.helpRegex);
        if(!helpCommand) {
            for(let index in this.acceptedCommands) {
                if(optionText === this.acceptedCommands[index]) {
                    acceptedCommand = true;
                    break;
                }
            }
            if(!acceptedCommand) {
                Logger.error("Control:checkCommandButton() Not an accepted command: \"" + optionText + "\"");
                return;
            }
        }
        var userId = this.getUserId(message.user);
        var roomId = message.room;
        var isGroup = this.isUserInGroup(message.user);
        var messageId = message.id["message_id"];
        this.messengerApi.getMessage(messageId, roomId, isGroup, false, (success, json) => {
            if(!success) {
                Logger.error("Control::checkCommandButton() Unable to retrieve request message on checkCommandButton");
                return;
            }
            if(!json) {
                Logger.error("Control::checkCommandButton() Retrieved invalid json on checkCommandButton:", json);
                return;
            }
            var user = json["user"];
            if(!user) {
                Logger.error("Control::checkCommandButton() Retrieved invalid user on checkCommandButton:", json);
                return;
            }
            var id = user["id"];
            if(id !== this.robotUserId) {
                Logger.error("Control::checkCommandButton() User id is not robot id on checkCommandButton:", this.robotUserId, json);
                return;
            }
            if(helpCommand) {
                Logger.error("Control:checkCommandButton() Sending help message");
                this.sendHelpMessage(message);
            } else {
                Logger.debug("Control:checkCommandButton() Accepted command: " + optionText);
                var messageUser = new User(userId);
                messageUser.user_id = userId;
                messageUser.room = roomId;
                messageUser.name = roomId;
                messageUser.is_groupchat = isGroup;
                var textMessage = new TextMessage(messageUser, optionText, "dummy_id");
                textMessage.room = roomId;
                this.robot.receive(textMessage);
            }
        });
    }

    // Send the help message
    sendHelpMessage(message) {
        var helpText = this.catchHelpText;
        for(let field in this.acceptedHelpTexts) {
            helpText += "\n • \'" + field + "\' - " + this.acceptedHelpTexts[field];
        }
        var questionPayload;
        if(this.messengerApi && Object.keys(this.acceptedButtonLabels).length > 0) {
            questionPayload = new Messenger.QuestionPayload();
            questionPayload.multiAnswer = false;
            questionPayload.style = this.helpQuestionStyle || "horizontal";
            for(let key in this.acceptedButtonLabels) {
                var buttonStyle = this.acceptedButtonStyles[key] || "theme";
                questionPayload.addOption(key, this.acceptedButtonLabels[key], buttonStyle);
            }
            questionPayload.addUserId(this.getUserId(message.user));
        }
        this.sendRequestMessage(message, helpText, questionPayload);
    }

    // Send the catch all message
    sendCatchAllMessage(message) {
        var questionPayload;
        if(this.messengerApi && this.catchAllButtonName && this.catchAllButtonLabel) {
            questionPayload = new Messenger.QuestionPayload();
            questionPayload.multiAnswer = false;
//            questionPayload.style = "horizontal";
            var style = this.catchAllButtonStyle || "theme";
            questionPayload.addOption(this.catchAllButtonName, this.catchAllButtonLabel, style);
            questionPayload.addUserId(this.getUserId(message.user));
        }
        this.sendRequestMessage(message, this.catchAllText, questionPayload);
    }

    // Send a request message
    sendRequestMessage(message, text, questionPayload) {
        if(this.messengerApi && questionPayload) {
            var messageData = new Messenger.SendMessageData();
            messageData.message = text;
            messageData.chatId = message.room;
            messageData.isGroup = this.isUserInGroup(message.user);
            messageData.isAux = false;
            messageData.payload = questionPayload;

            var response = new Response(this.robot, message, true);
            this.sendComposing(response);

            // Send the message and parse result in callback
            this.messengerApi.sendMessage(messageData, (success, json) => {
                Logger.debug("Control::sendRequestMessage() Successful: " + success);
                if(json == null) {
                    // Fallback
                    response.send(text);
                }
            });
        } else {
            var response = new Response(this.robot, message, true);
            response.send(text);
        }
    }

    sendComposing(msg) {
        if(this.typingDelayMs) {
            msg.topic("typing");
            setTimeout(() => {
                msg.topic("stop_typing");
            }, this.typingDelayMs);
        }
    }

    createSendMessageData() {
        if(!Messenger) {
            Logger.error("Control::createSendMessageData() Messenger null");
            return null;
        }
        return new Messenger.SendMessageData()
    }

    createQuestionPayload() {
        if(!Messenger) {
            Logger.error("Control::createQuestionPayload() Messenger null");
            return null;
        }
        return new Messenger.QuestionPayload()
    }

    armExitOnIdle(arm) {
        Logger.debug("Control::armExitOnIdle() arm: " + arm);
        this.exitOnIdle = arm;
        return this.getActiveQuestionnaireCount() === 0;
    }
}

module.exports = Control;