const Action = require('./action.js');
const Logger = require('./../logger.js');

class CompleteMentionsAction extends Action {
    constructor(answerKey, onlyCompleteAll) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.answerKey = answerKey;
        this.onlyCompleteAll = onlyCompleteAll;
    }

    start(response, answers, flowCallback) {
        if(!this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            Logger.error("CompleteMentionsAction::start() Invalid Flow or MessengerApi not set");
            flowCallback();
            return;
        }
        var mentions = answers.get(this.answerKey);
        if(this.onlyCompleteAll && (mentions.length > 1 || mentions[0]["id"] !== "@all")) {
            Logger.debug("CompleteMentionsAction::start() Set to only complete all and all tag is not used");
            flowCallback();
            return;
        }
        var question = this.flow.getQuestion(this.answerKey);
        var chatId = this.flow.msg.message.room;
        var isGroup = this.flow.control.isUserInGroup(this.flow.msg.message.user);
        var excludeIds;

        if(question && !question.robotAllowed) {
            excludeIds = [];
            excludeIds.push(this.flow.control.robotUserId);
        }
        Logger.debug("CompleteMentionsAction::start() Completing mention data");
        this.flow.control.messengerApi.completeMentions(mentions, excludeIds, chatId, isGroup, false, (mentionedMembers) => {
            if(mentionedMembers) {
                answers.add(this.answerKey, mentionedMembers);
            }
            flowCallback();
        });
    }
}

module.exports = CompleteMentionsAction;