const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class ChangeMembersAction extends Action {
    constructor(add, memberIds) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.add = add;
        this.memberIds = memberIds;
        this.isAux = false;
    }

    start(response, answers, flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("ChangeMembersAction::start() Invalid Flow, Control or MessengerApi");
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
                Logger.error("ChangeMembersAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            Logger.error("ChangeMembersAction::start() Invalid chat id");
            flowCallback();
            return;
        }

        var memberIds = [];
        for(let index in this.memberIds) {
            var memberId = AnswerOrFixed.get(this.memberIds[index], answers);
            if(memberId && memberId.length > 0) {
                memberIds.push(memberId);
            }
        }

        if(this.add) {
            this.flow.control.messengerApi.addGroupMembers(chatId, isAux, memberIds, (success, json) => {
                flowCallback();
            }, this.overrideToken);
        } else {
            this.flow.control.messengerApi.removeGroupMembers(chatId, isAux, memberIds, (success, json) => {
                flowCallback();
            }, this.overrideToken);
        }
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