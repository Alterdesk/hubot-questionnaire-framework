const Action = require('./action.js');

class CloseGroupAction extends Action {
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

        this.flow.control.messengerApi.closeGroupChat(chatId, this.isAux, (success, json) => {
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

module.exports = CloseGroupAction;