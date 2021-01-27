const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class RetrieveMembersAction extends Action {
    constructor() {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
    }

    async start(flowCallback) {
        this.flowCallback = flowCallback;
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            this.onError("RetrieveMembersAction::start() Invalid Flow or Control");
            this.done(null);
            return;
        }
        var answers = this.flow.answers;
        var chatId;
        var isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        } else {
            var isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
            if(!isGroup) {
                Logger.warn("RetrieveMembersAction::start() Not a group chat");
                flowCallback();
                return;
            }
            chatId = this.flow.msg.message.room;
            isAux = false;
        }
        if(!chatId) {
            this.onError("RetrieveMembersAction::start() Invalid chat id");
            this.done(null);
            return;
        }
        var overrideToken = this.getAnswerValue(this.overrideToken, answers);

        var json = await this.flow.control.messengerClient.getGroupMembers(chatId, isAux, overrideToken);
        this.done(json);
    }

    done(value) {
        var answerKey = this.getAnswerKey();
        if(answerKey && value != null) {
            this.flow.answers.add(answerKey, value);
            this.flow.answers.addObject(answerKey, value);

            var memberIds = [];
            for(let member of value) {
                var memberId = member["id"];
                if(memberId) {
                    memberIds.push(memberId);
                }
            }
            this.flow.answers.add(answerKey + "_ids", memberIds);
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
}

module.exports = RetrieveMembersAction;
