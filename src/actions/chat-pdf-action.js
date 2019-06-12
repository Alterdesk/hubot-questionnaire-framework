const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class ChatPdfAction extends Action {
    constructor(filename) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.filenameFormatters = [];
        this.messageFormatters = [];
        this.filename = filename;
        this.isAux = false;
    }

    async start(response, answers, flowCallback) {
        if(!this.flow || !this.flow.msg || !this.flow.control || !this.flow.control.messengerApi) {
            flowCallback();
            return;
        }
        var filename = AnswerOrFixed.get(this.filename, answers, "");
        for(let i in this.filenameFormatters) {
            var formatter = this.filenameFormatters[i];
            filename = formatter.execute(filename, answers);
        }
        if(!filename || filename.length === 0) {
            Logger.error("ChatPdfAction::start() Invalid filename:", this.filename);
            if(this.errorMessage && this.errorMessage.length > 0) {
                response.send(this.errorMessage);
            }
            flowCallback();
            return;
        }
        filename = filename.replace(new RegExp(/[\W]+/, 'gi'), "_");
        var msg = this.flow.msg;
        var control = this.flow.control;
        var messengerApi = control.messengerApi;

        var sourceChatId = msg.message.room;
        var sourceIsGroup = control.isUserInGroup(msg.message.user);
        if(!sourceChatId) {
            Logger.error("ChatPdfAction::start() Invalid source chat id");
            flowCallback();
            return;
        }

        var destinationChatId;
        var destinationIsGroup;
        var destinationIsAux;
        if(this.chatId) {
            destinationChatId = AnswerOrFixed.get(this.chatId, answers);
            destinationIsGroup = AnswerOrFixed.get(this.isGroup, answers);
            destinationIsAux = AnswerOrFixed.get(this.isAux, answers);
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

        var messageText = AnswerOrFixed.get(this.messageText, answers, "");
        for(let i in this.messageFormatters) {
            var formatter = this.messageFormatters[i];
            messageText = formatter.execute(messageText, answers);
        }

        var startDate = AnswerOrFixed.get(this.startDate, answers);
        var endDate = AnswerOrFixed.get(this.endDate, answers);

        var filePath = await messengerApi.downloadChatPdf(filename, startDate, endDate, sourceChatId, sourceIsGroup, false);
        if(!filePath) {
            Logger.error("ChatPdfAction::start() Unable to generate PDF");
            if(this.answerKey) {
                answers.add(this.answerKey, false);
            }
            if(this.errorMessage && this.errorMessage.length > 0) {
                response.send(this.errorMessage);
            }
            flowCallback();
            return;
        }
        Logger.debug("ChatPdfAction::start() Generated PDF: " + filePath);
        var messageData = control.createSendMessageData();
        messageData.chatId = destinationChatId;
        messageData.isGroup = destinationIsGroup;
        messageData.isAux = destinationIsAux;
        messageData.message = messageText;
        messageData.addAttachmentPath(filePath);
        messageData.overrideToken = this.overrideToken;
        messengerApi.sendMessage(messageData, (messageSuccess, json) => {
            if(this.answerKey) {
                answers.add(this.answerKey + "_file_path", filePath);
                answers.add(this.answerKey, messageSuccess);
            }
            if(messageSuccess) {
                Logger.debug("ChatPdfAction::start() PDF message sent successfully");
            } else {
                Logger.error("ChatPdfAction::start() Unable to send PDF");
                if(this.errorMessage && this.errorMessage.length > 0) {
                    response.send(this.errorMessage);
                }
            }
            flowCallback();
            // TODO Retry mechanism?
            // TODO Delete PDF after successful send
        });
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
        this.errorMessage;
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }
}

module.exports = ChatPdfAction;