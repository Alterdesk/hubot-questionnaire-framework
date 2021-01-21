const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class RemoveGroupAction extends Action {
    constructor() {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.isAux = false;
    }

    async start(flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("RemoveGroupAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }
        var answers = this.flow.answers;
        var chatId;
        var isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        } else {
            var isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                Logger.warn("RemoveGroupAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            this.onError("RemoveGroupAction::start() Invalid destination chat id");
            flowCallback();
            return;
        }

        var sendEmail = this.getAnswerValue(this.sendEmail, answers, true);
        var overrideToken = this.getAnswerValue(this.overrideToken, answers);

        await this.flow.control.messengerClient.removeGroupChat(chatId, isAux, sendEmail, overrideToken);
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

module.exports = RemoveGroupAction;
