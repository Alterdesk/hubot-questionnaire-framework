const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class RetrieveAction extends Action {
    constructor() {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
    }

    start(response, answers, flowCallback) {
        this.answers = answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("RetrieveAction::start() Invalid Flow, Control or MessengerApi");
            this.done(null);
            return;
        }

        if(this.chatId) {
            var chatIdValue = AnswerOrFixed.get(this.chatId, answers);
            if(!chatIdValue) {
                Logger.error("RetrieveAction::start() Invalid chat id");
                this.done(null);
                return;
            }
            var isGroupValue = AnswerOrFixed.get(this.isGroup, answers);
            var isAuxValue = AnswerOrFixed.get(this.isAux, answers);
            this.flow.control.messengerApi.getChat(chatIdValue, isGroupValue, isAuxValue, (success, json) => {
                this.done(json);
                return;
            }, this.overrideToken);
        } else if(this.userId) {
            var userIdValue = AnswerOrFixed.get(this.userId, answers);
            if(!userIdValue) {
                Logger.error("RetrieveAction::start() Invalid user id");
                this.done(null);
                return;
            }
            var isAuxValue = AnswerOrFixed.get(this.isAux, answers);
            this.flow.control.messengerApi.getUser(userIdValue, isAuxValue, (success, json) => {
                this.done(json);
                return;
            }, this.overrideToken);
        } else {
            Logger.error("RetrieveAction::start() Invalid retrieve data");
            this.done(null);
            return;
        }
    }

    done(value) {
        if(this.answerKey && value != null) {
            this.answers.add(this.answerKey, value);
            if(this.chatId) {
                var subject = value["subject"];
                if(subject) {
                    this.answers.add(this.answerKey + "_subject", subject);
                }
                var closed = value["closed"];
                if(closed != null) {
                    this.answers.add(this.answerKey + "_closed", closed);
                }
                var members = value["members"];
                if(members) {
                    for(let i in members) {
                        var member = members[i];
                        var firstName = member["first_name"];
                        if(firstName) {
                            this.answers.add(this.answerKey + "_member_first_name_" + i, firstName);
                        }
                        var lastName = member["last_name"];
                        if(lastName) {
                            this.answers.add(this.answerKey + "_member_last_name_" + i, lastName);
                        }
                        this.answers.add(this.answerKey + "_member_" + i, member);
                    }
                    this.answers.add(this.answerKey + "_members", members.length);
                }
            } else if(this.userId) {
                this.answers.addObject(this.answerKey, value);
            }
            Logger.error("RetrieveAction::done() Answers", this.answers.toJson());
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

    reset(answers) {
        super.reset(answers);
        if(this.answerKey) {
            answers.remove(this.answerKey);
        }
    }
}

module.exports = RetrieveAction;