const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');

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
        var robotUserId = this.flow.control.robotUserId;

        this.flow.control.messengerApi.removeGroupMembers(chatId, isAux, [robotUserId], (success, json) => {
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