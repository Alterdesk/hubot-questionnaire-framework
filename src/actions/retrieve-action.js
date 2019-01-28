const Action = require('./action.js');
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
        // TODO Override token
        if(this.chatId) {
            this.flow.control.messengerApi.getChat(this.chatId, this.isGroup, this.isAux, (success, json) => {
                if(!success || !json) {
                    this.done(null);
                    return;
                }
                this.done(json);
                return;
            });
        } else if(this.userId) {
            this.flow.control.messengerApi.getUser(this.userId, this.isAux, (success, json) => {
                if(!success || !json) {
                    this.done(null);
                    return;
                }
                this.done(json);
                return;
            });
        } else {
            Logger.error("RetrieveAction::start() Invalid retrieve data");
            this.done(null);
            return;
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

    reset(answers) {
        super.reset(answers);
        if(this.answerKey) {
            answers.remove(this.answerKey);
        }
    }
}

module.exports = RetrieveAction;