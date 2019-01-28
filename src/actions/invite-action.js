const Action = require('./action.js');
const Logger = require('./../logger.js');

class InviteAction extends Action {
    constructor(inviteType, firstNameKey, lastNameKey, emailKey, auxIdKey) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.inviteType = inviteType;
        this.firstNameKey = firstNameKey;
        this.lastNameKey = lastNameKey;
        this.emailKey = emailKey;
        this.auxIdKey = auxIdKey;
    }

    start(response, answers, flowCallback) {
        this.answers = answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("InviteAction::start() Invalid Flow, Control or MessengerApi");
            this.done(null);
            return;
        }

        var email = answers.get(this.emailKey);
        var firstName = answers.get(this.firstNameKey);
        var lastName = answers.get(this.lastNameKey);
        if(!email || email === "" || !firstName || firstName === "" || !lastName || lastName === "") {
            Logger.error("InviteAction::start() Invalid invite: email " + email + " fistName:" + firstName + " lastName: " + lastName);
            this.done(null);
            return;
        }

        var inviteData = {};
        inviteData["email"] = email;
        inviteData["first_name"] = firstName;
        inviteData["last_name"] = lastName;
        if(this.inviteTextKey) {
            var inviteText = answers.get(this.inviteTextKey);
            if(inviteText && inviteText !== "") {
                inviteData["invite_text"] = inviteText;  // Only used when creating conversation
            }
        }
        if(this.sendEmailKey != null) {
            inviteData["send_email"] = answers.get(this.sendEmailKey);
        }
        if(this.auxIdKey) {
            var auxId = answers.get(this.auxIdKey);
            if(auxId) {
                inviteData["aux_id"] = auxId;
            }
        }
        var invitePostJson = JSON.stringify(inviteData);

        // TODO Override token
        if(this.inviteType == "COWORKER") {
            this.flow.control.messengerApi.post("users/invite/coworker", invitePostJson, (success, json) => { this.done(json); });
        } else if(this.inviteType == "CONTACT") {
            this.flow.control.messengerApi.post("users/invite/contact", invitePostJson, (success, json) => { this.done(json); });
        } else if(this.inviteType == "PRIVATE") {
            this.flow.control.messengerApi.post("users/invite/private", invitePostJson, (success, json) => { this.done(json); });
        } else {
            logger.error("InviteAction::start() Unknown invite type on invite: \"" + this.inviteType + "\"")
            this.done(null);
        }
    }

    done(value) {
        if(this.answerKey && value != null) {
            this.answers.add(this.answerKey, value);
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

    setPositiveSubFlow(positiveSubFlow) {
        this.positiveSubFlow = positiveSubFlow;
    }

    setNegativeSubFlow(negativeSubFlow) {
        this.negativeSubFlow = negativeSubFlow;
    }

    reset(answers) {
        super.reset(answers);
        if(this.answerKey) {
            answers.remove(this.answerKey);
        }
    }
}

module.exports = InviteAction;