const Action = require('./action.js');
const Logger = require('./../logger.js');
const RegexTools = require('./../utils/regex-tools.js');
const SendMessageData = require('./../containers/send-message-data.js');

class SendMessageAction extends Action {
    constructor(messageText) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.messageText = messageText;
        this.messageFormatters = [];
        this.attachmentPaths = [];
        this.isAux = false;
    }

    async start(flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            flowCallback();
            return;
        }
        var control = this.flow.control;
        var messengerClient = control.messengerClient;

        var sendMessageData = new SendMessageData();

        var answers = this.flow.answers;
        var chatId;
        var isGroup;
        var isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isGroup = this.getAnswerValue(this.isGroup, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
            sendMessageData.setChat(chatId, isGroup, isAux);
        } else {
            sendMessageData.setHubotMessage(this.flow.msg.message);
        }

        var messageText = this.getAnswerValue(this.messageText, answers, "");
        for(let i in this.messageFormatters) {
            var formatter = this.messageFormatters[i];
            messageText = formatter.execute(messageText, this.flow);
        }
        if(!messageText || messageText === "") {
            Logger.error("SendMessageAction::start() Invalid message text:", messageText);
            flowCallback();
            return;
        }
        Logger.debug("SendMessageAction::start() Got message text:", messageText);

        sendMessageData.setMessage(messageText);

        if(this.attachmentPaths.length > 0) {
            Logger.debug("SendMessageAction::start() Got " + this.attachmentPaths.length + " attachments:", this.attachmentPaths);
            var filePathRegex = RegexTools.getFilePathRegex();
            Logger.debug("SendMessageAction::start() Using file path regex:", filePathRegex);
            for(let index in this.attachmentPaths) {
                var attachmentPath = this.getAnswerValue(this.attachmentPaths[index], answers);
                Logger.debug("SendMessageAction::start() Got attachment path:", attachmentPath);
                if(typeof attachmentPath !== "string") {
                    Logger.error("SendMessageAction::start() Invalid attachment path:", attachmentPath);
                    continue;
                }
                if(attachmentPath.match(filePathRegex)) {
                    Logger.debug("SendMessageAction::start() Adding attachment path:", attachmentPath);
                    sendMessageData.addAttachmentPath(attachmentPath);
                } else {
                    Logger.error("SendMessageAction::start() Illegal attachment path:", attachmentPath);
                }
            }
        }

        if(this.overrideToken) {
            sendMessageData.setOverrideToken(this.overrideToken);
        }

        var json = await messengerClient.sendMessage(sendMessageData);
        if(json) {
            Logger.debug("SendMessageAction::start() Message sent successfully");
        } else {
            Logger.error("SendMessageAction::start() Unable to send message");
        }
        flowCallback();
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