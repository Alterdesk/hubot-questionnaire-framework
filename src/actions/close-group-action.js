const Action = require('./action.js');

class CloseGroupAction extends Action {
    constructor() {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
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
        var chatId = this.flow.msg.message.room;

        this.flow.control.messengerApi.closeGroupChat(chatId, false, (success, json) => {
            flowCallback();
        });
    }
}

module.exports = CloseGroupAction;