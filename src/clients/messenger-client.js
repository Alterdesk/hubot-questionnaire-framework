const DateTools = require('./../utils/date-tools.js');
const StringTools = require('./../utils/string-tools.js');
const JsonRestClient = require('./json-rest-client.js');
const Logger = require('./../logger.js');

class MessengerClient extends JsonRestClient {
    constructor(control) {
        let url = process.env.HUBOT_ALTERDESK_URL || process.env.NODE_ALTERDESK_URL || "https://api.alterdesk.com/v1/";
        let port = process.env.HUBOT_ALTERDESK_PORT || process.env.NODE_ALTERDESK_PORT || 443;
        super(url, port, "MessengerClient");
        let token = process.env.HUBOT_ALTERDESK_TOKEN || process.env.NODE_ALTERDESK_TOKEN;
        if(token) {
            this.setApiToken(token);
        }
        this.control = control;
    }

    sendMessage(sendMessageData) {
        Logger.debug("MessengerClient::sendMessage() ", sendMessageData);

        let postUrl = sendMessageData.getPostUrl();
        let postData = sendMessageData.getPostData();
        let overrideToken = sendMessageData.getOverrideToken();

        let hubotMessage = sendMessageData.getHubotMessage();
        if(hubotMessage) {
            this.control.sendComposing(hubotMessage);
        }

        if(sendMessageData.hasAttachments()) {
            let filePaths = sendMessageData.getAttachmentPaths();
            return this.postMultipart(postUrl, postData, "files", filePaths, overrideToken)
        } else {
            return this.post(postUrl, postData, overrideToken);
        }
    }

