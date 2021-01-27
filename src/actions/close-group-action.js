const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class CloseGroupAction extends Action {
    constructor() {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.isAux = false;
    }

    async start(flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("CloseGroupAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }
        let answers = this.flow.answers;
        let chatId;
        let isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        } else {
            let isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                Logger.warn("CloseGroupAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            this.onError("CloseGroupAction::start() Invalid chat id");
            flowCallback();
            return;
        }

        let sendEmail = this.getAnswerValue(this.sendEmail, answers, true);
        let overrideToken = this.getAnswerValue(this.overrideToken, answers);

        await this.flow.control.messengerClient.closeGroupChat(chatId, isAux, sendEmail, overrideToken);
        flowCallback();
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
