const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const GroupSettingsData = require('./../containers/group-settings-data.js');
const Logger = require('./../logger.js');

class ChangeGroupSettingsAction extends Action {
    constructor() {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
    }

    async start(flowCallback) {
        var answers = this.flow.answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            Logger.error("ChangeGroupSettingsAction::start() Invalid Flow or Control");
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

        var allowContactsValue = this.getAnswerValue(this.allowContacts, answers);
        if(allowContactsValue != null) {
            groupSettingsData.setAllowContacts(allowContactsValue);
        }
        var autoCloseAfterValue = this.getAnswerValue(this.autoCloseAfter, answers);
        if(autoCloseAfterValue != null) {
            groupSettingsData.setCloseAfter(autoCloseAfterValue);
        }
        var autoExpireAfterValue = this.getAnswerValue(this.autoExpireAfter, answers);
        if(autoCloseAfterValue != null) {
            groupSettingsData.setExpireAfter(autoExpireAfterValue);
        }
        var hybridMessagingValue = this.getAnswerValue(this.hybridMessaging, answers);
        if(hybridMessagingValue != null) {
            groupSettingsData.setHybridMessaging(hybridMessagingValue);
        }
        var membersCanInviteValue = this.getAnswerValue(this.membersCanInvite, answers);
        if(membersCanInviteValue != null) {
            groupSettingsData.setMembersCanInvite(membersCanInviteValue);
        }

        var overrideToken = this.getAnswerValue(this.overrideToken, answers);
        if(overrideToken) {
            groupSettingsData.setOverrideToken(overrideToken);
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
}

module.exports = ChangeGroupSettingsAction;
