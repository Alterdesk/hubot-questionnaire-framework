const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class ChangeGroupOwnerAction extends Action {
    constructor(userId) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.userId = userId;
    }

    async start(flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("ChangeGroupOwnerAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }
        let answers = this.flow.answers;
        let userIdValue = this.getAnswerValue(this.userId, answers, "");
        if(!userIdValue || userIdValue === "") {
            this.onError("ChangeGroupOwnerAction::start() Invalid user id:" + userIdValue);
            flowCallback();
            return;
        }

        let chatId;
        let isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        } else {
            let isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                Logger.warn("ChangeGroupOwnerAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            this.onError("ChangeGroupOwnerAction::start() Invalid chat id");
            flowCallback();
            return;
        }
        let overrideToken = this.getAnswerValue(this.overrideToken, answers);
        await this.flow.control.messengerClient.changeGroupOwner(chatId, isAux, userIdValue, overrideToken);
        flowCallback();
    }

    setChatId(chatId) {
        this.chatId = chatId;
    }

    setIsAux(isAux) {
        this.isAux = isAux;
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }

}

module.exports = ChangeGroupOwnerAction;
