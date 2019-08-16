const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const InviteUserData = require('./../containers/invite-user-data.js');
const Logger = require('./../logger.js');

class InviteAction extends Action {
    constructor(inviteType, firstName, lastName, email, auxId) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.inviteType = inviteType;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.inviteFormatters = [];
    }

    async start(response, answers, flowCallback) {
        this.answers = answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            Logger.error("InviteAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }

        var emailValue = AnswerOrFixed.get(this.email, answers);
        var firstNameValue = AnswerOrFixed.get(this.firstName, answers);
        var lastNameValue = AnswerOrFixed.get(this.lastName, answers);
        if(!emailValue || emailValue === ""
            || !firstNameValue || firstNameValue === ""
            || !lastNameValue || lastNameValue === "") {
            Logger.error("InviteAction::start() Invalid invite: email:" + emailValue + " fistName:" + firstNameValue + " lastName: " + lastNameValue);
            this.done(null);
            return;
        }

        var inviteUserData = new InviteUserData();
        inviteUserData.setEmail(emailValue);
        inviteUserData.setFirstName(firstNameValue);
        inviteUserData.setLastName(lastNameValue);

        var inviteTextValue = AnswerOrFixed.get(this.inviteText, answers);
        for(let i in this.inviteFormatters) {
            var formatter = this.inviteFormatters[i];
            inviteTextValue = formatter.execute(inviteTextValue, answers, this.flow);
        }
        if(inviteTextValue && inviteTextValue !== "") {
            inviteUserData.set(inviteTextValue);    // Only used when creating conversation
        }
        var auxId = AnswerOrFixed.get(this.auxId, answers);
        if(auxId) {
            inviteUserData.setAuxId(auxId);
        }
        var sendEmailValue = AnswerOrFixed.get(this.sendEmail, answers, true);
        inviteUserData.setSendEmail(sendEmailValue);

        var result = await this.flow.control.messengerClient.inviteUser(inviteUserData);
        this.done(result)
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

    setAuxId(auxId) {
        this.auxId = auxId;
    }

    setInviteText(inviteText) {
        this.inviteText;
    }

    addInviteFormatter(formatter) {
        this.inviteFormatters.push(formatter);
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

    reset(answers) {
        super.reset(answers);
        if(this.answerKey) {
            answers.remove(this.answerKey);
        }
    }
}

module.exports = InviteAction;