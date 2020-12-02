const Action = require('./action.js');
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
            var chatIdValue = this.getAnswerValue(this.chatId, answers);
            if(!chatIdValue) {
                Logger.error("RetrieveAction::start() Invalid chat id");
                this.done(null);
                return;
            }
            var isGroupValue = this.getAnswerValue(this.isGroup, answers);
            var isAuxValue = this.getAnswerValue(this.isAux, answers);
            var overrideToken = this.getAnswerValue(this.overrideToken, answers);
            var json = await this.flow.control.messengerClient.getChat(chatIdValue, isGroupValue, isAuxValue, overrideToken);
            this.done(json);
            return;
        } else if(this.userId) {
            var userIdValue = this.getAnswerValue(this.userId, answers);
            if(!userIdValue) {
                Logger.error("RetrieveAction::start() Invalid user id");
                this.done(null);
                return;
            }
            var isAuxValue = this.getAnswerValue(this.isAux, answers);
            var overrideToken = this.getAnswerValue(this.overrideToken, answers);
            var json = await this.flow.control.messengerClient.getUser(userIdValue, isAuxValue, overrideToken);
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
            if(this.chatId) {
                var id = value["id"];
                if(id) {
                    answers.add(answerKey + "_id", id);
                }
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
                    var memberIds = [];
                    for(let i in members) {
                        var member = members[i];
                        var memberId = member["id"];
                        if(memberId) {
                            answers.add(answerKey + "_member_id_" + i, memberId);
                            memberIds.push(memberId);
                        }
                        var firstName = member["first_name"];
                        if(firstName) {
                            answers.add(answerKey + "_member_first_name_" + i, firstName);
                        }
                        var lastName = member["last_name"];
                        if(lastName) {
                            answers.add(answerKey + "_member_last_name_" + i, lastName);
                        }
                        var memberCompanyId = member["id"];
                        if(memberCompanyId) {
                            answers.add(answerKey + "_member_company_id_" + i, memberCompanyId);
                        }
                        answers.add(answerKey + "_member_" + i, member);
                    }
                    answers.add(answerKey + "_members", members.length);
                    answers.add(answerKey + "_member_ids", memberIds);
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
