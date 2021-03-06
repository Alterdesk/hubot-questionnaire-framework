const {User, Message} = require('hubot');

const ChatTools = require('./../utils/chat-tools.js');
const Listener = require('./../listener.js');
const Logger = require('./../logger.js');
const PendingRequest = require('./../pending-request.js');
const Step = require('./../step.js');

// Class for defining questions
class Question extends Step {
    constructor(answerKey, questionText, invalidText) {
        super();
        this.answerKey = answerKey || "ANSWER_KEY";
        this.questionText = questionText || "QUESTION_TEXT";
        this.invalidText = invalidText || "INVALID_TEXT";
        this.isMultiUser = false;
        this.isCheckpoint = false;
        this.useListeners = true;
        this.usePendingRequests = false;
        this.resendOnInvalid = true;
        this.sendMessageOnStop = true;
        this.useFinalize = false;
        this.inSummary = false;
        this.questionFormatters = [];
    }

    // Set the parent flow
    setFlow(flow) {
        this.flow = flow;
    }

    // Set a format function to format given answer with
    setFormatAnswerFunction(formatAnswerFunction) {
        this.formatAnswerFunction = formatAnswerFunction;
    }

    // Set a format question text callback function
    setFormatQuestionFunction(formatQuestionFunction) {
        this.formatQuestionFunction = formatQuestionFunction;
    }

    addQuestionFormatter(formatter) {
        this.questionFormatters.push(formatter);
    }

