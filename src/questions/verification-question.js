const Logger = require('./../logger.js');
const Question = require('./question.js');

// Verification question
class VerificationQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.useListeners = false;
        this.usePendingRequests = true;
    }

    // Set the identity provider for the verification
    setProvider(provider) {
        this.provider = provider;
    }

    // Set a sub flow for when a user is verified
    setVerifiedSubFlow(subFlow) {
        this.verifiedSubFlow = subFlow;
    }

    // Set a sub flow for when a user declines verification
    setUnverifiedSubFlow(subFlow) {
        this.unverifiedSubFlow = subFlow;
    }

    send(control, msg, callback) {
        // Unable to preform question without messenger api
        if(!control.messengerApi) {
            Logger.error("VerificationQuestion:send() Messenger API instance not set");
            this.flow.sendRestartMessage(this.flow.errorText);
            if(this.flow.stoppedCallback) {
                this.flow.stoppedCallback(this.flow.msg, this.flow.answers);
            }
            return;
        }
        if(this.isMultiUser && this.userIds && this.userIds.length > 0) {
            let remainingUserIds = this.getRemainingUserIds();
            if(remainingUserIds && remainingUserIds.length > 0) {
                for(let index in remainingUserIds) {
                    this.sendForUserId(control, msg, callback, remainingUserIds[index]);
                }
            } else {
                Logger.error("VerificationQuestion:send() Got no remaining user ids for multi-user question: " + this.answerKey);
                this.sendForUserId(control, msg, callback, control.getUserId(msg.message.user));
            }
        } else {
            this.sendForUserId(control, msg, callback, control.getUserId(msg.message.user));
        }
    }

    sendForUserId(control, msg, callback, userId) {
        var question = this;

        // Try to retrieve provider for user
        control.messengerApi.getUserProviders(userId, function(providerSuccess, providerJson) {
            if(!providerSuccess) {
                question.flow.sendRestartMessage(question.flow.errorText);
                if(question.flow.stoppedCallback) {
                    question.flow.stoppedCallback(question.flow.msg, question.flow.answers);
                }
                return;
            }
            var providerId;
            for(let i in providerJson) {
                var provider = providerJson[i];
                if(provider["name"] === question.provider) {
                    providerId = provider["provider_id"];
                    break;
                }
            }
            if(providerId) {
                // Got provider, send verification request
                var chatId = msg.message.room;
                var isGroup = control.isUserInGroup(msg.message.user);

                question.setListenersAndPendingRequests(control, msg, callback);

                control.sendComposing(msg);

                control.messengerApi.askUserVerification(userId, providerId, chatId, isGroup, false, function(askSuccess, askJson) {
                    Logger.debug("VerificationQuestion:sendForUserId() Successful: " + askSuccess);
                    if(!askSuccess) {
                        question.flow.sendRestartMessage(question.flow.errorText);
                        if(question.flow.stoppedCallback) {
                            question.flow.stoppedCallback(question.flow.msg, question.flow.answers);
                        }
                        return;
                    }
                    var messageId = askJson["id"];
                    Logger.debug("VerificationQuestion:sendForUserId() Verification message id: " + messageId);
                    question.requestMessageId = messageId;
                });
            } else {
                // Unable to get provider for this user, check if user already verified via provider
                control.messengerApi.getUserVerifications(userId, function(verificationsSuccess, verificationsJson) {
                    if(!verificationsSuccess) {
                        question.flow.sendRestartMessage(question.flow.errorText);
                        if(question.flow.stoppedCallback) {
                            question.flow.stoppedCallback(question.flow.msg, question.flow.answers);
                        }
                        return;
                    }
                    var isVerified = false;
                    var userVerifications = verificationsJson["user"];
                    for(let i in userVerifications) {
                        var verification = userVerifications[i];
                        if(verification["name"] === question.provider) {
                            isVerified = true;
                            break;
                        }
                    }
                    if(isVerified) {
                        question.setSubFlow(question.verifiedSubFlow);
                        question.flow.onAnswer(msg, question, true);
                    } else {
                        question.flow.sendRestartMessage(question.flow.errorText);
                        if(question.flow.stoppedCallback) {
                            question.flow.stoppedCallback(question.flow.msg, question.flow.answers);
                        }
                        return;
                    }
                });
            }
        });
    }

    checkAndParseAnswer(matches, message) {
        if(matches === null || !matches || message.text == null) {
            return null;
        }
        var event = message.text;
        if(event === "conversation_verification_accepted" || event === "groupchat_verification_accepted") {
            this.setSubFlow(this.verifiedSubFlow);
            return true;
        } else if(event === "conversation_verification_rejected" || event === "groupchat_verification_rejected") {
            this.setSubFlow(this.unverifiedSubFlow);
            return false;
        }
        return null;
    }
}

module.exports = VerificationQuestion;