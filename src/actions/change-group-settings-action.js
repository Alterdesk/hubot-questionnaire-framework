const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const ChatTools = require('./../utils/chat-tools.js');
const GroupSettingsData = require('./../containers/group-settings-data.js');
const Logger = require('./../logger.js');

class ChangeGroupSettingsAction extends Action {
    constructor() {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
    }

    async start(response, answers, flowCallback) {
        this.answers = answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            Logger.error("ChangeGroupSettingsAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }

        var chatId;
        var isAux;
        if(this.chatId) {
            chatId = AnswerOrFixed.get(this.chatId, answers);
            isAux = AnswerOrFixed.get(this.isAux, answers);
        } else {
            var isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                Logger.error("ChangeGroupSettingsAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }

        if(!chatId) {
            Logger.error("ChangeGroupSettingsAction::start() Invalid chat id");
            flowCallback();
            return;
        }

        // Group chat settings
        var groupSettingsData = new GroupSettingsData();

        groupSettingsData.setChat(chatId, isAux);

        var allowContactsValue = AnswerOrFixed.get(this.allowContacts, answers);
        if(allowContactsValue != null) {
            groupSettingsData.setAllowContacts(allowContactsValue);
        }
        var autoCloseAfterValue = AnswerOrFixed.get(this.autoCloseAfter, answers);
        if(autoCloseAfterValue != null) {
            groupSettingsData.setCloseAfter(autoCloseAfterValue);
        }
        var autoExpireAfterValue = AnswerOrFixed.get(this.autoExpireAfter, answers);
        if(autoCloseAfterValue != null) {
            groupSettingsData.setExpireAfter(autoExpireAfterValue);
        }
        var hybridMessagingValue = AnswerOrFixed.get(this.hybridMessaging, answers);
        if(hybridMessagingValue != null) {
            groupSettingsData.setHybridMessaging(hybridMessagingValue);
        }
        var membersCanInviteValue = AnswerOrFixed.get(this.membersCanInvite, answers);
        if(membersCanInviteValue != null) {
            groupSettingsData.setMembersCanInvite(membersCanInviteValue);
        }

        if(this.overrideToken) {
            groupSettingsData.setOverrideToken(this.overrideToken);
        }

        await this.flow.control.messengerClient.changeGroupSettings(groupSettingsData);
        flowCallback()
    }

    setAllowContacts(allowContacts) {
        this.allowContacts = allowContacts;
    }

    setAutoCloseAfter(autoCloseAfter) {
        this.autoCloseAfter = autoCloseAfter;
    }

    setAutoExpireAfter(autoExpireAfter) {
        this.autoExpireAfter = autoExpireAfter;
    }

    setHybridMessaging(hybridMessaging) {
        this.hybridMessaging = hybridMessaging;
    }

    setMembersCanInvite(membersCanInvite) {
        this.membersCanInvite = membersCanInvite;
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

module.exports = ChangeGroupSettingsAction;