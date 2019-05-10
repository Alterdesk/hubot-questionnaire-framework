const Extra = require('node-messenger-extra');

const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

const filePathRegex = Extra.getFilePathRegex();

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

        var avatarPath = AnswerOrFixed.get(this.avatarPath, answers);

        if(!avatarPath || avatarPath === "") {
            Logger.error("ChangeGroupAvatarAction::start() Invalid avatar path:", avatarPath);
            flowCallback();
            return;
        }
        if(!avatarPath.match(filePathRegex)) {
            Logger.error("ChangeGroupAvatarAction::start() Illegal avatar path:", avatarPath);
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
        if(!chatId) {
            Logger.error("ChangeGroupAvatarAction::start() Invalid chat id");
            flowCallback();
            return;
        }
        this.flow.control.messengerApi.changeGroupAvatar(chatId, isAux, avatarPath, (success, json) => {
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