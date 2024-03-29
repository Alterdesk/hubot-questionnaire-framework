const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');

class CheckUserAction extends Action {
    constructor(check) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.check = check;
    }

    async start(flowCallback) {
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("CheckUserAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }

        let userId = ChatTools.getUserId(this.flow.msg.message.user);
        if(!userId || userId.length === 0) {
            this.onError("CheckUserAction::start() Invalid user id:", userId);
            this.done(null);
            return;
        }

        let answers = this.flow.answers;
        let overrideToken = this.getAnswerValue(this.overrideToken, answers);

        if(this.check === "BUSINESS") {
            let json = await this.flow.control.messengerClient.getUser(userId, false, overrideToken);
            if(!json) {
                this.done(null);
                return;
            }
            let business = json["private_user"] === false;
            this.done(business);
        } else if(this.check === "COWORKER") {
            let robotUser = this.flow.control.robot.user;
            if(!robotUser) {
                this.onError("CheckUserAction::start() Robot user invalid:", robotUser);
                this.done(null);
                return;
            }
            let robotCompany = robotUser["company_id"];
            if(!robotCompany || robotCompany.length === 0) {
                this.onError("CheckUserAction::start() Robot company id invalid:", robotCompany);
                this.done(null);
                return;
            }
            let json = await this.flow.control.messengerClient.getUser(userId, false, overrideToken);
            if(!json) {
                this.done(null);
                return;
            }
            let coworker = json["company_id"] === robotCompany;
            this.done(coworker);
        } else if(this.check === "VERIFIED") {
            let json = await this.flow.control.messengerClient.getUserVerifications(userId, overrideToken);
            if(!json) {
                this.done(null);
                return;
            }
            let userVerifications = json["user"];
            if(!userVerifications || userVerifications.length === 0) {
                this.done(false);
                return;
            }
            if(!this.provider || this.provider === "") {
                this.done(true);
                return;
            }
            for(let userVerification of userVerifications) {
                if(this.provider === userVerification["name"]) {
                    this.done(true);
                    return;
                }
            }
            this.done(null);
        } else {
            this.onError("CheckUserAction::start() Unknown check:", this.check);
            this.done(null);
        }
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

    setProvider(provider) {
        this.provider = provider;
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

module.exports = CheckUserAction;
