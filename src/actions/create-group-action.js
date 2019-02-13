const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class CreateGroupAction extends Action {
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
            Logger.error("CreateGroupAction::start() Invalid Flow, Control or MessengerApi");
            this.done(null);
            return;
        }

        var subjectValue = AnswerOrFixed.get(this.subject, answers);
        for(let i in this.subjectFormatters) {
            var formatter = this.subjectFormatters[i];
            subjectValue = formatter.execute(subjectValue, answers);
        }
        if(!subjectValue || subjectValue === "") {
            Logger.error("CreateGroupAction::start() Invalid subject:" + subjectValue);
            this.done(null);
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

        var memberData = [];
        for(let index in this.memberIds) {
            var member = this.memberIds[index];
            var id = AnswerOrFixed.get(member, answers);
            if(id && id.length > 0) {
                memberData.push(id);
            }
        }
//
//        var hasAuxMembers = false;
//
//        // Invite user data
        var inviteUsersData = [];
        for(let index in this.invites) {
            var invite = this.invites[index];
            var inviteData = {};
            inviteData["create_conversation"] = AnswerOrFixed.get(invite.createConversation, answers, false);
            inviteData["email"] = AnswerOrFixed.get(invite.email, answers);
            inviteData["first_name"] = AnswerOrFixed.get(invite.firstName, answers);
            inviteData["last_name"] = AnswerOrFixed.get(invite.lastName, answers);
            var inviteText = AnswerOrFixed.get(invite.inviteText, answers);
            if(inviteText != null) {
                inviteData["invite_text"] = inviteText;  // Only used when creating conversation
            }
//            if(invite.auxId != null) {
//                inviteData["aux_id"] = invite.auxId;
//                hasAuxMembers = true;
//            }
            if(invite.inviteType === "COWORKER") {
                inviteData["invite_type"] = "coworker";
            } else if(invite.inviteType === "CONTACT") {
                inviteData["invite_type"] = "contact";
            } else if(invite.inviteType === "PRIVATE") {
                inviteData["invite_type"] = "private_user";
            } else {
                Logger.error("CreateGroupAction::start() Invalid invite:" + invite);
            }
            inviteUsersData.push(inviteData);
        }

        // Group data
        var groupPostData = {};
        groupPostData["invite_users"] = inviteUsersData;
        groupPostData["members"] = memberData;
        groupPostData["settings"] = settingsPostData;
        groupPostData["subject"] = subjectValue;
        groupPostData["send_email"] = AnswerOrFixed.get(this.sendEmail, answers, true);;

        var auxId = AnswerOrFixed.get(this.auxId, answers);
        if(auxId) {
            groupPostData["aux_id"] = auxId;
//            if(hasAuxMembers) {
                groupPostData["aux_members"] = false;   // TODO All member ids should be aux or not aux
//            }
        }

        var groupPostJson = JSON.stringify(groupPostData);
        var postUrl;
        if(auxId != null) {
            postUrl = "aux/groupchats";
        } else {
            postUrl = "groupchats";
        }
        this.flow.control.messengerApi.post(postUrl, groupPostJson, (success, json) => {
            this.done(json);
        }, this.overrideToken);
    }

    done(value) {
        if(this.answerKey && value != null) {
            this.answers.add(this.answerKey, value);
            this.answers.addObject(this.answerKey, value);
        }
        if(value) {
            if(this.positiveSubFlow) {
                this.setSubFlow(this.positiveSubFlow);
            }
        } else {
            if(this.negativeSubFlow) {
                this.setSubFlow(this.negativeSubFlow);
            }
        }
        this.flowCallback();
    }

    setAnswerKey(answerKey) {
        this.answerKey = answerKey;
    }

    addMemberId(memberId) {
        this.memberIds.push(memberId);
    }

    addInvite(email, firstName, lastName, inviteType, inviteText, createConversation) {
        var invite = new MemberInvite(email, firstName, lastName, inviteType, inviteText, createConversation);
        this.invites.push(invite);
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

    setAuxId(auxId) {
        this.auxId = auxId;
    }

    setSendEmail(sendEmail) {
        this.sendEmail;
    }

    setPositiveSubFlow(positiveSubFlow) {
        this.positiveSubFlow = positiveSubFlow;
    }

    setNegativeSubFlow(negativeSubFlow) {
        this.negativeSubFlow = negativeSubFlow;
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }

    addSubjectFormatter(formatter) {
        this.subjectFormatters.push(formatter);
    }

    reset(answers) {
        super.reset(answers);
        if(this.answerKey) {
            answers.remove(this.answerKey);
        }
    }
}

class MemberInvite {
    constructor(email, firstName, lastName, inviteType, inviteText, createConversation) {
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.inviteType = inviteType;
        this.inviteText = inviteText;
        this.createConversation = createConversation;
    }
}

module.exports = CreateGroupAction;