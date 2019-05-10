const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class CloseGroupAction extends Action {
    constructor() {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.isAux = false;
    }

    start(response, answers, flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("CloseGroupAction::start() Invalid Flow, Control or MessengerApi");
            flowCallback();
            return;
        }
        var chatId;
        var isAux;
        if(this.chatId) {
            chatId = AnswerOrFixed.get(this.chatId, answers);
            isAux = AnswerOrFixed.get(this.isAux, answers);
        } else {
            var isGroup = this.flow.control.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            Logger.error("CloseGroupAction::start() Invalid destination chat id");
            flowCallback();
            return;
        }

        var sendEmail = AnswerOrFixed.get(this.sendEmail, answers, true);

        this.flow.control.messengerApi.closeGroupChat(chatId, isAux, sendEmail, (success, json) => {
            flowCallback();
        }, this.overrideToken);
    }

    setChatId(chatId) {
        this.chatId = chatId;
    }

    setIsAux(isAux) {
        this.isAux = isAux;
    }

    setSendEmail(sendEmail) {
        this.sendEmail = sendEmail;
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }
}

module.exports = CloseGroupAction;