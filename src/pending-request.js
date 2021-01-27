const {Response} = require('hubot');

const Logger = require('./logger.js');

class PendingRequest {
    constructor(msg, callback, question) {
        this.call = this.call.bind(this);
        this.msg = msg;
        this.callback = callback;
        this.question = question;
        this.retryCount = 0;
    }

    // Called when an event was received for the request
    call(responseMessage) {
        Logger.debug("PendingRequest::call() \"" + responseMessage + "\"");
        var userId;
        if(responseMessage.id && responseMessage.id["user_id"]) {
            userId = responseMessage.id["user_id"];
        } else if(responseMessage.user.user_id) {
            userId = responseMessage.user.user_id;
        } else {
            userId = responseMessage.user.id;
        }
        var questionId = this.question.getRequestMessageId(userId)

        if(!questionId) {
            Logger.error("PendingRequest::call() Request message id not set, retry count: " + this.retryCount);
            if(this.retryCount++ < 9) {
                setTimeout(() => {
                    this.call(responseMessage);
                }, 500)
                return;
            }
        }

        // Check if this response if for the correct pending request message
        var requestMessageId;
        if(responseMessage.id && responseMessage.id["message_id"]) {
            requestMessageId = responseMessage.id["message_id"];
        } else {
            requestMessageId = responseMessage.id;
        }

        var text;

        if(requestMessageId === questionId) {
            var event = responseMessage.text;
            if(event === "conversation_question_answer" || event === "groupchat_question_answer") {
                if(responseMessage.id && responseMessage.id["options"]) {
                    var options = responseMessage.id["options"];
                    var optionText = "";
                    for(let option of options) {
                        if(optionText.length > 0) {
                            optionText += "|";
                        }
                        optionText += option;
                    }
                    text = optionText;
                }
            } else if(event === "conversation_verification_accepted" || event === "conversation_verification_rejected"
              || event === "groupchat_verification_accepted" || event === "groupchat_verification_rejected") {
                text = event;
            }
        } else {
            Logger.debug("PendingRequest::call() Message ids do not match");
        }

        responseMessage.text = text;

        if(text) {
            this.matches = text.match(this.question.regex);
        }

        // Call callback
        this.callback(new Response(this.msg.robot, responseMessage, true), this);
    }
}

module.exports = PendingRequest;
