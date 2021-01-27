const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class CompleteMentionsAction extends Action {
    constructor(answerKey, onlyCompleteAll) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.answerKey = answerKey;
        this.onlyCompleteAll = onlyCompleteAll;
    }

    async start(flowCallback) {
        if(!this.flow.msg || !this.flow.control) {
            this.onError("CompleteMentionsAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }
        let answers = this.flow.answers;
        let mentions = answers.get(this.answerKey);
        if(this.onlyCompleteAll && (mentions.length > 1 || mentions[0]["id"] !== "@all")) {
            Logger.debug("CompleteMentionsAction::start() Set to only complete all and all tag is not used");
            flowCallback();
            return;
        }
        let question = this.flow.getQuestion(this.answerKey);
        let chatId = this.flow.msg.message.room;
        let isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
        let excludeIds;
        if(!question || !question.robotAllowed) {
            excludeIds = [];
            excludeIds.push(this.flow.control.robotUserId);
        }
        Logger.debug("CompleteMentionsAction::start() Completing mention data");
        let mentionedMembers = await this.flow.control.messengerClient.completeMentions(mentions, excludeIds, chatId, isGroup, false);
        if(mentionedMembers) {
            answers.add(this.answerKey, mentionedMembers);
        }
        flowCallback();
    }
}

module.exports = CompleteMentionsAction;
