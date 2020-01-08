const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class ChangeSubjectAction extends Action {
    constructor(subject) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.subject = subject;
        this.subjectFormatters = [];
    }

    async start(flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            Logger.error("ChangeSubjectAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }
        var answers = this.flow.answers;
        var subjectValue = this.getAnswerValue(this.subject, answers, "");
        for(let i in this.subjectFormatters) {
            var formatter = this.subjectFormatters[i];
            subjectValue = formatter.execute(subjectValue, this.flow);
        }
        if(!subjectValue || subjectValue === "") {
            Logger.error("ChangeSubjectAction::start() Invalid subject:" + subjectValue);
            flowCallback();
            return;
        }

        var chatId;
        var isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        } else {
            var isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
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
        await this.flow.control.messengerClient.changeGroupSubject(chatId, isAux, subjectValue, this.overrideToken);
        flowCallback();
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
}

module.exports = ChangeSubjectAction;