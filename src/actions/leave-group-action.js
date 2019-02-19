const Action = require('./action.js');

class LeaveGroupAction extends Action {
    constructor() {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.isAux = false;
    }

    start(response, answers, flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            flowCallback();
            return;
        }
        var isGroup = this.flow.control.isUserInGroup(this.flow.msg.message.user);
        if(!isGroup) {
            flowCallback();
            return;
        }
        var chatId;
        if(this.chatId) {
            chatId = this.chatId;
        } else {
            chatId = this.flow.msg.message.room;
        }
        var robotUserId = this.flow.control.robotUserId;

        this.flow.control.messengerApi.removeGroupMembers(chatId, this.isAux, [robotUserId], (success, json) => {
            flowCallback();
        });
    }

    setChatId(chatId) {
        this.chatId = chatId;
    }

    setIsAux(isAux) {
        this.isAux = isAux;
    }
}

module.exports = LeaveGroupAction;