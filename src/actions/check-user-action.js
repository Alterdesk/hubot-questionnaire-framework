const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

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
            Logger.error("CheckUserAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }

        var userId = ChatTools.getUserId(this.flow.msg.message.user);
        if(!userId || userId.length == 0) {
            Logger.error("CheckUserAction::start() Invalid user id:", userId);
            this.done(null);
            return;
        }

        var answers = this.flow.answers;
        var overrideToken = this.getAnswerValue(this.overrideToken, answers);

        if(this.check === "BUSINESS") {
            var json = await this.flow.control.messengerClient.getUser(userId, false, overrideToken);
            if(!json) {
                this.done(null);
                return;
            }
            var business = json["private_user"] === false;
            this.done(business);
        } else if(this.check === "COWORKER") {
            var robotUser = this.flow.control.robotUser;
            if(!robotUser) {
                Logger.error("CheckUserAction::start() Robot user invalid:", robotUser);
                this.done(null);
                return;
            }
            var robotCompany = robotUser["company_id"];
            if(!robotCompany || robotCompany.length === 0) {
                Logger.error("CheckUserAction::start() Robot company id invalid:", robotCompany);
                this.done(null);
                return;
            }
            var json = await this.flow.control.messengerClient.getUser(userId, false, overrideToken);
            if(!json) {
                this.done(null);
                return;
            }
            var coworker = json["company_id"] === robotCompany;
            this.done(coworker);
        } else if(this.check === "VERIFIED") {
            var json = await this.flow.control.messengerClient.getUserVerifications(userId, overrideToken);
            if(!json) {
                this.done(null);
                return;
            }
            var userVerifications = json["user"];
            if(!userVerifications || userVerifications.length === 0) {
                this.done(false);
                return;
            }
            if(!this.provider || this.provider === "") {
                this.done(true);
                return;
            }
            for(let i in userVerifications) {
                var userVerification = userVerifications[i];
                if(this.provider === userVerification["name"]) {
                    this.done(true);
                    return;
                }
            }
            this.done(null);
            return;
        } else {
            Logger.error("CheckUserAction::start() Unknown check:", this.check);
            this.done(null);
        }
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
