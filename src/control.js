const {TextMessage, EnterMessage, LeaveMessage, TopicMessage} = require('hubot');

const BotApi = require('./bot-api.js');
const ChatTools = require('./utils/chat-tools.js');
const Logger = require('./logger.js');
const MessengerClient = require('./clients/messenger-client.js');
const RegexTools = require('./utils/regex-tools.js');
const SendMessageData = require('./containers/send-message-data.js');

// Class to control the questionnaires with
class Control {
    constructor() {
        // Listeners for active questionnaires
        this.pendingListeners = {};

        // Pending requests for active questionnaires
        this.pendingRequests = {};

        // Timeout timers for active questionnaires
        this.timeoutTimers = {};

        // Timeout timers for absent users
        this.presenceTimeoutTimers = {};

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
        this.robotMentionRegex = null;

        // Response timeout milliseconds
        this.responseTimeoutMs = parseInt(process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT || 60000);
        // Response timeout text to send on timeout
        this.responseTimeoutText = process.env.HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT_TEXT || "RESPONSE_TIMEOUT_TEXT";

        // Presence timeout milliseconds
        this.presenceTimeoutMs = parseInt(process.env.HUBOT_QUESTIONNAIRE_PRESENCE_TIMEOUT || 0);
        // Presence timeout text to send on timeout
        this.presenceTimeoutText = process.env.HUBOT_QUESTIONNAIRE_PRESENCE_TIMEOUT_TEXT || "PRESENCE_TIMEOUT_TEXT";

        // Need to mention robot in group to trigger command
        this.needMentionInGroup = process.env.HUBOT_QUESTIONNAIRE_NEED_MENTION_IN_GROUP || false;

        // Catch commands that are not present in the accepted commands list
        this.catchAllCommands = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL || false;
        // Catch all text to send on unaccepted command
        this.catchAllText = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_TEXT || "COMMAND_NOT_FOUND_TEXT";
        // Start command when unknown command is catched and only one command is available
        this.catchAllStartCommand = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_START_COMMAND || false;
        // Use the catch all in group, even when not mentioned
        this.catchAllNoMentionInGroup = process.env.HUBOT_QUESTIONNAIRE_CATCH_ALL_NO_MENTION_IN_GROUP || false;

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
        this.typingDelayMs = parseInt(process.env.HUBOT_ALTERDESK_TYPING_DELAY || 500);

        this.messengerClient = new MessengerClient(this);
    }

