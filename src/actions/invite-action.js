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
        let answers = this.flow.answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("InviteAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }

        let inviteTypeValue = this.getAnswerValue(this.inviteType, answers);
        let emailValue = this.getAnswerValue(this.email, answers);
        let firstNameValue = this.getAnswerValue(this.firstName, answers);
        let lastNameValue = this.getAnswerValue(this.lastName, answers);
        if(!inviteTypeValue || inviteTypeValue === ""
            || !emailValue || emailValue === ""
            || !firstNameValue || firstNameValue === ""
            || !lastNameValue || lastNameValue === "") {
            this.onError("InviteAction::start() Invalid invite: type:" + inviteTypeValue + " email:" + emailValue + " fistName:" + firstNameValue + " lastName: " + lastNameValue);
            this.done(null);
            return;
        }

        let inviteUserData = new InviteUserData();
        inviteUserData.setInviteType(inviteTypeValue);
        inviteUserData.setEmail(emailValue);
        inviteUserData.setFirstName(firstNameValue);
        inviteUserData.setLastName(lastNameValue);

        let inviteTextValue = this.getAnswerValue(this.inviteText, answers);
        for(let formatter of this.inviteFormatters) {
            inviteTextValue = formatter.execute(inviteTextValue, this.flow);
        }
        if(inviteTextValue && inviteTextValue !== "") {
            inviteUserData.setInviteMessage(inviteTextValue);    // Only used when creating conversation
        }
        let auxId = this.getAnswerValue(this.auxId, answers);
        if(auxId) {
            inviteUserData.setAuxId(auxId);
        }
        let sendEmailValue = this.getAnswerValue(this.sendEmail, answers, true);
        inviteUserData.setSendEmail(sendEmailValue);

        let overrideToken = this.getAnswerValue(this.overrideToken, answers);
        if(overrideToken) {
            inviteUserData.setOverrideToken(overrideToken);
        }

        let result = await this.flow.control.messengerClient.inviteUser(inviteUserData);
        if(!result) {
            this.done(null);
            return;
        }
        this.done(result["id"])
    }

    done(value) {
        let answerKey = this.getAnswerKey();
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

    addInviteFormatters(formatters) {
        this.inviteFormatters = this.inviteFormatters.concat(formatters);
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
