const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class DownloadAttachmentsAction extends Action {
    constructor(answerKey) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.answerKey = answerKey;
    }

    async start(flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            Logger.error("DownloadAttachmentsAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }
        var answers = this.flow.answers;
        var answerKey = ChatTools.getAnswerKey(this.answerKey, this.flow);
        var attachments = answers.get(answerKey);
        if(!attachments || attachments.length === 0) {
            Logger.debug("DownloadAttachmentsAction::start() No attachments on answer key:", answerKey);
            flowCallback();
            return;
        }
        Logger.debug("DownloadAttachmentsAction::start() Got " + attachments.length + " attachments");

        var chatId = this.flow.msg.message.room;
        var isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
        var isAux = false;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isGroup = this.getAnswerValue(this.isGroup, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        }
        var overrideToken = this.getAnswerValue(this.overrideToken, answers);

        var downloaded = 0;
        for(let i in attachments) {
            var attachment = attachments[i];
            var filePath = await this.flow.control.messengerClient.downloadAttachment(attachment, chatId, isGroup, isAux, overrideToken);
            if(filePath) {
                answers.add(answerKey + "_file_path_" + i, filePath);
                downloaded++;
            }
        }
        if(downloaded === 0) {
            Logger.error("DownloadAttachmentsAction::start() No attachments downloaded");
        } else {
            Logger.debug("DownloadAttachmentsAction::start() Downloaded " + downloaded + " attachments");
        }
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
}

module.exports = DownloadAttachmentsAction;