    getMessage(messageId, chatId, isGroup, isAux, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            chatId = StringTools.removeDiacritics(chatId);
        }
        if(isGroup) {
            methodPrefix += "groupchats/";
        } else {
            methodPrefix += "conversations/";
        }
        return this.get(methodPrefix + encodeURIComponent(chatId) + "/messages/" + messageId, overrideToken);
    }

    downloadAttachment(attachment, chatId, isGroup, isAux, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                Logger.debug("MessengerClient::downloadAttachment() ", attachment);
                let attachmentId = attachment["id"];
                let filename = attachment["name"];
                let mime = attachment["mime_type"];

                let getData = {};
                getData["headers"] = false;
                let methodPrefix = "";
                if(isAux) {
                    methodPrefix += "aux/"
                    chatId = StringTools.removeDiacritics(chatId);
                }
                if(isGroup) {
                    methodPrefix += "groupchats/";
                } else {
                    methodPrefix += "conversations/";
                }
                let getUrl = methodPrefix + encodeURIComponent(chatId) + "/attachments/" + attachmentId + this.toGetParameters(getData);
                let urlJson = await this.get(getUrl, overrideToken);
                if(!urlJson) {
                    Logger.error("MessengerClient::downloadAttachment() Unable to retrieve download url:", attachment);
                    resolve(null);
                    return;
                }
                let url = urlJson["link"];
                let downloadPath = await this.download(url, filename, mime, overrideToken);
                if(!downloadPath) {
                    Logger.error("MessengerClient::downloadAttachment() Unable to download attachment:", url, attachment);
                    resolve(null);
                    return;
                }
                Logger.debug("Api:downloadAttachment() Downloaded at " + downloadPath);
                resolve(downloadPath);
            } catch(err) {
                Logger.error(err);
                resolve(null);
            }
        });
    }

    downloadChatPdf(filename, startDate, endDate, chatId, isGroup, isAux, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                Logger.debug("MessengerClient::downloadChatPdf()");
                let json = await this.getChatPdfUrl(chatId, isGroup, isAux, startDate, endDate, overrideToken);
                if(!json) {
                    resolve(null);
                    return;
                }
                let url = json["link"];
                if(!url) {
                    resolve(null);
                    return;
                }
                let path = await this.download(url, filename, "application/pdf", overrideToken);
                resolve(path);
            } catch(err) {
                Logger.error(err);
                resolve(null);
            }
        });
    }

    getChatPdfUrl(chatId, isGroup, isAux, startDate, endDate, overrideToken) {
        return new Promise(async (resolve) => {
            try {
                let getData = {};
                if(startDate) {
                    getData["start_date"] = this.dateToString(startDate);
                }
                if(endDate) {
                    getData["end_date"] = this.dateToString(endDate);
                }
                getData["headers"] = false;
                let methodPrefix = "";
                if(isAux) {
                    methodPrefix += "aux/"
                    chatId = StringTools.removeDiacritics(chatId);
                }
                if(isGroup) {
                    methodPrefix += "groupchats/";
                } else {
                    methodPrefix += "conversations/";
                }
                let json = await this.get(methodPrefix + encodeURIComponent(chatId) + "/pdf" + this.toGetParameters(getData), overrideToken);
                resolve(json);
            } catch(err) {
                Logger.error(err);
                resolve(null);
            }
        });
    }

    inviteUser(inviteUserData) {
        let postData = inviteUserData.getPostData();
        let postUrl = inviteUserData.getPostUrl();
        let overrideToken = inviteUserData.getOverrideToken();
        return this.post(postUrl, postData, overrideToken);
    }

    createGroup(createGroupData) {
        let postData = createGroupData.getPostData();
        let postUrl = createGroupData.getPostUrl();
        let overrideToken = createGroupData.getOverrideToken();
        return this.post(postUrl, postData, overrideToken);
    }

    changeGroupSettings(groupSettingsData) {
        let putData = groupSettingsData.getPutData();
        let putUrl = groupSettingsData.getPutUrl();
        let overrideToken = groupSettingsData.getOverrideToken();
        return this.put(putUrl, putData, overrideToken);
    }

    getGroupMembers(groupId, isAux, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            groupId = StringTools.removeDiacritics(groupId);
        }
        return this.get(methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/members", overrideToken);
    }

    addGroupMembers(groupId, isAux, userIds, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            groupId = StringTools.removeDiacritics(groupId);
        }
        let memberPutData = {};
        memberPutData["members"] = userIds;
        if(isAux) {
            memberPutData["aux_members"] = false;
        }
        return this.put(methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/members", memberPutData, overrideToken);
    }

    removeGroupMembers(groupId, isAux, userIds, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            groupId = StringTools.removeDiacritics(groupId);
        }
        let memberDeleteData = {};
        memberDeleteData["members"] = userIds;
        if(isAux) {
            memberDeleteData["aux_members"] = false;
        }
        return this.delete(methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/members", memberDeleteData, overrideToken);
    }

    changeGroupSubject(groupId, isAux, subject, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            groupId = StringTools.removeDiacritics(groupId);
        }
        let subjectPutData = {};
        subjectPutData["subject"] = subject;
        return this.put(methodPrefix + "groupchats/" + encodeURIComponent(groupId), subjectPutData, overrideToken);
    }

    changeGroupOwner(groupId, isAux, userId, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            groupId = StringTools.removeDiacritics(groupId);
        }
        let ownerPutData = {};
        ownerPutData["user_id"] = userId;
        return this.put(methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/owner", ownerPutData, overrideToken);
    }

    changeGroupAdmins(groupId, isAux, admin, memberIds, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            groupId = StringTools.removeDiacritics(groupId);
        }
        let adminPutData = {};
        adminPutData["admins"] = memberIds;
        if(admin) {
            return this.put(methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/admins", adminPutData, overrideToken);
        } else {
            return this.delete(methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/admins", adminPutData, overrideToken);
        }
    }

    changeGroupAvatar(groupId, isAux, avatarPath, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            groupId = StringTools.removeDiacritics(groupId);
        }
        let postUrl = methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/avatar";
        return this.postMultipart(postUrl, null, "avatar", [avatarPath], overrideToken);
    }

    closeGroupChat(groupId, isAux, sendEmail, overrideToken) {
        let closePostData = {};
        closePostData["send_email"] = sendEmail;

        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            groupId = StringTools.removeDiacritics(groupId);
        }
        return this.delete(methodPrefix + "groupchats/" + encodeURIComponent(groupId), closePostData, overrideToken);
    }

    removeGroupChat(groupId, isAux, sendEmail, overrideToken) {
        let removePostData = {};
        removePostData["send_email"] = sendEmail;
        removePostData["remove"] = true;

        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            groupId = StringTools.removeDiacritics(groupId);
        }
        return this.delete(methodPrefix + "groupchats/" + encodeURIComponent(groupId), removePostData, overrideToken);
    }

    getChat(chatId, isGroup, isAux, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            chatId = StringTools.removeDiacritics(chatId);
        }
        if(isGroup) {
            methodPrefix += "groupchats/";
        } else {
            methodPrefix += "conversations/";
        }
        return this.get(methodPrefix + encodeURIComponent(chatId), overrideToken);
    }

    getUser(userId, isAux, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            userId = StringTools.removeDiacritics(userId);
        }
        return this.get(methodPrefix + "users/" + encodeURIComponent(userId), overrideToken);
    }

    getUserProviders(userId, overrideToken) {
        return this.get("users/" + userId + "/providers", overrideToken);
    }

    getUserVerifications(userId, overrideToken) {
        return this.get("users/" + userId + "/verifications", overrideToken);
    }

    askUserVerification(userId, providerId, chatId, isGroup, isAux, overrideToken) {
        let methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
            chatId = StringTools.removeDiacritics(chatId);
        }
        if(isGroup) {
            methodPrefix += "groupchats/";
        } else {
            methodPrefix += "conversations/";
        }
        let postUrl = methodPrefix + encodeURIComponent(chatId) + "/verification";
        let postData = {};
        postData["user_id"] = userId;
        postData["provider_id"] = providerId;
        return this.post(postUrl, postData, overrideToken);
    }

    completeMentions(mentions, excludeIds, chatId, isGroup, isAux) {
        return new Promise(async (resolve) => {
            try {
                Logger.debug("MessengerClient::completeMentions()");
                if(!mentions) {
                    Logger.error("MessengerClient::completeMentions() Invalid mentions to complete:", mentions);
                    resolve(null);
                    return;
                }
                let mentionedMembers = [];
                if(isGroup) {
                    for(let mention of mentions) {
                        let memberId = mention["id"];
                        if(typeof memberId !== "string") {
                            Logger.error("MessengerClient::completeMentions() Invalid mention user id:", memberId, mention);
                            continue;
                        }
                        if(memberId.toUpperCase() === "@ALL") {
                            Logger.debug("MessengerClient::completeMentions() Retrieving group members");
                            mentions = await this.getGroupMembers(chatId, isAux);
                            if(!mentions) {
                                Logger.error("MessengerClient::completeMentions() Invalid group members:", mentions);
                                resolve(null);
                                return;
                            }
                            break;
                        }
                    }
                }

                for(let mention of mentions) {
                    let memberId = mention["id"];
                    if(typeof memberId !== "string") {
                        Logger.error("MessengerClient::completeMentions() Invalid mention user id:", memberId, mention);
                        continue;
                    }
                    if(excludeIds != null && excludeIds.includes(memberId)) {
                        Logger.debug("MessengerClient::completeMentions() Excluded user as mention:", memberId);
                        continue;
                    }
                    if(!mention["first_name"] || !mention["last_name"]) {
                        let memberJson = await this.getUser(memberId);
                        if(memberJson) {
                            mentionedMembers.push(memberJson);
                        }
                    } else {
                        mentionedMembers.push(mention);
                    }
                }

                resolve(mentionedMembers);
            } catch(err) {
                Logger.error(err);
                resolve(null);
            }
        });
    }

    // Format a date to a timestamp
    dateToString(date) {
        return DateTools.formatToUTC(date, "YYYY-MM-DDTHH:mm:ss") + "Z+00:00";
    }

}

module.exports = MessengerClient;
