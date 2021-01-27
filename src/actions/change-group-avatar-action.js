const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');
const RegexTools = require('./../utils/regex-tools.js');

class ChangeGroupAvatarAction extends Action {
    constructor(avatarPath) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.avatarPath = avatarPath;
    }

    async start(flowCallback) {
        let answers = this.flow.answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("ChangeGroupAvatarAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }

        let avatarPath = this.getAnswerValue(this.avatarPath, answers);

        if(!avatarPath || avatarPath === "") {
            this.onError("ChangeGroupAvatarAction::start() Invalid avatar path:", avatarPath);
            flowCallback();
            return;
        }
        if(!avatarPath.match(RegexTools.getFilePathRegex())) {
            this.onError("ChangeGroupAvatarAction::start() Illegal avatar path:", avatarPath);
            flowCallback();
            return;
        }

        let chatId;
        let isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        } else {
            let isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                Logger.warn("ChangeGroupAvatarAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            this.onError("ChangeGroupAvatarAction::start() Invalid chat id");
            flowCallback();
            return;
        }
        let overrideToken = this.getAnswerValue(this.overrideToken, answers);
        await this.flow.control.messengerClient.changeGroupAvatar(chatId, isAux, avatarPath, overrideToken);
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

module.exports = ChangeGroupAvatarAction;
