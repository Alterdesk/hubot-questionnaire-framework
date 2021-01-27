const Action = require('./action.js');

class RetrieveAction extends Action {
    constructor() {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
    }

    async start(flowCallback) {
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("RetrieveAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }

        let answers = this.flow.answers;
        if(this.chatId) {
            let chatIdValue = this.getAnswerValue(this.chatId, answers);
            if(!chatIdValue) {
                this.onError("RetrieveAction::start() Invalid chat id");
                this.done(null);
                return;
            }
            let isGroupValue = this.getAnswerValue(this.isGroup, answers);
            let isAuxValue = this.getAnswerValue(this.isAux, answers);
            let overrideToken = this.getAnswerValue(this.overrideToken, answers);
            let json = await this.flow.control.messengerClient.getChat(chatIdValue, isGroupValue, isAuxValue, overrideToken);
            this.done(json);
        } else if(this.userId) {
            let userIdValue = this.getAnswerValue(this.userId, answers);
            if(!userIdValue) {
                this.onError("RetrieveAction::start() Invalid user id");
                this.done(null);
                return;
            }
            let isAuxValue = this.getAnswerValue(this.isAux, answers);
            let overrideToken = this.getAnswerValue(this.overrideToken, answers);
            let json = await this.flow.control.messengerClient.getUser(userIdValue, isAuxValue, overrideToken);
            this.done(json);
        } else {
            this.onError("RetrieveAction::start() Invalid retrieve data");
            this.done(null);
        }
    }

    done(value) {
        let answerKey = this.getAnswerKey();
        if(answerKey && value != null) {
            let answers = this.flow.answers;
            if(this.chatId) {
                let id = value["id"];
                if(id) {
                    answers.add(answerKey + "_id", id);
                }
                let subject = value["subject"];
                if(subject) {
                    answers.add(answerKey + "_subject", subject);
                }
                let closed = value["closed"];
                if(closed != null) {
                    answers.add(answerKey + "_closed", closed);
                }
                let members = value["members"];
                if(members) {
                    let memberIds = [];
                    for(let i in members) {
                        let member = members[i];
                        let memberId = member["id"];
                        if(memberId) {
                            answers.add(answerKey + "_member_id_" + i, memberId);
                            memberIds.push(memberId);
                        }
                        let firstName = member["first_name"];
                        if(firstName) {
                            answers.add(answerKey + "_member_first_name_" + i, firstName);
                        }
                        let lastName = member["last_name"];
                        if(lastName) {
                            answers.add(answerKey + "_member_last_name_" + i, lastName);
                        }
                        let memberCompanyId = member["id"];
                        if(memberCompanyId) {
                            answers.add(answerKey + "_member_company_id_" + i, memberCompanyId);
                        }
                        answers.add(answerKey + "_member_" + i, member);
                    }
                    answers.add(answerKey + "_members", members.length);
                    answers.add(answerKey + "_member_ids", memberIds);
                }
                let dialInInfo = value["dial_in_info"];
                if(dialInInfo) {
                    answers.addObject(answerKey + "_dial_in_info", dialInInfo);
                }
                let guestAccess = value["guest_access"];
                if(guestAccess) {
                    answers.addObject(answerKey + "_guest_access", guestAccess);
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
