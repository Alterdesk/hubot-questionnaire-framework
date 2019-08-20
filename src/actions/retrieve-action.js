const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class RetrieveAction extends Action {
    constructor() {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
    }

    async start(flowCallback) {
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            Logger.error("RetrieveAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }

        var answers = this.flow.answers;
        if(this.chatId) {
            var chatIdValue = AnswerOrFixed.get(this.chatId, answers);
            if(!chatIdValue) {
                Logger.error("RetrieveAction::start() Invalid chat id");
                this.done(null);
                return;
            }
            var isGroupValue = AnswerOrFixed.get(this.isGroup, answers);
            var isAuxValue = AnswerOrFixed.get(this.isAux, answers);
            var json = await this.flow.control.messengerClient.getChat(chatIdValue, isGroupValue, isAuxValue, this.overrideToken);
            this.done(json);
            return;
        } else if(this.userId) {
            var userIdValue = AnswerOrFixed.get(this.userId, answers);
            if(!userIdValue) {
                Logger.error("RetrieveAction::start() Invalid user id");
                this.done(null);
                return;
            }
            var isAuxValue = AnswerOrFixed.get(this.isAux, answers);
            var json = await this.flow.control.messengerClient.getUser(userIdValue, isAuxValue, this.overrideToken);
            this.done(json);
            return;
        } else {
            Logger.error("RetrieveAction::start() Invalid retrieve data");
            this.done(null);
            return;
        }
    }

    done(value) {
        var answerKey = this.getAnswerKey();
        if(answerKey && value != null) {
            var answers = this.flow.answers;
            answers.add(answerKey, value);
            if(this.chatId) {
                var subject = value["subject"];
                if(subject) {
                    answers.add(answerKey + "_subject", subject);
                }
                var closed = value["closed"];
                if(closed != null) {
                    answers.add(answerKey + "_closed", closed);
                }
                var members = value["members"];
                if(members) {
                    for(let i in members) {
                        var member = members[i];
                        var firstName = member["first_name"];
                        if(firstName) {
                            answers.add(answerKey + "_member_first_name_" + i, firstName);
                        }
                        var lastName = member["last_name"];
                        if(lastName) {
                            answers.add(answerKey + "_member_last_name_" + i, lastName);
                        }
                        answers.add(answerKey + "_member_" + i, member);
                    }
                    answers.add(answerKey + "_members", members.length);
                }
            } else if(this.userId) {
                answers.addObject(answerKey, value);
            }
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

    setRetrieveChat(chatId, isGroup, isAux) {
        this.chatId = chatId;
        this.isGroup = isGroup;
        this.isAux = isAux;
    }

    setRetrieveUser(userId, isAux) {
        this.userId = userId;
        this.isAux = isAux;
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

module.exports = RetrieveAction;