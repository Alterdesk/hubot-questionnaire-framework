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
        var answers = this.flow.answers;
        var filename = this.getAnswerValue(this.filename, answers, "");
        for(let i in this.filenameFormatters) {
            var formatter = this.filenameFormatters[i];
            filename = formatter.execute(filename, this.flow);
        }
        filename = StringTools.safeFilename(filename);
        if(!filename || filename.length === 0) {
            Logger.error("ChatPdfAction::start() Invalid filename:", this.filename);
            if(this.errorMessage && this.errorMessage.length > 0) {
                this.flow.msg.send(this.errorMessage);
            }
            flowCallback();
            return;
        }
        var msg = this.flow.msg;
        var control = this.flow.control;
        var messengerClient = control.messengerClient;

        var sourceChatId = msg.message.room;
        var sourceIsGroup = ChatTools.isUserInGroup(msg.message.user);
        if(!sourceChatId) {
            Logger.error("ChatPdfAction::start() Invalid source chat id");
            flowCallback();
            return;
        }

        var destinationChatId;
        var destinationIsGroup;
        var destinationIsAux;
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
            Logger.error("ChatPdfAction::start() Invalid destination chat id");
            flowCallback();
            return;
        }

        var messageText = this.getAnswerValue(this.messageText, answers, "");
        for(let i in this.messageFormatters) {
            var formatter = this.messageFormatters[i];
            messageText = formatter.execute(messageText, this.flow);
        }

        var startDate = this.getAnswerValue(this.startDate, answers);
        var endDate = this.getAnswerValue(this.endDate, answers);

        var filePath = await messengerClient.downloadChatPdf(filename, startDate, endDate, sourceChatId, sourceIsGroup, false);
        if(!filePath) {
            Logger.error("ChatPdfAction::start() Unable to generate PDF");
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

        var sendMessageData = new SendMessageData();
        sendMessageData.setMessage(messageText);
        sendMessageData.setChat(destinationChatId, destinationIsGroup, destinationIsAux);
        sendMessageData.addAttachmentPath(filePath);
        var overrideToken = this.getAnswerValue(this.overrideToken, answers);
        if(overrideToken) {
            sendMessageData.setOverrideToken(overrideToken);
        }

        var json = await messengerClient.sendMessage(sendMessageData);
        var messageSuccess = json != null;
        if(this.answerKey) {
            answers.add(this.answerKey, messageSuccess);
            if(messageSuccess) {
                answers.add(this.answerKey + "_file_path", filePath);
            }
        }
        if(messageSuccess) {
            Logger.debug("ChatPdfAction::start() PDF message sent successfully");
        } else {
            Logger.error("ChatPdfAction::start() Unable to send PDF");
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

    setMessageText(messageText) {
        this.messageText = messageText;
    }

    addMessageFormatter(formatter) {
        this.messageFormatters.push(formatter);
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
