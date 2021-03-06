const Answers = require('./../answers.js');
const ChatTools = require('./../utils/chat-tools.js');
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

    send(callback) {
        let msg = this.flow.msg;
        this.chatId = msg.message.room;
        this.isGroup = ChatTools.isUserInGroup(msg.message.user);

        if(this.isMultiUser && this.userIds && this.userIds.length > 0) {
            let remainingUserIds = this.getRemainingUserIds();
            if(remainingUserIds && remainingUserIds.length > 0) {
                for(let userId of remainingUserIds) {
                    this.sendForUserId(callback, userId);
                }
            } else {
                Logger.error("VerificationQuestion:send() Got no remaining user ids for multi-user question: " + this.answerKey);
                this.sendForUserId(callback, ChatTools.getUserId(msg.message.user));
            }
        } else {
            this.sendForUserId(callback, ChatTools.getUserId(msg.message.user));
        }
    }

    async sendForUserId(callback, userId) {
        let control = this.flow.control;
        // Try to retrieve provider for user
        let providerJson = await control.messengerClient.getUserProviders(userId);
        if(!providerJson) {
            Logger.error("VerificationQuestion:sendForUserId() Unable to retrieve providers for user: " + userId);
            this.flow.stop(true, true);
            return;
        }
        let providerId;
        for(let provider of providerJson) {
            if(provider["name"] === this.provider) {
                providerId = provider["provider_id"];
                break;
            }
        }
        if(providerId) {
            // Got provider, send verification request
            this.setListenersAndPendingRequests(callback);

            control.sendComposing(this.flow.msg);

            let askJson = await control.messengerClient.askUserVerification(userId, providerId, this.chatId, this.isGroup, false);
            if(!askJson) {
                Logger.error("VerificationQuestion:sendForUserId() Unable to send verification request for user: " + userId);
                this.flow.stop(true, true);
                return;
            }
            let messageId = askJson["id"];
            Logger.debug("VerificationQuestion:sendForUserId() Verification message id: " + messageId);
            this.requests[userId] = messageId;
        } else {
            // Unable to get provider for this user, check if user already verified via provider
            let verificationsJson = await control.messengerClient.getUserVerifications(userId);
            if(!verificationsJson) {
                Logger.error("VerificationQuestion:sendForUserId() Unable to retrieve verifications for user: " + userId);
                this.flow.stop(true, true);
                return;
            }
            let isVerified = false;
            let userVerifications = verificationsJson["user"];
            for(let verification of userVerifications) {
                if(verification["name"] === this.provider) {
                    isVerified = true;
                    break;
                }
            }
            if(isVerified) {
                this.setSubFlow(this.verifiedSubFlow);
                this.flow.onAnswer(this.flow.msg, this, true);
            } else {
                Logger.error("VerificationQuestion:sendForUserId() Provider not available for user and not verified: provider: " + this.provider + " user: " + userId);
                this.flow.stop(true, true);
            }
        }
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
                let json = await this.flow.control.messengerClient.getMessage(requestMessageId, this.chatId, this.isGroup, false);
                if(!json) {
                    Logger.error("VerificationQuestion:retrieveAttributes() Unable to retrieve message");
                    resolve(null);
                    return;
                }
                let payload = json["payload"];
                if(!payload || payload["type"] !== "verification_request") {
                    Logger.error("VerificationQuestion:retrieveAttributes() Message has no payload or is wrong type");
                    resolve(null);
                    return;
                }
                let attributes = payload["attributes"];
                if(!attributes) {
                    Logger.error("VerificationQuestion:retrieveAttributes() Payload holds no attributes");
                    resolve(null);
                    return;
                }
                resolve(Answers.fromObject(attributes));
            } catch(err) {
                Logger.error(err);
                resolve(null);
            }
        });
    }

    // Asynchronously retrieve verification attributes
    async finalize(answers, callback) {
        if(this.requests.length === 0) {
            Logger.error("VerificationQuestion:finalize() Data incomplete");
            callback();
            return;
        }

        for(let userId in this.requests) {
            let requestMessageId = this.requests[userId];
            if(this.isMultiUser) {
                let multiAnswers = answers.get(this.answerKey);
                if(multiAnswers.get(userId)) {
                    let attributes = await this.retrieveAttributes(requestMessageId);
                    if(attributes) {
                        let attributesKey = userId + "_attributes";
                        multiAnswers.add(attributesKey, attributes);
                        Logger.info("VerificationQuestion:retrieveAttributes() Successfully stored attributes with answer key: " + attributesKey);
                    }
                } else {
                    Logger.debug("VerificationQuestion:finalize() User not verified: " + userId);
                }
            } else {
                if(answers.get(this.answerKey)) {
                    let attributes = await this.retrieveAttributes(requestMessageId);
                    if(attributes) {
                        let attributesKey = this.answerKey + "_attributes";
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