    // Override the default receiver
    overrideReceiver(robot) {
        // Check if robot receiver is already overridden
        if(robot.defaultRobotReceiver != null) {
            Logger.error("Control::overrideReceiver() Robot receiver already overridden!");
            return;
        }
        this.robot = robot;
        this.botApi = new BotApi(robot, this);

        // Store default robot receiver in separate variable
        robot.defaultRobotReceiver = robot.receive;

        // Override receive function
        robot.receive = (message) => {
            Logger.debug("Control::receive() Message:", message);

            if(this.robotMentionRegex == null && robot.user != null) {
                // Set the robot mention tag regex
                this.robotMentionRegex = new RegExp("\\[mention=" + robot.user.id + "\\]+", 'i');
            }

            let className;
            if(message.constructor != null) {
                className = message.constructor.name;
            } else {
                className = null;
                Logger.error("Control::receive() Unable to retrieve classname for: ", message);
            }

            if(className === "TopicMessage" || message instanceof TopicMessage) {
                let event = message.text;
                Logger.debug("Control::receive() TopicMessage: \"" + event + "\"");
                if(event === "authenticated") {
                    if(this.authenticatedCallback) {
                        this.authenticatedCallback(message.id);
                    }
                } else if(event === "typing" || event === "stop_typing") {
                    if(this.typingCallback) {
                        let userId = ChatTools.getUserId(message.user);
                        let isGroup = ChatTools.isUserInGroup(message.user);
                        this.typingCallback(userId, event === "typing", message.room, isGroup);
                    }
                } else if(event === "presence_update") {
                    if(this.presenceCallback) {
                        this.presenceCallback(message.user.id, message.id);
                    }
                } else if(event === "new_conversation" || message.text === "new_groupchat") {
                    if(this.newChatCallback) {
                        this.newChatCallback(message.id, message.text === "new_groupchat");
                    }
                } else if(event === "groupchat_removed") {
                    this.removeGroupActiveQuestionnaires(message.id);
                    if(this.removedFromChatCallback) {
                        this.removedFromChatCallback(message.id);
                    }
                } else if(event === "groupchat_closed") {
                    this.removeGroupActiveQuestionnaires(message.id);
                    if(this.closedChatCallback) {
                        this.closedChatCallback(message.id);
                    }
                } else if(event === "conversation_message_liked" || event === "groupchat_message_liked") {
                    if(this.messageLikedCallback) {
                        let userId = ChatTools.getUserId(message.user);
                        let isGroup = ChatTools.isUserInGroup(message.user);
                        this.messageLikedCallback(userId, message.id, message.room, isGroup);
                    }
                } else if(event === "conversation_message_deleted" || event === "groupchat_message_deleted") {
                    if(this.messageDeletedCallback) {
                        let userId = ChatTools.getUserId(message.user);
                        let isGroup = ChatTools.isUserInGroup(message.user);
                        this.messageDeletedCallback(userId, message.id, message.room, isGroup);
                    }
                } else if(event === "conversation_verification_accepted" || event === "conversation_verification_rejected"
                    || event === "groupchat_verification_accepted" || event === "groupchat_verification_rejected") {
                    let chatUserKey = ChatTools.messageToChatUserKey(message);
                    if(this.hasPendingRequest(chatUserKey)) {
                        let pendingRequest = this.removePendingRequest(chatUserKey);
                        pendingRequest.call(message);
                    }
                    if(this.verificationCallback) {
                        let userId = ChatTools.getUserId(message.user);
                        let isGroup = ChatTools.isUserInGroup(message.user);
                        let accepted = event === "conversation_verification_accepted" || event === "groupchat_verification_accepted";
                        this.verificationCallback(userId, message.id, message.room, isGroup, accepted);
                    }
                } else if(event === "conversation_question_answer" || event === "groupchat_question_answer") {
                    let chatUserKey = ChatTools.messageToChatUserKey(message);
                    if(this.hasPresenceTimeoutTimer(chatUserKey)) {
                        this.removePresenceTimeoutTimer(chatUserKey);
                    }
                    if(this.hasPendingRequest(chatUserKey)) {
                        let pendingRequest = this.removePendingRequest(chatUserKey);
                        pendingRequest.call(message);
                    } else if(message.id) {
                        this.checkCommandButton(message);
                    }
                    if(this.questionCallback && message.id) {
                        let userId = ChatTools.getUserId(message.user);
                        let isGroup = ChatTools.isUserInGroup(message.user);
                        let messageId = message.id["message_id"];
                        let options = message.id["options"];
                        if(messageId && options) {
                            this.questionCallback(userId, messageId, message.room, isGroup, options);
                        }
                    }
                } else if(event === "groupchat_members_added" || event === "groupchat_members_removed") {
                    let userId = ChatTools.getUserId(message.user);
                    let chatId = message.room;
                    let users = message.id["users"];
                    let added = event === "groupchat_members_added";
                    if(!added) {
                        for(let user of users) {
                            let chatUserKey = ChatTools.getChatUserKey(chatId, user["id"]);
                            if(this.hasActiveQuestionnaire(chatUserKey)) {
                                this.removeActiveQuestionnaire(chatUserKey);
                            }
                        }
                    }
                    if(this.groupMemberCallback) {
                        this.groupMemberCallback(chatId, added, userId, users);
                    }
                } else if(event === "groupchat_subscribed" || event === "groupchat_unsubscribed") {
                    if(this.groupSubscribedCallback) {
                        this.groupSubscribedCallback(message.id, event === "groupchat_subscribed");
                    }
                }
                if(this.catchTopics) {
                    return;
                }
            } else if(className === "TextMessage" || message instanceof TextMessage) {
                Logger.debug("Control::receive() TextMessage: \"" + message.text + "\"");
                let chatUserKey = ChatTools.messageToChatUserKey(message);
                if(this.hasPresenceTimeoutTimer(chatUserKey)) {
                    this.removePresenceTimeoutTimer(chatUserKey);
                }

                // Check for listeners waiting for a message
                if (this.hasListener(chatUserKey)) {
                    let listener = this.removeListener(chatUserKey);
                    listener.call(message);
                    return;
                }

                if(this.hasActiveQuestionnaire(chatUserKey)) {
                    Logger.debug("Control::receive() Ignoring message, has active questionnaire for user in chat");
                    return;
                }

                let userId = ChatTools.getUserId(message.user);
                let isGroup = ChatTools.isUserInGroup(message.user);
                let commandString = message.text.toLowerCase();

                let isMentioned;
                if(this.robotMentionRegex != null) {
                    let mentionMatch = commandString.match(this.robotMentionRegex);
                    if(mentionMatch) {
                        commandString = commandString.replace(mentionMatch[0], "");
                    }
                    isMentioned = mentionMatch != null;
                } else {
                    isMentioned = false;
                }

                // Only listen for messages in groups when mentioned
                if(isGroup && !isMentioned && this.needMentionInGroup) {
                    // Ignoring message, not mentioned and no listeners for user in chat
                    Logger.debug("Control::receive() Ignoring message, not mentioned when needed and no listeners for user in chat");
                    return;
                }

                // Check if the user has sent the help command
                if(this.catchHelpCommand && commandString.match(this.helpRegex) != null) {
                    Logger.debug("Control::receive() Help detected");
                    this.sendHelpMessage(message);
                    return;
                }

                // Check if an accepted command was sent
                let unknownCommand = true;
                for(let regex of this.acceptedRegex) {
                    let match = commandString.match(regex);
                    if(match != null) {
                        unknownCommand = false;
                        Logger.debug("Control::receive() Command detected: \"" + match + "\"");
                        break;
                    }
                }

                // Stop if catch all is enabled and an unknown command was sent
                if(this.catchAllCommands && unknownCommand) {
                    if(this.catchAllStartCommand
                            && (!isGroup || isMentioned || this.catchAllNoMentionInGroup)
                            && this.acceptedCommands.length === 1) {
                        let accepted = this.acceptedCommands[0];
                        Logger.debug("Control::receive() Catched unknown command, changed to \"" + accepted + "\"");
                        message.catchedText = message.text;
                        message.text = accepted;
                    } else {
                        if(!isGroup || isMentioned) {
                            Logger.debug("Control::receive() Catched unknown command");
                            this.sendCatchAllMessage(message);
                        } else {
                            Logger.debug("Control::receive() Ignoring unknown command in group");
                        }
                        return;
                    }
                }

            } else if(className === "EnterMessage" || message instanceof EnterMessage) {
                let userId = message.user.id;
                Logger.debug("Control::receive() Enter detected: " + userId);
                let chatUserKeys = this.getUserActiveChatUserKeys(userId);
                for(let chatUserKey of chatUserKeys) {
                    if(this.hasPresenceTimeoutTimer(chatUserKey)) {
                        this.removePresenceTimeoutTimer(chatUserKey);
                    }
                }
            } else if(className === "LeaveMessage" || message instanceof LeaveMessage) {
                let userId = message.user.id;
                Logger.debug("Control::receive() Leave detected: " + userId);
                if(this.removeListenerOnLeave) {
                    let chatUserKeys = this.getUserActiveChatUserKeys(userId);
                    for(let chatUserKey of chatUserKeys) {
                        if(this.hasListener(chatUserKey)) {
                            this.removeListener(chatUserKey);
                        }
                        if(this.hasPendingRequest(chatUserKey)) {
                            this.removePendingRequest(chatUserKey);
                        }
                    }
                } else if(this.presenceTimeoutMs > 0) {
                    let chatUserKeys = this.getUserActiveChatUserKeys(userId);
                    for(let chatUserKey of chatUserKeys) {
                        if(!this.hasPresenceTimeoutTimer(chatUserKey)) {
                            this.addPresenceTimeoutTimer(chatUserKey);
                        }
                    }
                }
            }

            // Pass through default robot receiver
            Logger.debug("Control::receive() Passing through to default receiver");
            return robot.defaultRobotReceiver(message);
        };
    }

