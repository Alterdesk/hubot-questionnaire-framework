const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class ChangeMembersAction extends Action {
    constructor(add, memberIds) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.add = add;
        this.memberIds = memberIds;
        this.isAux = false;
    }

    async start(flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("ChangeMembersAction::start() Invalid Flow or Control");
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
                Logger.warn("ChangeMembersAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            this.onError("ChangeMembersAction::start() Invalid chat id");
            flowCallback();
            return;
        }

        var memberIds = [];
        for(let id of this.memberIds) {
            var memberId = this.getAnswerValue(id, answers);
            if(memberId && memberId.length > 0) {
                memberIds.push(memberId);
            }
        }

        var overrideToken = this.getAnswerValue(this.overrideToken, answers);
        if(this.add) {
            await this.flow.control.messengerClient.addGroupMembers(chatId, isAux, memberIds, overrideToken);
        } else {
            await this.flow.control.messengerClient.removeGroupMembers(chatId, isAux, memberIds, overrideToken);
        }
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

module.exports = ChangeMembersAction;
