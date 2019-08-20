const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class LeaveGroupAction extends Action {
    constructor() {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.isAux = false;
    }

    async start(flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            Logger.error("LeaveGroupAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }
        var answers = this.flow.answers;
        var chatId;
        var isAux;
        if(this.chatId) {
            chatId = AnswerOrFixed.get(this.chatId, answers);
            isAux = AnswerOrFixed.get(this.isAux, answers);
        } else {
            var isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                Logger.error("LeaveGroupAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            Logger.error("LeaveGroupAction::start() Invalid chat id");
            flowCallback();
            return;
        }
        var robotUserId = this.flow.control.robotUserId;

        await this.flow.control.messengerClient.removeGroupMembers(chatId, isAux, [robotUserId], this.overrideToken);
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

module.exports = LeaveGroupAction;