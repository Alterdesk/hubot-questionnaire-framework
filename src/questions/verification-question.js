const Answers = require('./../answers.js');
const Logger = require('./../logger.js');
const Question = require('./question.js');

// Verification question
class VerificationQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.usePendingRequests = true;
        this.resendOnInvalid = false;
    }

    // Set the identity provider for the verification
    setProvider(provider) {
        this.provider = provider;
    }

    setRetrieveAttributes(retrieveAttributes) {
        this.useFinalize = retrieveAttributes;
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
        this.control = control;
        this.chatId = msg.message.room;
        this.isGroup = control.isUserInGroup(msg.message.user);

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
        // Try to retrieve provider for user
        control.messengerApi.getUserProviders(userId, (providerSuccess, providerJson) => {
            if(!providerSuccess) {
                this.flow.sendRestartMessage(this.flow.errorText);
                if(this.flow.stoppedCallback) {
                    this.flow.stoppedCallback(this.flow.msg, this.flow.answers);
                }
                return;
            }
            var providerId;
            for(let i in providerJson) {
                var provider = providerJson[i];
                if(provider["name"] === this.provider) {
                    providerId = provider["provider_id"];
                    break;
                }
            }
            if(providerId) {
                // Got provider, send verification request
                this.setListenersAndPendingRequests(control, msg, callback);

                control.sendComposing(msg);

                control.messengerApi.askUserVerification(userId, providerId, this.chatId, this.isGroup, false, (askSuccess, askJson) => {
                    Logger.debug("VerificationQuestion:sendForUserId() Successful: " + askSuccess);
                    if(!askSuccess) {
                        this.flow.sendRestartMessage(this.flow.errorText);
                        if(this.flow.stoppedCallback) {
                            this.flow.stoppedCallback(this.flow.msg, this.flow.answers);
                        }
                        return;
                    }
                    var messageId = askJson["id"];
                    Logger.debug("VerificationQuestion:sendForUserId() Verification message id: " + messageId);
                    this.requestMessageId = messageId;
                });
            } else {
                // Unable to get provider for this user, check if user already verified via provider
                control.messengerApi.getUserVerifications(userId, (verificationsSuccess, verificationsJson) => {
                    if(!verificationsSuccess) {
                        this.flow.sendRestartMessage(this.flow.errorText);
                        if(this.flow.stoppedCallback) {
                            this.flow.stoppedCallback(this.flow.msg, this.flow.answers);
                        }
                        return;
                    }
                    var isVerified = false;
                    var userVerifications = verificationsJson["user"];
                    for(let i in userVerifications) {
                        var verification = userVerifications[i];
                        if(verification["name"] === this.provider) {
                            isVerified = true;
                            break;
                        }
                    }
                    if(isVerified) {
                        this.setSubFlow(this.verifiedSubFlow);
                        this.flow.onAnswer(msg, this, true);
                    } else {
                        this.flow.sendRestartMessage(this.flow.errorText);
                        if(this.flow.stoppedCallback) {
                            this.flow.stoppedCallback(this.flow.msg, this.flow.answers);
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

    // Asynchronously retrieve verification attributes
    finalize(answers, callback) {
        if(!answers.get(this.answerKey)) {
            Logger.error("VerificationQuestion:finalize() Not verified");
            callback();
            return;
        }
        if(!this.control || !this.control.messengerApi || !this.requestMessageId) {
            Logger.error("VerificationQuestion:finalize() Messenger API instance not set or data incomplete");
            callback();
            return;
        }
        this.control.messengerApi.getMessage(this.requestMessageId, this.chatId, this.isGroup, false, (success, json) => {
            if(!success) {
                Logger.error("VerificationQuestion:finalize() Unable to retrieve message");
                callback();
                return;
            }
            var payload = json["payload"];
            if(!payload || payload["type"] !== "verification_request") {
                Logger.error("VerificationQuestion:finalize() Message has no payload or is wrong type");
                callback();
                return;
            }
            var attributes = payload["attributes"];
            if(!attributes) {
                Logger.error("VerificationQuestion:finalize() Payload holds no attributes");
                callback();
                return;
            }
            var attributesKey = this.answerKey + "_attributes";
            Logger.info("VerificationQuestion:finalize() Successfully stored attributes with answer key: " + attributesKey);
            answers.add(attributesKey, Answers.fromObject(attributes));
            callback();
        });
    }
}

module.exports = VerificationQuestion;