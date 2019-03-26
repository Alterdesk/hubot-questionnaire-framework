const Extra = require('node-messenger-extra');

const Logger = require('./../logger.js');
const Question = require('./question.js');

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

    send(control, msg, callback) {
        if(control.messengerApi && this.useButtons) {
            var messageData = control.createSendMessageData();
            messageData.message = this.getQuestionText();
            messageData.chatId = msg.message.room;
            messageData.isGroup = control.isUserInGroup(msg.message.user);
            messageData.isAux = false;

            var questionPayload = control.createQuestionPayload();
            questionPayload.multiAnswer = false;
            questionPayload.style = this.questionStyle || "horizontal";

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
            questionPayload.addOption(namePositive, labelPositive, stylePositive);

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
            questionPayload.addOption(nameNegative, labelNegative, styleNegative);

            if(this.isMultiUser && this.userIds && this.userIds.length > 0) {
                let remainingUserIds = this.getRemainingUserIds();
                if(remainingUserIds && remainingUserIds.length > 0) {
                    questionPayload.addUserIds(remainingUserIds);
                } else {
                    Logger.error("PolarQuestion:send() Got no remaining user ids for multi-user question: " + this.answerKey);
                    questionPayload.addUserId(control.getUserId(msg.message.user));
                }
            } else {
                questionPayload.addUserId(control.getUserId(msg.message.user));
            }
            messageData.payload = questionPayload;

            var question = this;
            question.usePendingRequests = true;

            question.setListenersAndPendingRequests(control, msg, callback);

            control.sendComposing(msg);

            // Send the message and parse result in callback
            control.messengerApi.sendMessage(messageData, function(success, json) {
                Logger.debug("PolarQuestion:send() Successful: " + success);
                if(json != null) {
                    var messageId = json["id"];
                    Logger.debug("PolarQuestion:send() Question message id: " + messageId);
                    question.requestMessageId = messageId;
                } else {
                    // Fallback
                    msg.send(question.getQuestionText());
                }
            });
        } else {
            if(this.useButtons) {
                Logger.error("PolarQuestion:send() Messenger API instance not set");
            }
            this.setListenersAndPendingRequests(control, msg, callback);
            msg.send(this.getQuestionText());
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