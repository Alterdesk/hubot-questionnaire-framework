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
        let answers = this.flow.answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("ChangeGroupSettingsAction::start() Invalid Flow or Control");
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
                Logger.warn("ChangeGroupSettingsAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }

        if(!chatId) {
            this.onError("ChangeGroupSettingsAction::start() Invalid chat id");
            flowCallback();
            return;
        }

        // Group chat settings
        let groupSettingsData = new GroupSettingsData();

        groupSettingsData.setChat(chatId, isAux);

        let allowContactsValue = this.getAnswerValue(this.allowContacts, answers);
        if(allowContactsValue != null) {
            groupSettingsData.setAllowContacts(allowContactsValue);
        }
        let autoCloseAfterValue = this.getAnswerValue(this.autoCloseAfter, answers);
        if(autoCloseAfterValue != null) {
            groupSettingsData.setCloseAfter(autoCloseAfterValue);
        }
        let autoExpireAfterValue = this.getAnswerValue(this.autoExpireAfter, answers);
        if(autoCloseAfterValue != null) {
            groupSettingsData.setExpireAfter(autoExpireAfterValue);
        }
        let hybridMessagingValue = this.getAnswerValue(this.hybridMessaging, answers);
        if(hybridMessagingValue != null) {
            groupSettingsData.setHybridMessaging(hybridMessagingValue);
        }
        let membersCanInviteValue = this.getAnswerValue(this.membersCanInvite, answers);
        if(membersCanInviteValue != null) {
            groupSettingsData.setMembersCanInvite(membersCanInviteValue);
        }

        let overrideToken = this.getAnswerValue(this.overrideToken, answers);
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
