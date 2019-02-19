const Action = require('./action.js');

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
        if(this.chatId) {
            chatId = this.chatId;
        } else {
            var isGroup = this.flow.control.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
        }

        if(this.add) {
            this.flow.control.messengerApi.addGroupMembers(chatId, this.isAux, this.memberIds, (success, json) => {
                flowCallback();
            });
        } else {
            this.flow.control.messengerApi.removeGroupMembers(chatId, this.isAux, this.memberIds, (success, json) => {
                flowCallback();
            });
        }
    }

    setChatId(chatId) {
        this.chatId = chatId;
    }

    setIsAux(isAux) {
        this.isAux = isAux;
    }
}

module.exports = ChangeMembersAction;