    // Add a listeners for followup questions
    addListener(chatUserKey, listener) {
        listener.configure(this);
        Logger.debug("Control::addListener() key: " + chatUserKey);
        this.pendingListeners[chatUserKey] = listener;
        if(!this.hasResponseTimeoutTimer(chatUserKey)) {
            this.addResponseTimeoutTimer(chatUserKey, listener.msg, listener.question);
        }
    }

    // Remove a listener that was added before
    removeListener(chatUserKey) {
        if(this.pendingListeners[chatUserKey] == null) {
            return null;
        }
        Logger.debug("Control::removeListener() key: " + chatUserKey);
        let listener = this.pendingListeners[chatUserKey];
        delete this.pendingListeners[chatUserKey];
        if(this.hasResponseTimeoutTimer(chatUserKey)) {
            this.removeResponseTimeoutTimer(chatUserKey, listener.question);
        }
        return listener;
    }

    // Check if a listener is present for a user in a chat
    hasListener(chatUserKey) {
        return this.pendingListeners[chatUserKey] != null;
    }

    // Add a pending request for a user
    addPendingRequest(chatUserKey, pendingRequest) {
        Logger.debug("Control::addPendingRequest() key: " + chatUserKey);
        this.pendingRequests[chatUserKey] = pendingRequest;
        if(!this.hasResponseTimeoutTimer(chatUserKey)) {
            this.addResponseTimeoutTimer(chatUserKey, pendingRequest.msg, pendingRequest.question);
        }
    }

