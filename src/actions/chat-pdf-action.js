const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const StringTools = require('./../utils/string-tools.js');
const Logger = require('./../logger.js');
const SendMessageData = require('./../containers/send-message-data.js');

class ChatPdfAction extends Action {
    constructor(filename) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.filenameFormatters = [];
        this.messageFormatters = [];
        this.filename = filename;
        this.isAux = false;
    }

    async start(flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control) {
            flowCallback();
            return;
        }
        let answers = this.flow.answers;
        let filename = this.getAnswerValue(this.filename, answers, "");
        for(let formatter of this.filenameFormatters) {
            filename = formatter.execute(filename, this.flow);
        }
        filename = StringTools.safeFilename(filename);
        if(!filename || filename.length === 0) {
            this.onError("ChatPdfAction::start() Invalid filename:", this.filename);
            if(this.errorMessage && this.errorMessage.length > 0) {
                this.flow.msg.send(this.errorMessage);
            }
            flowCallback();
            return;
        }
        let msg = this.flow.msg;
        let control = this.flow.control;
        let messengerClient = control.messengerClient;

        let sourceChatId = msg.message.room;
        let sourceIsGroup = ChatTools.isUserInGroup(msg.message.user);
        if(!sourceChatId) {
            this.onError("ChatPdfAction::start() Invalid source chat id");
            flowCallback();
            return;
        }

        let destinationChatId;
        let destinationIsGroup;
        let destinationIsAux;
        if(this.chatId) {
            destinationChatId = this.getAnswerValue(this.chatId, answers);
            destinationIsGroup = this.getAnswerValue(this.isGroup, answers);
            destinationIsAux = this.getAnswerValue(this.isAux, answers);
        } else {
            destinationChatId = sourceChatId;
            destinationIsGroup = sourceIsGroup;
            destinationIsAux = false;
        }
        if(!destinationChatId) {
            this.onError("ChatPdfAction::start() Invalid destination chat id");
            flowCallback();
            return;
        }

        let messageText = this.getAnswerValue(this.messageText, answers, "");
        for(let formatter of this.messageFormatters) {
            messageText = formatter.execute(messageText, this.flow);
        }

        let startDate = this.getAnswerValue(this.startDate, answers);
        let endDate = this.getAnswerValue(this.endDate, answers);

        let filePath = await messengerClient.downloadChatPdf(filename, startDate, endDate, sourceChatId, sourceIsGroup, false);
        if(!filePath) {
            this.onError("ChatPdfAction::start() Unable to generate PDF: chatId: " + sourceChatId + " isGroup: " + sourceIsGroup);
            if(this.answerKey) {
                answers.add(this.answerKey, false);
            }
            if(this.errorMessage && this.errorMessage.length > 0) {
                this.flow.msg.send(this.errorMessage);
            }
            flowCallback();
            return;
        }
        Logger.debug("ChatPdfAction::start() Generated PDF: " + filePath);

        let sendMessageData = new SendMessageData();
        sendMessageData.setMessage(messageText);
        sendMessageData.setChat(destinationChatId, destinationIsGroup, destinationIsAux);
        sendMessageData.addAttachmentPath(filePath);
        let overrideToken = this.getAnswerValue(this.overrideToken, answers);
        if(overrideToken) {
            sendMessageData.setOverrideToken(overrideToken);
        }

        let json = await messengerClient.sendMessage(sendMessageData);
        let messageSuccess = json != null;
        if(this.answerKey) {
            answers.add(this.answerKey, messageSuccess);
            if(messageSuccess) {
                answers.add(this.answerKey + "_file_path", filePath);
            }
        }
        if(messageSuccess) {
            Logger.debug("ChatPdfAction::start() PDF message sent successfully");
        } else {
            this.onError("ChatPdfAction::start() Unable to send PDF");
            if(this.errorMessage && this.errorMessage.length > 0) {
                this.flow.msg.send(this.errorMessage);
            }
        }
        flowCallback();
    }

    setAnswerKey(answerKey) {
        this.answerKey = answerKey;
    }

    addFilenameFormatter(formatter) {
        this.filenameFormatters.push(formatter);
    }

    addFilenameFormatters(formatters) {
        this.filenameFormatters = this.filenameFormatters.concat(formatters);
    }

    setMessageText(messageText) {
        this.messageText = messageText;
    }

    addMessageFormatter(formatter) {
        this.messageFormatters.push(formatter);
    }

    addMessageFormatters(formatters) {
        this.messageFormatters = this.messageFormatters.concat(formatters);
    }

    setStartDate(startDate) {
        this.startDate = startDate;
    }

    setEndDate(endDate) {
        this.endDate = endDate;
    }

    setChatId(chatId) {
        this.chatId = chatId;
    }

    setIsGroup(isGroup) {
        this.isGroup = isGroup;
    }

    setIsAux(isAux) {
        this.isAux = isAux;
    }

    setErrorMessage(errorMessage) {
        this.errorMessage = errorMessage;
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }
}

module.exports = ChatPdfAction;
