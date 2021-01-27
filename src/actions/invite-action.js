const Action = require('./action.js');
const InviteUserData = require('./../containers/invite-user-data.js');

class InviteAction extends Action {
    constructor(inviteType, firstName, lastName, email, auxId) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.inviteType = inviteType;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.auxId = auxId;
        this.inviteFormatters = [];
    }

    async start(flowCallback) {
        var answers = this.flow.answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("InviteAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }

        var inviteTypeValue = this.getAnswerValue(this.inviteType, answers);
        var emailValue = this.getAnswerValue(this.email, answers);
        var auxId = this.getAnswerValue(this.auxId, answers);
        var firstNameValue = this.getAnswerValue(this.firstName, answers);
        var lastNameValue = this.getAnswerValue(this.lastName, answers);
        if(!inviteTypeValue || inviteTypeValue === ""
            || !emailValue || emailValue === ""
            || !firstNameValue || firstNameValue === ""
            || !lastNameValue || lastNameValue === "") {
            this.onError("InviteAction::start() Invalid invite: type:" + inviteTypeValue + " email:" + emailValue + " fistName:" + firstNameValue + " lastName: " + lastNameValue);
            this.done(null);
            return;
        }

        var inviteUserData = new InviteUserData();
        inviteUserData.setInviteType(inviteTypeValue);
        inviteUserData.setEmail(emailValue);
        inviteUserData.setFirstName(firstNameValue);
        inviteUserData.setLastName(lastNameValue);
        if(auxId && auxId !== "") {
            inviteUserData.setAuxId(auxId);
        }

        var inviteTextValue = this.getAnswerValue(this.inviteText, answers);
        for(let formatter of this.inviteFormatters) {
            inviteTextValue = formatter.execute(inviteTextValue, this.flow);
        }
        if(inviteTextValue && inviteTextValue !== "") {
            inviteUserData.setInviteMessage(inviteTextValue);    // Only used when creating conversation
        }
        var auxId = this.getAnswerValue(this.auxId, answers);
        if(auxId) {
            inviteUserData.setAuxId(auxId);
        }
        var sendEmailValue = this.getAnswerValue(this.sendEmail, answers, true);
        inviteUserData.setSendEmail(sendEmailValue);

        var overrideToken = this.getAnswerValue(this.overrideToken, answers);
        if(overrideToken) {
            inviteUserData.setOverrideToken(overrideToken);
        }

        var result = await this.flow.control.messengerClient.inviteUser(inviteUserData);
        if(!result) {
            this.done(null);
            return;
        }
        this.done(result["id"])
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

    setAuxId(auxId) {
        this.auxId = auxId;
    }

    setInviteText(inviteText) {
        this.inviteText = inviteText;
    }

    addInviteFormatter(formatter) {
        this.inviteFormatters.push(formatter);
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
}

module.exports = InviteAction;
