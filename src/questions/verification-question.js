const Answers = require('./../answers.js');
const Logger = require('./../logger.js');
const Question = require('./question.js');

// Verification question
class VerificationQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.usePendingRequests = true;
        this.resendOnInvalid = false;
        this.requests = {};
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

    getRequestMessageId(userId) {
        return this.requests[userId];
    }

    send(control, msg, callback) {
        this.control = control;
        this.chatId = msg.message.room;
        this.isGroup = control.isUserInGroup(msg.message.user);

        // Unable to preform question without messenger api
        if(!control.messengerApi) {
            Logger.error("VerificationQuestion:send() Messenger API instance not set");
            this.flow.sendRestartMessage(this.flow.errorText);
            this.flow.stop(false);
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
                Logger.error("VerificationQuestion:sendForUserId() Unable to retrieve providers for user: " + userId);
                this.flow.sendRestartMessage(this.flow.errorText);
                this.flow.stop(false);
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
                        Logger.error("VerificationQuestion:sendForUserId() Unable to send verification request for user: " + userId);
                        this.flow.sendRestartMessage(this.flow.errorText);
                        this.flow.stop(false);
                        return;
                    }
                    var messageId = askJson["id"];
                    Logger.debug("VerificationQuestion:sendForUserId() Verification message id: " + messageId);

                    this.requests[userId] = messageId;
                });
            } else {
                // Unable to get provider for this user, check if user already verified via provider
                control.messengerApi.getUserVerifications(userId, (verificationsSuccess, verificationsJson) => {
                    if(!verificationsSuccess) {
                        Logger.error("VerificationQuestion:sendForUserId() Unable to retrieve verifications for user: " + userId);
                        this.flow.sendRestartMessage(this.flow.errorText);
                        this.flow.stop(false);
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
                        Logger.error("VerificationQuestion:sendForUserId() Provider not available for user and not verified: provider: " + this.provider + " user: " + userId);
                        this.flow.sendRestartMessage(this.flow.errorText);
                        this.flow.stop(false);
                        return;
                    }
                });
            }
        });
    }

    checkAndParseAnswer(matches, message) {
        let value = message.text;
        if(value == null || (matches == null && (typeof(value) !== "boolean"))) {
            return null;
        }
        if(value === true || value === "conversation_verification_accepted" || value === "groupchat_verification_accepted") {
            this.setSubFlow(this.verifiedSubFlow);
            return true;
        } else if(value === false || value === "conversation_verification_rejected" || value === "groupchat_verification_rejected") {
            this.setSubFlow(this.unverifiedSubFlow);
            return false;
        }
        return null;
    }

    retrieveAttributes(requestMessageId) {
        return new Promise(async (resolve) => {
            try {
                this.control.messengerApi.getMessage(requestMessageId, this.chatId, this.isGroup, false, (success, json) => {
                    if(!success) {
                        Logger.error("VerificationQuestion:retrieveAttributes() Unable to retrieve message");
                        resolve(null);
                        return;
                    }
                    var payload = json["payload"];
                    if(!payload || payload["type"] !== "verification_request") {
                        Logger.error("VerificationQuestion:retrieveAttributes() Message has no payload or is wrong type");
                        resolve(null);
                        return;
                    }
                    var attributes = payload["attributes"];
                    if(!attributes) {
                        Logger.error("VerificationQuestion:retrieveAttributes() Payload holds no attributes");
                        resolve(null);
                        return;
                    }
                    resolve(Answers.fromObject(attributes));
                });
            } catch(err) {
                Logger.error(err);
                resolve(null);
            }
        });
    }

    // Asynchronously retrieve verification attributes
    async finalize(answers, callback) {
        if(!this.control || !this.control.messengerApi || this.requests.length === 0) {
            Logger.error("VerificationQuestion:finalize() Messenger API instance not set or data incomplete");
            callback();
            return;
        }

        for(let userId in this.requests) {
            var requestMessageId = this.requests[userId];
            if(this.isMultiUser) {
                var multiAnswers = answers.get(this.answerKey);
                if(multiAnswers.get(userId)) {
                    var attributes = await this.retrieveAttributes(requestMessageId);
                    if(attributes) {
                        var attributesKey = userId + "_attributes";
                        multiAnswers.add(attributesKey, attributes);
                        Logger.info("VerificationQuestion:retrieveAttributes() Successfully stored attributes with answer key: " + attributesKey);
                    }
                } else {
                    Logger.debug("VerificationQuestion:finalize() User not verified: " + userId);
                }
            } else {
                if(answers.get(this.answerKey)) {
                    var attributes = await this.retrieveAttributes(requestMessageId);
                    if(attributes) {
                        var attributesKey = this.answerKey + "_attributes";
                        answers.add(attributesKey, attributes);
                        Logger.info("VerificationQuestion:retrieveAttributes() Successfully stored attributes with answer key: " + attributesKey);
                    }
                } else {
                    Logger.debug("VerificationQuestion:finalize() User not verified: " + userId);
                }
            }
        }

        callback();
    }

    reset(answers) {
        super.reset(answers);
        this.requests = {};
        answers.remove(this.answerKey + "_attributes");
    }
}

module.exports = VerificationQuestion;