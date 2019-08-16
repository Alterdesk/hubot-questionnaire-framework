const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');
const Question = require('./question.js');
const RegexTools = require('./../utils/regex-tools.js');
const SendMessageData = require('./../containers/send-message-data.js');

// Polar Question, accepts by positive or negative regex, and can set sub flow for an answer
class PolarQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = RegexTools.getTextRegex();
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

    // Set the name, label and style of the positive answer button
    setPositiveButton(name, label, style) {
        this.useButtons = true;
        this.positiveName = name;
        this.positiveLabel = label;
        this.positiveStyle = style;
    }

    // Set the name, label and style of the negative answer button
    setNegativeButton(name, label, style) {
        this.useButtons = true;
        this.negativeName = name;
        this.negativeLabel = label;
        this.negativeStyle = style;
    }

    // Set the question payload style
    setQuestionStyle(style) {
        this.questionStyle = style;
    }

    getLabelForAnswer(answerValue) {
        if(answerValue) {
            return this.positiveLabel;
        } else {
            return this.negativeLabel;
        }
    }

    getRequestMessageId(userId) {
        return this.requestMessageId;
    }

    async send(control, msg, callback) {
        if(this.useButtons) {
            var answers;
            if(this.flow) {
                answers = this.flow.answers;
            }
            var sendMessageData = new SendMessageData();
            var messageText =  this.getQuestionText(answers);
            sendMessageData.setMessage(messageText);
            sendMessageData.setHubotMessage(msg.message);
            var requestStyle = this.questionStyle || "horizontal";
            sendMessageData.setRequestOptions(false, requestStyle);

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
            var stylePositive = this.positiveStyle || "green";
            sendMessageData.addQuestionButtonWithName(namePositive, labelPositive, stylePositive);

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
            var styleNegative = this.negativeStyle || "red";
            sendMessageData.addQuestionButtonWithName(nameNegative, labelNegative, styleNegative);

            if(this.isMultiUser && this.userIds && this.userIds.length > 0) {
                let remainingUserIds = this.getRemainingUserIds();
                if(remainingUserIds && remainingUserIds.length > 0) {
                    sendMessageData.addRequestUserIds(remainingUserIds);
                } else {
                    Logger.error("PolarQuestion:send() Got no remaining user ids for multi-user question: " + this.answerKey);
                    sendMessageData.addRequestUserId(ChatTools.getUserId(msg.message.user));
                }
            } else {
                sendMessageData.addRequestUserId(ChatTools.getUserId(msg.message.user));
            }

            this.usePendingRequests = true;
            this.setListenersAndPendingRequests(control, msg, callback);

            control.sendComposing(msg);

            // Send the message and parse result in callback
            var json = await control.messengerClient.sendMessage(sendMessageData);
            var success = json != null;
            Logger.debug("PolarQuestion:send() Successful: " + success);
            if(json != null) {
                var messageId = json["id"];
                Logger.debug("PolarQuestion:send() Question message id: " + messageId);
                this.requestMessageId = messageId;
            } else {
                var fallbackText = messageText;
                fallbackText += "\n • \"" + positiveName + "\" - " + positiveLabel;
                fallbackText += "\n • \"" + negativeName + "\" - " + negativeLabel;
                msg.send(fallbackText);
            }
        } else {
            this.setListenersAndPendingRequests(control, msg, callback);
            msg.send(messageText);
        }
    }

    // Check if the positive regex or negative regex matches, and set corresponding sub flow to execute
    checkAndParseAnswer(matches, message) {
        let value = message.text;
        if(value == null || (matches == null && (typeof(value) !== "boolean"))) {
            return null;
        }
        if(value === true || (value.match && value.match(this.positiveRegex))) {
            this.setSubFlow(this.positiveFlow);
            return true;
        } else if(value === false || (value.match && value.match(this.negativeRegex))) {
            this.setSubFlow(this.negativeFlow);
            return false;
        }
        return null;
    }
}

module.exports = PolarQuestion;