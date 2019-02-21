const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');

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

        if(this.add) {
            this.flow.control.messengerApi.addGroupMembers(chatId, isAux, this.memberIds, (success, json) => {
                flowCallback();
            }, this.overrideToken);
        } else {
            this.flow.control.messengerApi.removeGroupMembers(chatId, isAux, this.memberIds, (success, json) => {
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