    // Remove a pending request for a user
    removePendingRequest(chatUserKey) {
        if(this.pendingRequests[chatUserKey] == null) {
            return null;
        }
        Logger.debug("Control::removePendingRequest() key: " + chatUserKey);
        let pendingRequest = this.pendingRequests[chatUserKey];
        delete this.pendingRequests[chatUserKey];
        if(this.hasResponseTimeoutTimer(chatUserKey)) {
            this.removeResponseTimeoutTimer(chatUserKey, pendingRequest.question);
        }
        return pendingRequest;
    }

    // Check if a pending request is present for a user in a chat
    hasPendingRequest(chatUserKey) {
        return this.pendingRequests[chatUserKey] != null;
    }

    // Add a response timeout timer for a user
    addResponseTimeoutTimer(chatUserKey, msg, question) {
        Logger.debug("Control::addResponseTimeoutTimer() key: " + chatUserKey);
        // Timeout milliseconds and callback
        let useTimeoutMs = question.timeoutMs || this.responseTimeoutMs;
        let useTimeoutText = question.timeoutText;
        if(useTimeoutText == null) {
            useTimeoutText = this.responseTimeoutText;
        }
        let useTimeoutCallback = question.timeoutCallback;
        if(!useTimeoutCallback && useTimeoutText && useTimeoutText.length > 0) {
            Logger.debug("Control::addResponseTimeoutTimer() ms: " + useTimeoutMs + " text: " + useTimeoutText);
            useTimeoutCallback = () => {
                question.flow.sendRestartMessage(useTimeoutText);
            };
        } else if(useTimeoutCallback != null) {
            Logger.debug("Control::addResponseTimeoutTimer() Using custom callback");
        }

        this.timeoutTimers[chatUserKey] = setTimeout(() => {
            Logger.debug("Response timer timeout: key: " + chatUserKey);
            let flow = this.getActiveQuestionnaire(chatUserKey);
            if(!flow) {
                Logger.error("Unable to retrieve flow on response timer timeout: key: " + chatUserKey);
                return;
            }
            flow.stop(false);
            if(this.questionnaireTimedOutCallback) {
                let userId = ChatTools.getUserId(flow.msg.message.user);
                this.questionnaireTimedOutCallback(userId, flow.answers);
            }
            // Call timeout callback
            if(useTimeoutCallback) {
                useTimeoutCallback();
            }
        }, useTimeoutMs);
    }

    // Remove a response timeout timer for a user
    removeResponseTimeoutTimer(chatUserKey) {
        if(this.timeoutTimers[chatUserKey] == null) {
            return;
        }
        Logger.debug("Control::removeResponseTimeoutTimer() key: " + chatUserKey);
        let timer = this.timeoutTimers[chatUserKey];
        delete this.timeoutTimers[chatUserKey];
        clearTimeout(timer);
    }

    // Check if a response timeout timer is present for a user in a chat
    hasResponseTimeoutTimer(chatUserKey) {
        return this.timeoutTimers[chatUserKey] != null;
    }

