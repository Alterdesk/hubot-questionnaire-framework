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
        let answers = this.flow.answers;
        let chatId;
        let isAux;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        } else {
            let isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
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
        let overrideToken = this.getAnswerValue(this.overrideToken, answers);

        let json = await this.flow.control.messengerClient.getGroupMembers(chatId, isAux, overrideToken);
        this.done(json);
    }

    done(value) {
        let answerKey = this.getAnswerKey();
        if(answerKey && value != null) {
            this.flow.answers.add(answerKey, value);
            this.flow.answers.addObject(answerKey, value);

            let memberIds = [];
            let ownerId = "";
            let adminIds = [];
            for(let member of value) {
                let memberId = member["id"];
                if(memberId) {
                    memberIds.push(memberId);
                    if(member["owner"]) {
                        ownerId = memberId;
                    }
                    if(member["admin"]) {
                        adminIds.push(memberId);
                    }
                }
            }
            this.flow.answers.add(answerKey + "_ids", memberIds);
            this.flow.answers.add(answerKey + "_owner_id", ownerId);
            this.flow.answers.add(answerKey + "_admin_ids", adminIds);
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
