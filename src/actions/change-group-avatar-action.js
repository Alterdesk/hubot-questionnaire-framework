const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class ChangeGroupAvatarAction extends Action {
    constructor(avatarPath) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.avatarPath = avatarPath;
    }

    start(response, answers, flowCallback) {
        this.answers = answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("ChangeGroupAvatarAction::start() Invalid Flow, Control or MessengerApi");
            flowCallback();
            return;
        }

        if(!this.avatarPath || this.avatarPath === "") {
            Logger.error("ChangeGroupAvatarAction::start() Invalid avatar path:", this.avatarPath);
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
                Logger.error("ChangeGroupAvatarAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        changeGroupAvatar(chatId, isAux, this.avatarPath, (success, json) => {
            flowCallback();
        }, this.overrideToken);
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

    reset(answers) {
        super.reset(answers);
        if(this.answerKey) {
            answers.remove(this.answerKey);
        }
    }
}

module.exports = ChangeGroupAvatarAction;