    // Add a presence timeout timer for a user
    addPresenceTimeoutTimer(chatUserKey) {
        Logger.debug("Control::addPresenceTimeoutTimer() key: " + chatUserKey);
        // Timeout milliseconds and callback
        this.presenceTimeoutTimers[chatUserKey] = setTimeout(() => {
            Logger.debug("Presence timer timeout: key: " + chatUserKey);
            let flow = this.getActiveQuestionnaire(chatUserKey);
            if(!flow) {
                Logger.error("Unable to retrieve flow on presence timer timeout: key: " + chatUserKey);
                return;
            }
            flow.stop(false);
            if(this.questionnaireTimedOutCallback) {
                let userId = ChatTools.getUserId(flow.msg.message.user);
                this.questionnaireTimedOutCallback(userId, flow.answers);
            }
            flow.sendRestartMessage(this.presenceTimeoutText);

        }, this.presenceTimeoutMs);
    }

    // Remove a presence timeout timer for a user
    removePresenceTimeoutTimer(chatUserKey) {
        if(this.presenceTimeoutTimers[chatUserKey] == null) {
            return;
        }
        Logger.debug("Control::removePresenceTimeoutTimer() key: " + chatUserKey);
        let timer = this.presenceTimeoutTimers[chatUserKey];
        delete this.presenceTimeoutTimers[chatUserKey];
        clearTimeout(timer);
    }

    // Check if a presence timeout timer is present for a user in a chat
    hasPresenceTimeoutTimer(chatUserKey) {
        return this.presenceTimeoutTimers[chatUserKey] != null;
    }

    addActiveQuestionnaire(chatUserKey, flow) {
        if(this.activeQuestionnaires[chatUserKey]) {
            Logger.error("Control::addActiveQuestionnaire() Already have an active questionnaire for key: " + chatUserKey);
            return;
        }
        Logger.debug("Control::addActiveQuestionnaire() key: " + chatUserKey + " flow: " + flow.name);
        this.activeQuestionnaires[chatUserKey] = flow;
        let count = this.getActiveQuestionnaireCount();
        Logger.debug("Control::addActiveQuestionnaire() Active questionnaires: " + count);
        if(this.addedActiveQuestionnaireCallback) {
            this.addedActiveQuestionnaireCallback(chatUserKey, count);
        }
    }

    getActiveQuestionnaire(chatUserKey) {
        return this.activeQuestionnaires[chatUserKey];
    }

    getGroupActiveChatUserKeys(chatId) {
        let chatUserKeys = [];
        for(let chatUserKey in this.activeQuestionnaires) {
            if(chatUserKey.indexOf("groupchat/" + chatId) !== -1) {
                chatUserKeys.push(chatUserKey);
            }
        }
        return chatUserKeys;
    }

    getUserActiveChatUserKeys(userId) {
        let chatUserKeys = [];
        let suffix = "/" + userId;
        for(let chatUserKey in this.activeQuestionnaires) {
            if(chatUserKey.endsWith(suffix)) {
                chatUserKeys.push(chatUserKey);
            }
        }
        return chatUserKeys;
    }

    hasActiveQuestionnaire(chatUserKey) {
        return this.getActiveQuestionnaire(chatUserKey) != null;
    }

    getActiveQuestionnaires() {
        return Object.keys(this.activeQuestionnaires);
    }

    getActiveQuestionnaireCount() {
        return this.getActiveQuestionnaires().length;
    }

    removeActiveQuestionnaire(chatUserKey) {
        let flow = this.activeQuestionnaires[chatUserKey];
        if(!flow) {
            Logger.error("Control::removeActiveQuestionnaire() No active questionnaire for key: " + chatUserKey);
            return null;
        }
        Logger.debug("Control::removeActiveQuestionnaire() key: " + chatUserKey + " flow: " + flow.name);
        delete this.activeQuestionnaires[chatUserKey];
        this.removeListener(chatUserKey);
        this.removePendingRequest(chatUserKey);
        this.removeResponseTimeoutTimer(chatUserKey);
        this.removePresenceTimeoutTimer(chatUserKey);
        let count = this.getActiveQuestionnaireCount();
        Logger.debug("Control::removeActiveQuestionnaire() Active questionnaires: " + count);
        if(this.removedActiveQuestionnaireCallback) {
            this.removedActiveQuestionnaireCallback(chatUserKey, count);
        }
        if(count === 0 && this.exitOnIdle) {
            Logger.debug("Control::removeActiveQuestionnaire() Exit on idle was armed, exiting");
            process.exit(0);
        }
        return flow;
    }

