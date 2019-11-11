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
    execute(callback) {
        // Generate user id list by mentioned users
        if(this.isMultiUser && !this.userIds && this.mentionAnswerKey) {
            var mentions = this.flow.answers.get(this.mentionAnswerKey);
            if(mentions) {
                this.userIds = [];
                for(let index in mentions) {
                    var mention = mentions[index];
                    var userId = mention["id"];
                    if(userId.toUpperCase() === "@ALL") {
                        Logger.error("Question::execute() Skipping @All tag");
                        continue;
                    }
                    if(userId) {
                        this.userIds.push(userId);
                    }
               }
            }
        }

        // Send question text
        this.send(callback);
    }

    // Send the message text
    send(callback) {
        this.setListenersAndPendingRequests(callback);
        this.flow.msg.send(this.getQuestionText());
    }

    getQuestionText() {
        var formatted;
        if(this.formatQuestionFunction != null) {
            Logger.debug("Question::getQuestionText() Formatting question with function");
            formatted = this.formatQuestionFunction(this.flow.answers);
        } else if(this.questionFormatters.length > 0) {
            Logger.debug("Question::getQuestionText() Formatting question with " + this.questionFormatters.length + " formatter(s)");
            formatted = this.questionText;
            for(let i in this.questionFormatters) {
                var formatter = this.questionFormatters[i];
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
        if(!this.userIds || this.userIds.length == 0) {
            Logger.error("Question::getRemainingUserIds() userIds is null or empty");
            return null;
        }
        if(!this.flow) {
            Logger.error("Question::getRemainingUserIds() Flow is null");
            return null;
        }
        let answerKey = this.getAnswerKey();
        let parsedUserIds = this.flow.parsedMultiUserAnswers[answerKey];
        if(!parsedUserIds || parsedUserIds.length == 0) {
            return this.userIds;
        }
        let multiAnswers = this.flow.answers.get(answerKey);
        if(!multiAnswers) {
            return this.userIds;
        }

        let remainingUserIds = [];
        for(let index in this.userIds) {
            let userId = this.userIds[index];
            let answerValue = multiAnswers.get(userId);
            if(answerValue != null && parsedUserIds[userId]) {
                continue;
            }
            remainingUserIds.push(userId);
        }
        if(remainingUserIds.length == 0) {
            Logger.error("Question::getRemainingUserIds() Resulting user id list is empty");
        }
        return remainingUserIds;
    }

    // Set the Listeners and PendingRequests for this Question
    setListenersAndPendingRequests(callback) {
        // Check if listeners or pending requests should be added
        if(!this.useListeners && !this.usePendingRequests) {
            return;
        }
        var control = this.flow.control;
        var msg = this.flow.msg;

        // Check if the question should be asked to multiple users
        if(this.isMultiUser && this.userIds && this.userIds.length > 0) {
            let remainingUserIds = this.getRemainingUserIds();
            // Check if user id list is available and not empty
            if(remainingUserIds && remainingUserIds.length > 0) {
                this.timedOut = false;
                this.multiUserMessages = [];

                var configuredTimeoutCallback = this.timeoutCallback;

                this.timeoutCallback = () => {
                    // Check if question was already timed out
                    if(this.timedOut) {
                        return;
                    }
                    // Mark question as timed out
                    this.timedOut = true;
                    // Clean up remaining listeners
                    this.cleanup(msg.message);
                    // Trigger timeout callback
                    if(configuredTimeoutCallback) {
                        configuredTimeoutCallback();
                    } else {
                        var useTimeoutText = this.timeoutText;
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
                for(let index in remainingUserIds) {
                    var userId = remainingUserIds[index];

                    // Create Message for each user id in list
                    var user = new User(userId);
                    var userMessage = new Message(user);
                    userMessage.room = msg.message.room;

                    // Store for cleanup if needed
                    this.multiUserMessages.push(userMessage);

                    if(control.questionAskedCallback) {
                        control.questionAskedCallback(userId, this.answerKey, this.flow.answers, this);
                    }

                    if(this.useListeners) {
                        // Add listener for user and wait for answer
                        control.addListener(userMessage, new Listener(msg, this.flow.callback, this));
                    }
                    if(this.usePendingRequests) {
                        // Add listener for user and wait for answer
                        control.addPendingRequest(userMessage, new PendingRequest(msg, this.flow.callback, this));
                    }
                }
                return;
            }
            Logger.error("Question::setListenersAndPendingRequests() Empty userId list for multi-user question");
            this.flow.stop(true, true);
            return;
        }

        if(control.questionAskedCallback) {
            var userId = ChatTools.getUserId(msg.message.user);
            var answerKey = this.getAnswerKey();
            control.questionAskedCallback(userId, answerKey, this.flow.answers, this);
        }

        if(this.useListeners) {
            // Add listener for single user and wait for answer
            control.addListener(msg.message, new Listener(msg, this.flow.callback, this));
        }
        if(this.usePendingRequests) {
            // Add a pending request for single user and wait for answer
            control.addPendingRequest(msg.message, new PendingRequest(msg, this.flow.callback, this));
        }
    }

    // Clean up question if timed out or stopped
    cleanup(msg) {
        if(msg) {
            this.flow.control.removeListener(msg);
            this.flow.control.removePendingRequest(msg);
        }
        if(this.multiUserMessages != null) {
            for(let index in this.multiUserMessages) {
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

    // Asynchronously retrieve data after the question is done
    async finalize(answers, callback) {
        callback();
    }

    // Reset the question to be asked again
    reset() {
        super.reset();
        this.formattedQuestionText = null;
        var labelKey = this.getLabelAnswerKey();
        this.flow.answers.remove(labelKey);
        var valueKey = this.getValueAnswerKey();
        this.flow.answers.remove(valueKey);
    }
}

module.exports = Question;