    addQuestionFormatters(formatters) {
        this.questionFormatters = this.questionFormatters.concat(formatters);
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

    // Mark this question as a checkpoint
    setCheckpoint(checkpoint) {
        this.isCheckpoint = checkpoint;
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
    setBreakOnCount(count, stop) {
        this.breakOnCount = count;
        this.stopOnBreak = stop;
        this.isMultiUser = true;
    }

    // Stop the flow when a certain answer value, optionally set an answer value by key
    setStopOnValue(value, sendMessage, setAnswerKey, setAnswerValue) {
        this.stopOnValue = value;
        this.sendMessageOnStop = sendMessage;
        this.onStopAnswerKey = setAnswerKey;
        this.onStopAnswerValue = setAnswerValue;
    }

    // Stop the flow when an answer matches the given regex, optionally set an answer value by key
    setStopOnRegex(regex, sendMessage, setAnswerKey, setAnswerValue) {
        this.stopOnRegex = regex;
        this.sendMessageOnStop = sendMessage;
        this.onStopAnswerKey = setAnswerKey;
        this.onStopAnswerValue = setAnswerValue;
    }

    // Set a summary callback function to trigger after every user answer
    setMultiUserSummaryFunction(multiUserSummaryFunction) {
        this.multiUserSummaryFunction = multiUserSummaryFunction;
        this.isMultiUser = true;
    }

    setInSummary(inSummary) {
        this.inSummary = inSummary;
    }

    setSummaryTitle(summaryTitle) {
        this.summaryTitle = summaryTitle;
    }

    setSummaryAnswerFormatter(summaryAnswerFormatter) {
        this.summaryAnswerFormatter = summaryAnswerFormatter;
    }

    setSummaryPart(summaryPart) {
        this.summaryPart = summaryPart;
    }

    setResendOnInvalid(resendOnInvalid) {
        this.resendOnInvalid = resendOnInvalid;
    }

    // Execute this question
    execute() {
        // Generate user id list by mentioned users
        if(this.isMultiUser && !this.userIds && this.mentionAnswerKey) {
            let mentions = this.flow.answers.get(this.mentionAnswerKey);
            if(mentions) {
                this.userIds = [];
                for(let mention of mentions) {
                    let userId = mention["id"];
                    if(typeof userId !== "string") {
                        Logger.error("Question::execute() Invalid mention user id:", userId, mention);
                        continue;
                    }
                    if(userId.toUpperCase() === "@ALL") {
                        Logger.warn("Question::execute() Skipping @All tag");
                        continue;
                    }
                    if(userId) {
                        this.userIds.push(userId);
                    }
               }
            }
        }

        // Send question text
        this.send();
    }

    // Send the message text
    send() {
        this.setListenersAndPendingRequests();
        this.flow.msg.send(this.getQuestionText());
    }

    getQuestionText() {
        let formatted;
        if(this.formatQuestionFunction != null) {
            Logger.debug("Question::getQuestionText() Formatting question with function");
            formatted = this.formatQuestionFunction(this.flow.answers);
        } else if(this.questionFormatters.length > 0) {
            Logger.debug("Question::getQuestionText() Formatting question with " + this.questionFormatters.length + " formatter(s)");
            formatted = this.questionText;
            for(let formatter of this.questionFormatters) {
                formatted = formatter.execute(formatted, this.flow);
            }
        }
        if(formatted && formatted !== "") {
            // Set formatted question as question text
            this.formattedQuestionText = formatted;
        }
        return this.formattedQuestionText || this.questionText;
    }

    getLabelForAnswer(answerValue) {
        return null;
    }

    getValueForAnswer(answerValue) {
        return null;
    }

    getRequestMessageId(userId) {
        return null;
    }

    getRemainingUserIds() {
        if(!this.userIds || this.userIds.length === 0) {
            Logger.error("Question::getRemainingUserIds() userIds is null or empty");
            return null;
        }
        if(!this.flow) {
            Logger.error("Question::getRemainingUserIds() Flow is null");
            return null;
        }
        let answerKey = this.getAnswerKey();
        let parsedUserIds = this.flow.parsedMultiUserAnswers[answerKey];
        if(!parsedUserIds || parsedUserIds.length === 0) {
            return this.userIds;
        }
        let multiAnswers = this.flow.answers.get(answerKey);
        if(!multiAnswers) {
            return this.userIds;
        }

        let remainingUserIds = [];
        for(let userId of this.userIds) {
            let answerValue = multiAnswers.get(userId);
            if(answerValue != null && parsedUserIds[userId]) {
                continue;
            }
            remainingUserIds.push(userId);
        }
        if(remainingUserIds.length === 0) {
            Logger.error("Question::getRemainingUserIds() Resulting user id list is empty");
        }
        return remainingUserIds;
    }

    // Set the Listeners and PendingRequests for this Question
    setListenersAndPendingRequests() {
        // Check if listeners or pending requests should be added
        if(!this.useListeners && !this.usePendingRequests) {
            return;
        }
        let control = this.flow.control;
        let msg = this.flow.msg;

        // Check if the question should be asked to multiple users
        if(this.isMultiUser && this.userIds && this.userIds.length > 0) {
            let remainingUserIds = this.getRemainingUserIds();
            // Check if user id list is available and not empty
            if(remainingUserIds && remainingUserIds.length > 0) {
                this.timedOut = false;
                this.multiUserMessages = [];

                let configuredTimeoutCallback = this.timeoutCallback;

                this.timeoutCallback = () => {
                    // Check if question was already timed out
                    if(this.timedOut) {
                        return;
                    }
                    // Mark question as timed out
                    this.timedOut = true;
                    // Trigger timeout callback
                    if(configuredTimeoutCallback) {
                        configuredTimeoutCallback();
                    } else {
                        let useTimeoutText = this.timeoutText;
                        if(useTimeoutText == null) {
                            useTimeoutText = control.responseTimeoutText;
                        }
                        if(useTimeoutText && useTimeoutText.length > 0) {
                            this.flow.sendRestartMessage(useTimeoutText);
                        }
                        this.flow.stop(false);
                    }
                };

                // Create listener for every user id
                for(let userId of remainingUserIds) {
                    // Create Message for each user id in list
                    let user = new User(userId);
                    let userMessage = new Message(user);
                    userMessage.room = msg.message.room;

                    // Store for cleanup if needed
                    this.multiUserMessages.push(userMessage);

                    if(control.questionAskedCallback) {
                        control.questionAskedCallback(userId, this.answerKey, this.flow.answers, this);
                    }

                    let chatUserKey = ChatTools.messageToChatUserKey(userMessage);
                    if(this.useListeners) {
                        // Add listener for user and wait for answer
                        control.addListener(chatUserKey, new Listener(msg, this.flow.callback, this));
                    }
                    if(this.usePendingRequests) {
                        // Add listener for user and wait for answer
                        control.addPendingRequest(chatUserKey, new PendingRequest(msg, this.flow.callback, this));
                    }
                }
                return;
            }
            Logger.error("Question::setListenersAndPendingRequests() Empty userId list for multi-user question");
            this.flow.stop(true, true);
            return;
        }

        if(control.questionAskedCallback) {
            let userId = ChatTools.getUserId(msg.message.user);
            let answerKey = this.getAnswerKey();
            control.questionAskedCallback(userId, answerKey, this.flow.answers, this);
        }

        let chatUserKey = ChatTools.messageToChatUserKey(msg.message);
        if(this.useListeners) {
            // Add listener for single user and wait for answer
            control.addListener(chatUserKey, new Listener(msg, this.flow.callback, this));
        }
        if(this.usePendingRequests) {
            // Add a pending request for single user and wait for answer
            control.addPendingRequest(chatUserKey, new PendingRequest(msg, this.flow.callback, this));
        }
    }

    // Clean up question if timed out or stopped
    cleanup(chatUserKey) {
        if(chatUserKey) {
            this.flow.control.removeListener(chatUserKey);
            this.flow.control.removePendingRequest(chatUserKey);
        }
        if(this.multiUserMessages != null) {
            for(let userMessage of this.multiUserMessages) {
                let chatUserKey = ChatTools.messageToChatUserKey(userMessage);
                this.flow.control.removeListener(chatUserKey);
                this.flow.control.removePendingRequest(chatUserKey);
            }
        }
    }

    // Answer given by the user is parsed and checked here
    checkAndParseAnswer(matches, message) {
        return null;
    }

    // Asynchronously retrieve data after the question is done
    async finalize(answers, callback) {
        callback();
    }

    // Reset the question to be asked again
    reset() {
        super.reset();
        this.formattedQuestionText = null;
        let labelKey = this.getLabelAnswerKey();
        this.flow.answers.remove(labelKey);
        let valueKey = this.getValueAnswerKey();
        this.flow.answers.remove(valueKey);
    }
}

module.exports = Question;