    removeGroupActiveQuestionnaires(chatId) {
        let chatUserKeys = this.getGroupActiveChatUserKeys(chatId);
        if(chatUserKeys.length === 0) {
            return;
        }
        Logger.debug("Control::removeGroupActiveQuestionnaires() Removing " + chatUserKeys.length + " questionnaires from chat: " + chatId);
        for(let chatUserKey of chatUserKeys) {
            this.removeActiveQuestionnaire(chatUserKey);
        }
    }

    removeUserActiveQuestionnaires(userId) {
        let chatUserKeys = this.getUserActiveChatUserKeys(userId);
        if(chatUserKeys.length === 0) {
            return;
        }
        Logger.debug("Control::removeGroupActiveQuestionnaires() Removing " + chatUserKeys.length + " questionnaires from user: " + userId);
        for(let chatUserKey of chatUserKeys) {
            this.removeActiveQuestionnaire(chatUserKey);
        }
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

    // Presence timeout configuration
    setPresenceTimeoutText(t) {
        this.presenceTimeoutText = t;
    }
    setPresenceTimeoutMs(ms) {
        this.presenceTimeoutMs = ms;
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

    setCatchAllNoMentionInGroup(no) {
        this.catchAllNoMentionInGroup = no;
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

    // Callback that is called when a questionnaire is started
    setAddedActiveQuestionnaireCallback(addedActiveQuestionnaireCallback) {
        this.addedActiveQuestionnaireCallback = addedActiveQuestionnaireCallback;
    }

    // Callback that is called when a questionnaire is stopped
    setRemovedActiveQuestionnaireCallback(removedActiveQuestionnaireCallback) {
        this.removedActiveQuestionnaireCallback = removedActiveQuestionnaireCallback;
    }

    // Should a listener for a user be removed when a leave is detected
    setRemoveListenerOnLeave(remove) {
        this.removeListenerOnLeave = remove;
    }

    // Add commands that the overridden receiver will accept
    addAcceptedCommands(commands) {
        for(let command of commands) {
            this.addAcceptedCommand(command);
        }
    }

    // Add a command that the overridden receiver will accept
    addAcceptedCommand(command, helpText, buttonLabel, buttonStyle) {
        let c = command.toLowerCase();
        for(let accepted of this.acceptedCommands) {
            if(c === accepted) {
                Logger.error("Control::addAcceptedCommand() Command already configured as accepted: " + c);
                return;
            }
        }
        Logger.debug("Control::addAcceptedCommand() Command configured as accepted: " + c);
        this.acceptedCommands.push(c);
        this.acceptedRegex.push(RegexTools.getStartCommandRegex(c));
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

    setOverrideHelpCallback(overrideHelpCallback) {
        this.overrideHelpCallback = overrideHelpCallback;
    }

    setOverrideCatchAllCallback(overrideCatchAllCallback) {
        this.overrideCatchAllCallback = overrideCatchAllCallback;
    }

    // Check if the received answer was a command and trigger it if so
    async checkCommandButton(message) {
        let acceptedCommand = false;
        let options = message.id["options"];
        let optionText = "";
        for(let option of options) {
            if(optionText.length > 0) {
                optionText += ",";
            }
            optionText += option;
        }
        let helpCommand = optionText.match(this.helpRegex);
        if(!helpCommand) {
            for(let command of this.acceptedCommands) {
                if(optionText === command) {
                    acceptedCommand = true;
                    break;
                }
            }
            if(!acceptedCommand && !this.catchAllCommands) {
                Logger.warn("Control:checkCommandButton() Not an accepted command: \"" + optionText + "\"");
                return;
            }
        }
        let userId = ChatTools.getUserId(message.user);
        let chatId = message.room;
        let isGroup = ChatTools.isUserInGroup(message.user);
        let messageId = message.id["message_id"];

        let messageJson = await this.messengerClient.getMessage(messageId, chatId, isGroup, false);
        if(!messageJson) {
            Logger.error("Control::checkCommandButton() Unable to retrieve request message on checkCommandButton");
            return;
        }
        let user = messageJson["user"];
        if(!user) {
            Logger.error("Control::checkCommandButton() Retrieved invalid user on checkCommandButton:", messageJson);
            return;
        }
        let id = user["id"];
        if(id !== this.robot.user.id) {
            Logger.warn("Control::checkCommandButton() User id is not robot id on checkCommandButton:", this.robot.user.id, messageJson);
            return;
        }
        if(helpCommand) {
            Logger.debug("Control:checkCommandButton() Sending help message");
            this.sendHelpMessage(message);
            return;
        }
        if(!acceptedCommand) {
            Logger.debug("Control:checkCommandButton() Not an accepted command, catch all enabled: \"" + optionText + "\"");
        } else {
            Logger.debug("Control:checkCommandButton() Accepted command: \"" + optionText + "\"");
        }
        let textMessage = ChatTools.createHubotTextMessage(userId, chatId, isGroup, optionText);
        this.robot.receive(textMessage);
    }

    // Send the help message
    sendHelpMessage(message) {
        if(this.overrideHelpCallback) {
            Logger.debug("Control:sendHelpMessage() Using override help callback");
            this.overrideHelpCallback(message);
            return;
        }
        let helpText = this.catchHelpText;
        for(let field in this.acceptedHelpTexts) {
            helpText += "\n • \'" + field + "\' - " + this.acceptedHelpTexts[field];
        }
        let sendMessageData = new SendMessageData();
        sendMessageData.setHubotMessage(message);
        sendMessageData.setMessage(helpText);
        if(Object.keys(this.acceptedButtonLabels).length > 0) {
            let style = this.helpQuestionStyle || "horizontal";
            sendMessageData.setRequestOptions(false, style);
            for(let key in this.acceptedButtonLabels) {
                let buttonStyle = this.acceptedButtonStyles[key];
                sendMessageData.addQuestionButtonWithName(key, this.acceptedButtonLabels[key], buttonStyle);
            }
            sendMessageData.addRequestUserId(ChatTools.getUserId(message.user));
        }
        this.sendRequestMessage(sendMessageData);
    }

    // Send the catch all message
    sendCatchAllMessage(message) {
        if(this.overrideCatchAllCallback) {
            Logger.debug("Control:sendHelpMessage() Using override catch all callback");
            this.overrideCatchAllCallback(message);
            return;
        }
        let sendMessageData = new SendMessageData();
        sendMessageData.setHubotMessage(message);
        sendMessageData.setMessage(this.catchAllText);
        if(this.catchAllButtonName && this.catchAllButtonLabel) {
            let style = this.catchAllButtonStyle || "theme";
            sendMessageData.addQuestionButtonWithName(this.catchAllButtonName, this.catchAllButtonLabel, style);
            sendMessageData.addRequestUserId(ChatTools.getUserId(message.user));
        }
        this.sendRequestMessage(sendMessageData);
    }

    // Send a request message
    async sendRequestMessage(sendMessageData) {
        let response = ChatTools.hubotMessageToResponse(this.robot, sendMessageData.getHubotMessage());
        if(sendMessageData.usePostCall()) {
            this.sendComposing(response);

            let result = await this.messengerClient.sendMessage(sendMessageData);
            if(!result) {
                response.send(sendMessageData.getMessage());
            }
        } else {
            response.send(sendMessageData.getMessage());
        }
    }

    sendComposing(msg) {
        if(!this.typingDelayMs || this.typingDelayMs < 1) {
            return;
        }
        if(!msg) {
            Logger.error("Control:sendComposing() Invalid message:", msg);
            return;
        }
        if(!msg.topic) {
            Logger.debug("Control:sendComposing() Converting msg to hubot response");
            msg = ChatTools.hubotMessageToResponse(this.robot, msg);
        }
        msg.topic("typing");
        setTimeout(() => {
            msg.topic("stop_typing");
        }, this.typingDelayMs);
    }

    armExitOnIdle(arm) {
        Logger.debug("Control::armExitOnIdle() arm: " + arm);
        this.exitOnIdle = arm;
        return this.getActiveQuestionnaireCount() === 0;
    }
}

module.exports = Control;
