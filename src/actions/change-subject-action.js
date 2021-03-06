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
            this.onError("ChangeSubjectAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }
        let answers = this.flow.answers;
        let subjectValue = this.getAnswerValue(this.subject, answers, "");
        for(let formatter of this.subjectFormatters) {
            subjectValue = formatter.execute(subjectValue, this.flow);
        }
        if(!subjectValue || subjectValue === "") {
            this.onError("ChangeSubjectAction::start() Invalid subject:" + subjectValue);
            flowCallback();
            return;
        }

        let chatId;
        let isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        } else {
            let isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                Logger.warn("ChangeSubjectAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            this.onError("ChangeSubjectAction::start() Invalid chat id");
            flowCallback();
            return;
        }
        let overrideToken = this.getAnswerValue(this.overrideToken, answers);
        await this.flow.control.messengerClient.changeGroupSubject(chatId, isAux, subjectValue, overrideToken);
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

    addSubjectFormatters(formatters) {
        this.subjectFormatters = this.subjectFormatters.concat(formatters);
    }
}

module.exports = ChangeSubjectAction;
