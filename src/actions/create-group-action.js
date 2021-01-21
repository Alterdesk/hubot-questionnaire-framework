const Action = require('./action.js');
const CreateGroupData = require('./../containers/create-group-data.js');
const GroupSettingsData = require('./../containers/group-settings-data.js');
const InviteUserData = require('./../containers/invite-user-data.js');
const Logger = require('./../logger.js');

class CreateGroupAction extends Action {
    constructor(subject) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.subject = subject;
        this.memberIds = [];
        this.invites = [];
        this.subjectFormatters = [];
    }

    async start(flowCallback) {
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("CreateGroupAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }
        var answers = this.flow.answers;
        var subjectValue = this.getAnswerValue(this.subject, answers, "");
        for(let i in this.subjectFormatters) {
            var formatter = this.subjectFormatters[i];
            subjectValue = formatter.execute(subjectValue, this.flow);
        }
        if(!subjectValue || subjectValue === "") {
            this.onError("CreateGroupAction::start() Invalid subject:" + subjectValue);
            this.done(null);
            return;
        }

        var createGroupData = new CreateGroupData();
        createGroupData.setSubject(subjectValue);

        var groupSettingsData = new GroupSettingsData();
        var allowContactsValue = this.getAnswerValue(this.allowContacts, answers);
        if(allowContactsValue != null) {
            groupSettingsData.setAllowContacts(allowContactsValue);
        }
        var autoCloseAfterValue = this.getAnswerValue(this.autoCloseAfter, answers);
        if(autoCloseAfterValue != null) {
            groupSettingsData.setCloseAfter(autoCloseAfterValue);
        }
        var autoExpireAfterValue = this.getAnswerValue(this.autoExpireAfter, answers);
        if(autoExpireAfterValue != null) {
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
        createGroupData.setGroupSettings(groupSettingsData);

        for(let index in this.memberIds) {
            var member = this.memberIds[index];
            var id = this.getAnswerValue(member, answers);
            if(id && id.length > 0) {
                createGroupData.addMemberId(id);
            }
        }

        // Invite user data
        var inviteUsersData = [];
        for(let index in this.invites) {
            var invite = this.invites[index];
            var inviteUserData = new InviteUserData();
            inviteUserData.setCreateConversation(this.getAnswerValue(invite.createConversation, answers, false));
            inviteUserData.setEmail(this.getAnswerValue(invite.email, answers));
            inviteUserData.setFirstName(this.getAnswerValue(invite.firstName, answers));
            inviteUserData.setLastName(this.getAnswerValue(invite.lastName, answers));
            inviteUserData.setInviteMessage(this.getAnswerValue(invite.inviteText, answers))
            inviteUserData.setAuxId(this.getAnswerValue(invite.auxId, answers));
            inviteUserData.setInviteType(this.getAnswerValue(invite.inviteType, answers));
            createGroupData.addInvite(inviteUserData);
        }

        createGroupData.setSendEmail(this.getAnswerValue(this.sendEmail, answers, true));
        createGroupData.setAuxId(this.getAnswerValue(this.auxId, answers));
        var overrideToken = this.getAnswerValue(this.overrideToken, answers);
        if(overrideToken) {
            createGroupData.setOverrideToken(overrideToken);
        }
        var result = await this.flow.control.messengerClient.createGroup(createGroupData);
        if(!result) {
            this.done(null);
            return;
        }
        this.done(result["id"]);
    }

    done(value) {
        var answerKey = this.getAnswerKey();
        if(answerKey && value != null) {
            this.flow.answers.add(answerKey, value);
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

    addInvite(email, firstName, lastName, inviteType, inviteText, createConversation, auxId) {
        var invite = new MemberInvite(email, firstName, lastName, inviteType, inviteText, createConversation, auxId);
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
        this.sendEmail = sendEmail;
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

}

class MemberInvite {
    constructor(email, firstName, lastName, inviteType, inviteText, createConversation, auxId) {
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.inviteType = inviteType;
        this.inviteText = inviteText;
        this.createConversation = createConversation;
        this.auxId = auxId;
    }
}

module.exports = CreateGroupAction;
