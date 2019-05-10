const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class ChangeSubjectAction extends Action {
    constructor(subject) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.subject = subject;
        this.subjectFormatters = [];
    }

    start(response, answers, flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("ChangeSubjectAction::start() Invalid Flow, Control or MessengerApi");
            flowCallback();
            return;
        }

        var subjectValue = AnswerOrFixed.get(this.subject, answers, "");
        for(let i in this.subjectFormatters) {
            var formatter = this.subjectFormatters[i];
            subjectValue = formatter.execute(subjectValue, answers);
        }
        if(!subjectValue || subjectValue === "") {
            Logger.error("ChangeSubjectAction::start() Invalid subject:" + subjectValue);
            flowCallback();
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
                Logger.error("ChangeSubjectAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            Logger.error("ChangeSubjectAction::start() Invalid chat id");
            flowCallback();
            return;
        }
        this.flow.control.messengerApi.changeGroupSubject(chatId, isAux, subjectValue, (success, json) => {
            flowCallback();
        }, this.overrideToken);
    }

    setChatId(chatId) {
        this.chatId = chatId;
    }

    setIsAux(isAux) {
        this.isAux = isAux;
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }

    addSubjectFormatter(formatter) {
        this.subjectFormatters.push(formatter);
    }

    reset(answers) {
        super.reset(answers);
        if(this.answerKey) {
            answers.remove(this.answerKey);
        }
    }
}

module.exports = ChangeSubjectAction;