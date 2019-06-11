const Extra = require('node-messenger-extra');

const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class SendMessageAction extends Action {
    constructor(messageText) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.messageText = messageText;
        this.messageFormatters = [];
        this.attachmentPaths = [];
        this.isAux = false;
    }

    async start(response, answers, flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            flowCallback();
            return;
        }
        var control = this.flow.control;
        var messengerApi = control.messengerApi;

        var chatId;
        var isGroup;
        var isAux;
        if(this.chatId) {
            chatId = AnswerOrFixed.get(this.chatId, answers);
            isGroup = AnswerOrFixed.get(this.isGroup, answers);
            isAux = AnswerOrFixed.get(this.isAux, answers);
        } else {
            var msg = this.flow.msg;
            chatId = msg.message.room;
            isGroup = control.isUserInGroup(msg.message.user);
            isAux = false;
        }

        var messageText = AnswerOrFixed.get(this.messageText, answers, "");
        for(let i in this.messageFormatters) {
            var formatter = this.messageFormatters[i];
            messageText = formatter.execute(messageText, answers);
        }
        if(!messageText || messageText === "") {
            Logger.error("SendMessageAction::start() Invalid message text:", messageText);
            flowCallback();
            return;
        }
        Logger.debug("SendMessageAction::start() Got message text:", messageText);

        var messageData = control.createSendMessageData();
        messageData.chatId = chatId;
        messageData.isGroup = isGroup;
        messageData.isAux = isAux;
        messageData.message = messageText;
        if(this.attachmentPaths.length > 0) {
            Logger.debug("SendMessageAction::start() Got " + this.attachmentPaths.length + " attachments:", this.attachmentPaths);
            var filePathRegex = Extra.getFilePathRegex();
            Logger.debug("SendMessageAction::start() Using file path regex:", filePathRegex);
            for(let index in this.attachmentPaths) {
                var attachmentPath = AnswerOrFixed.get(this.attachmentPaths[index], answers);
                Logger.debug("SendMessageAction::start() Got attachment path:", attachmentPath);
                if(typeof attachmentPath !== "string") {
                    Logger.error("SendMessageAction::start() Invalid attachment path:", attachmentPath);
                    continue;
                }
                if(attachmentPath.match(filePathRegex)) {
                    Logger.debug("SendMessageAction::start() Adding attachment path:", attachmentPath);
                    messageData.addAttachmentPath(attachmentPath);
                } else {
                    Logger.error("SendMessageAction::start() Illegal attachment path:", attachmentPath);
                }
            }

        }
        messageData.overrideToken = this.overrideToken;
        messengerApi.sendMessage(messageData, (messageSuccess, json) => {
            if(messageSuccess) {
                Logger.debug("SendMessageAction::start() Message sent successfully");
            } else {
                Logger.error("SendMessageAction::start() Unable to send message");
            }
            flowCallback();
        });
    }

    addMessageFormatter(formatter) {
        this.messageFormatters.push(formatter);
    }

    addAttachmentPath(filePath) {
        this.attachmentPaths.push(filePath);
    }

    setChatId(chatId) {
        this.chatId = chatId;
    }

    setIsGroup(isGroup) {
        this.isGroup = isGroup;
    }

    setIsAux(isAux) {
        this.isAux = isAux;
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }
}

module.exports = SendMessageAction;