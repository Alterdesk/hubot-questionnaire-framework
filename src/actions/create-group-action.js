const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
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
            Logger.error("CreateGroupAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }
        var answers = this.flow.answers;
        var subjectValue = AnswerOrFixed.get(this.subject, answers, "");
        for(let i in this.subjectFormatters) {
            var formatter = this.subjectFormatters[i];
            subjectValue = formatter.execute(subjectValue, this.flow);
        }
        if(!subjectValue || subjectValue === "") {
            Logger.error("CreateGroupAction::start() Invalid subject:" + subjectValue);
            this.done(null);
            return;
        }

        var createGroupData = new CreateGroupData();
        createGroupData.setSubject(subjectValue);

        var groupSettingsData = new GroupSettingsData();
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
        createGroupData.setGroupSettings(groupSettingsData);

        for(let index in this.memberIds) {
            var member = this.memberIds[index];
            var id = AnswerOrFixed.get(member, answers);
            if(id && id.length > 0) {
                createGroupData.addMemberId(id);
            }
        }

        // Invite user data
        var inviteUsersData = [];
        for(let index in this.invites) {
            var invite = this.invites[index];
            var inviteUserData = new InviteUserData();
            inviteUserData.setCreateConversation(AnswerOrFixed.get(invite.createConversation, answers, false));
            inviteUserData.setEmail(AnswerOrFixed.get(invite.email, answers));
            inviteUserData.setFirstName(AnswerOrFixed.get(invite.firstName, answers));
            inviteUserData.setLastName(AnswerOrFixed.get(invite.lastName, answers));
            inviteUserData.setInviteMessage(AnswerOrFixed.get(invite.inviteText, answers))
            inviteUserData.setAuxId(AnswerOrFixed.get(invite.auxId, answers));
            inviteUserData.setInviteType(invite.inviteType);
            createGroupData.addInvite(inviteUserData);
        }

        createGroupData.setSendEmail(AnswerOrFixed.get(this.sendEmail, answers, true));
        createGroupData.setAuxId(AnswerOrFixed.get(this.auxId, answers));
        if(this.overrideToken) {
            createGroupData.setOverrideToken(this.overrideToken);
        }
        var json = await this.flow.control.messengerClient.createGroup(createGroupData);
        this.done(json);
    }

    done(value) {
        var answerKey = this.getAnswerKey();
        if(answerKey && value != null) {
            this.flow.answers.add(answerKey, value);
            this.flow.answers.addObject(answerKey, value);
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