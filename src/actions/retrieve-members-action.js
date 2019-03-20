const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class RetrieveMembersAction extends Action {
    constructor() {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
    }

    start(response, answers, flowCallback) {
        this.answers = answers;
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("RetrieveMembersAction::start() Invalid Flow, Control or MessengerApi");
            this.done(null);
            return;
        }

        var chatId;
        var isAux;
        if(this.chatId) {
            chatId = AnswerOrFixed.get(this.chatId, answers);
            isAux = AnswerOrFixed.get(this.isAux, answers);
        } else {
            var isGroup = this.flow.control.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                Logger.error("RetrieveMembersAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }

        this.flow.control.messengerApi.getGroupMembers(chatId, isAux, (success, json) => {
            this.done(json);
            return;
        }, this.overrideToken);
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

    setChatId(chatId) {
        this.chatId = chatId;
    }

    setIsAux(isAux) {
        this.isAux = isAux;
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

module.exports = RetrieveMembersAction;