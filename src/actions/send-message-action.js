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

        var messageData = control.createSendMessageData();
        messageData.chatId = chatId;
        messageData.isGroup = isGroup;
        messageData.isAux = isAux;
        messageData.message = messageText;
//        messageData.addAttachmentPath(filePath);
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