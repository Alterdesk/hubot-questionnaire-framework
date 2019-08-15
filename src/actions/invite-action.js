const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
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

    start(response, answers, flowCallback) {
        this.answers = answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("InviteAction::start() Invalid Flow, Control or MessengerApi");
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

        var inviteData = {};
        inviteData["email"] = emailValue;
        inviteData["first_name"] = firstNameValue;
        inviteData["last_name"] = lastNameValue;
        var inviteTextValue = AnswerOrFixed.get(this.inviteText, answers);
        for(let i in this.inviteFormatters) {
            var formatter = this.inviteFormatters[i];
            inviteTextValue = formatter.execute(inviteTextValue, answers, this.flow);
        }
        if(inviteTextValue && inviteTextValue !== "") {
            inviteData["invite_text"] = inviteTextValue;  // Only used when creating conversation
        }
        var auxId = AnswerOrFixed.get(this.auxId, answers);
        if(auxId) {
            inviteData["aux_id"] = auxId;
        }
        inviteData["send_email"] = AnswerOrFixed.get(this.sendEmail, answers, true);
        var invitePostJson = JSON.stringify(inviteData);

        if(this.inviteType == "COWORKER") {
            this.flow.control.messengerApi.post("users/invite/coworker", invitePostJson, (success, json) => {
                this.done(json);
            }, this.overrideToken);
        } else if(this.inviteType == "CONTACT") {
            this.flow.control.messengerApi.post("users/invite/contact", invitePostJson, (success, json) => {
                this.done(json);
            }, this.overrideToken);
        } else if(this.inviteType == "PRIVATE") {
            this.flow.control.messengerApi.post("users/invite/private", invitePostJson, (success, json) => {
                this.done(json);
            }, this.overrideToken);
        } else {
            logger.error("InviteAction::start() Unknown invite type on invite: \"" + this.inviteType + "\"")
            this.done(null);
        }
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