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
            this.onError("DownloadAttachmentsAction::start() Invalid Flow or Control");
            flowCallback();
            return;
        }
        let answers = this.flow.answers;
        let answerKey = ChatTools.getAnswerKey(this.answerKey, this.flow);
        let attachments = answers.get(answerKey);
        if(!attachments || attachments.length === 0) {
            Logger.debug("DownloadAttachmentsAction::start() No attachments on answer key:", answerKey);
            flowCallback();
            return;
        }
        Logger.debug("DownloadAttachmentsAction::start() Got " + attachments.length + " attachments");

        let chatId = this.flow.msg.message.room;
        let isGroup = ChatTools.isUserInGroup(this.flow.msg.message.user);
        let isAux = false;
        if(this.chatId) {
            chatId = this.getAnswerValue(this.chatId, answers);
            isGroup = this.getAnswerValue(this.isGroup, answers);
            isAux = this.getAnswerValue(this.isAux, answers);
        }
        let overrideToken = this.getAnswerValue(this.overrideToken, answers);

        let downloaded = 0;
        for(let i in attachments) {
            let attachment = attachments[i];
            let filePath = await this.flow.control.messengerClient.downloadAttachment(attachment, chatId, isGroup, isAux, overrideToken);
            if(filePath) {
                answers.add(answerKey + "_file_path_" + i, filePath);
                downloaded++;
            }
        }
        if(downloaded === 0) {
            this.onError("DownloadAttachmentsAction::start() No attachments downloaded");
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
