const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class ChangeGroupSettingsAction extends Action {
    constructor(subject) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.subject = subject;
        this.memberIds = [];
        this.invites = [];
        this.subjectFormatters = [];
    }

    start(response, answers, flowCallback) {
        this.answers = answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("ChangeGroupSettingsAction::start() Invalid Flow, Control or MessengerApi");
            flowCallback();
            return;
        }

        // Group chat settings
        var settingsPostData = {};
        var allowContactsValue = AnswerOrFixed.get(this.allowContacts, answers);
        if(allowContactsValue != null) {
            settingsPostData["allow_contacts"] = allowContactsValue;
        }
        var autoCloseAfterValue = AnswerOrFixed.get(this.autoCloseAfter, answers);
        if(autoCloseAfterValue != null) {
            settingsPostData["auto_close_after"] = autoCloseAfterValue;
        }
        var autoExpireAfterValue = AnswerOrFixed.get(this.autoExpireAfter, answers);
        if(autoCloseAfterValue != null) {
            settingsPostData["auto_expire_after"] = autoExpireAfterValue;
        }
        var hybridMessagingValue = AnswerOrFixed.get(this.hybridMessaging, answers);
        if(hybridMessagingValue != null) {
            settingsPostData["hybrid_messaging"] = hybridMessagingValue;
        }
        var membersCanInviteValue = AnswerOrFixed.get(this.membersCanInvite, answers);
        if(membersCanInviteValue != null) {
            settingsPostData["members_can_invite"] = membersCanInviteValue;
        }

        if(settingsPostData.length === 0) {
            Logger.error("ChangeGroupSettingsAction::start() No settings to set:", settingsPostData);
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
                Logger.error("ChangeGroupSettingsAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }

        var settingsPostJson = JSON.stringify(settingsPostData);
        var postUrl;
        if(isAux) {
            postUrl = "aux/groupchats/" + chatId + "/settings";
        } else {
            postUrl = "groupchats/" + chatId + "/settings;
        }
        this.flow.control.messengerApi.put(postUrl, settingsPostJson, (success, json) => {
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

module.exports = ChangeGroupSettingsAction;