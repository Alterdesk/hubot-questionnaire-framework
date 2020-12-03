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
        var answers = this.flow.answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            Logger.error("ChangeGroupAvatarAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }

        var avatarPath = this.getAnswerValue(this.avatarPath, answers);

        if(!avatarPath || avatarPath === "") {
            Logger.error("ChangeGroupAvatarAction::start() Invalid avatar path:", avatarPath);
            flowCallback();
            return;
        }
        if(!avatarPath.match(RegexTools.getFilePathRegex())) {
            Logger.error("ChangeGroupAvatarAction::start() Illegal avatar path:", avatarPath);
            flowCallback();
            return;
        }

        var chatId;
        var isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        } else {
            var isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
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
        var overrideToken = this.getAnswerValue(this.overrideToken, answers);
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
