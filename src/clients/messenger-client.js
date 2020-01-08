const DateTools = require('./../utils/date-tools.js');
const JsonRestClient = require('./json-rest-client.js');
const Logger = require('./../logger.js');

class MessengerClient extends JsonRestClient {
    constructor(control) {
        var url = process.env.HUBOT_ALTERDESK_URL || process.env.NODE_ALTERDESK_URL || "https://api.alterdesk.com/v1/";
        var port = process.env.HUBOT_ALTERDESK_PORT || process.env.NODE_ALTERDESK_PORT || 443;
        super(url, port, "MessengerClient");
        var token = process.env.HUBOT_ALTERDESK_TOKEN || process.env.NODE_ALTERDESK_TOKEN;
        if(token) {
            this.setApiToken(token);
        }
        this.control = control;
    }

    sendMessage(sendMessageData) {
        Logger.debug("MessengerClient::sendMessage() ", sendMessageData);

        var postUrl = sendMessageData.getPostUrl();
        var postData = sendMessageData.getPostData();
        var overrideToken = sendMessageData.getOverrideToken();

        var hubotMessage = sendMessageData.getHubotMessage();
        if(hubotMessage) {
            this.control.sendComposing(hubotMessage);
        }

        if(sendMessageData.hasAttachments()) {
            var filePaths = sendMessageData.getAttachmentPaths();
            return this.postMultipart(postUrl, postData, "files", filePaths, overrideToken)
        } else {
            return this.post(postUrl, postData, overrideToken);
        }
    }

    getMessage(messageId, chatId, isGroup, isAux, overrideToken) {
        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
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
                var attachmentId = attachment["id"];
                var filename = attachment["name"];
                var mime = attachment["mime_type"];

                var getData = {};
                getData["headers"] = false;
                var methodPrefix = "";
                if(isAux) {
                    methodPrefix += "aux/"
                }
                if(isGroup) {
                    methodPrefix += "groupchats/";
                } else {
                    methodPrefix += "conversations/";
                }
                var getUrl = methodPrefix + encodeURIComponent(chatId) + "/attachments/" + attachmentId + this.toGetParameters(getData);
                var urlJson = await this.get(getUrl, overrideToken);
                if(!urlJson) {
                    Logger.error("MessengerClient::downloadAttachment() Unable to retrieve download url:", attachment);
                    resolve(null);
                    return;
                }
                var url = urlJson["link"];
                var downloadPath = await this.download(url, filename, mime, overrideToken);
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
                var json = await this.getChatPdfUrl(chatId, isGroup, isAux, startDate, endDate, overrideToken);
                if(!json) {
                    resolve(null);
                    return;
                }
                var url = json["link"];
                if(!url) {
                    resolve(null);
                    return;
                }
                var path = await this.download(url, filename, "application/pdf", overrideToken);
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
                var getData = {};
                if(startDate) {
                    getData["start_date"] = this.dateToString(startDate);
                }
                if(endDate) {
                    getData["end_date"] = this.dateToString(endDate);
                }
                getData["headers"] = false;
                var methodPrefix = "";
                if(isAux) {
                    methodPrefix += "aux/"
                }
                if(isGroup) {
                    methodPrefix += "groupchats/";
                } else {
                    methodPrefix += "conversations/";
                }
                var json = await this.get(methodPrefix + encodeURIComponent(chatId) + "/pdf" + this.toGetParameters(getData), overrideToken);
                resolve(json);
            } catch(err) {
                Logger.error(err);
                resolve(null);
            }
        });
    }

    inviteUser(inviteUserData) {
        var postData = inviteUserData.getPostData();
        var postUrl = inviteUserData.getPostUrl();
        var overrideToken = inviteUserData.getOverrideToken();
        return this.post(postUrl, postData, overrideToken);
    }

    createGroup(createGroupData) {
        var postData = createGroupData.getPostData();
        var postUrl = createGroupData.getPostUrl();
        var overrideToken = createGroupData.getOverrideToken();
        return this.post(postUrl, postData, overrideToken);
    }

    changeGroupSettings(groupSettingsData) {
        var putData = groupSettingsData.getPutData();
        var putUrl = groupSettingsData.getPutUrl();
        var overrideToken = groupSettingsData.getOverrideToken();
        return this.put(putUrl, putData, overrideToken);
    }

    getGroupMembers(groupId, isAux, overrideToken) {
        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
        }
        return this.get(methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/members", overrideToken);
    }

    addGroupMembers(groupId, isAux, userIds, overrideToken) {
        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
        }
        var memberPutData = {};
        memberPutData["members"] = userIds;
//        memberPutData["aux_members"] = false; TODO
        return this.put(methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/members", memberPutData, overrideToken);
    }

    removeGroupMembers(groupId, isAux, userIds, overrideToken) {
        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
        }
        var memberDeleteData = {};
        memberDeleteData["members"] = userIds;
//        memberDeleteData["aux_members"] = false; TODO
        return this.delete(methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/members", memberDeleteData, overrideToken);
    }

    changeGroupSubject(groupId, isAux, subject, overrideToken) {
        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
        }
        var subjectPutData = {};
        subjectPutData["subject"] = subject;
        return this.put(methodPrefix + "groupchats/" + encodeURIComponent(groupId), subjectPutData, overrideToken);
    }

    changeGroupAvatar(groupId, isAux, avatarPath, overrideToken) {
        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
        }
        var postUrl = methodPrefix + "groupchats/" + encodeURIComponent(groupId) + "/avatar";
        return this.postMultipart(postUrl, null, "avatar", [avatarPath], overrideToken);
    }

    closeGroupChat(groupId, isAux, sendEmail, overrideToken) {
        var closePostData = {};
        closePostData["send_email"] = sendEmail;

        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
        }
        return this.delete(methodPrefix + "groupchats/" + encodeURIComponent(groupId), closePostData, overrideToken);
    }

    getChat(chatId, isGroup, isAux, overrideToken) {
        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
        }
        if(isGroup) {
            methodPrefix += "groupchats/";
        } else {
            methodPrefix += "conversations/";
        }
        return this.get(methodPrefix + encodeURIComponent(chatId), overrideToken);
    }

    getUser(userId, isAux, overrideToken) {
        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
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
        var methodPrefix = "";
        if(isAux) {
            methodPrefix += "aux/"
        }
        if(isGroup) {
            methodPrefix += "groupchats/";
        } else {
            methodPrefix += "conversations/";
        }
        var postUrl = methodPrefix + encodeURIComponent(chatId) + "/verification";
        var postData = {};
        postData["user_id"] = userId;
        postData["provider_id"] = providerId;
        return this.post(postUrl, postData, overrideToken);
    }

    completeMentions(mentions, excludeIds, chatId, isGroup, isAux) {
        return new Promise(async (resolve) => {
            try {
                Logger.debug("MessengerClient::completeMentions()");
                var mentionedMembers = [];
                var userIds = [];
                var mentionedAll = false;
                for(var index in mentions) {
                    var mention = mentions[index];
                    var id = mention["id"];
                    if(id.toUpperCase() === "@ALL") {
                        mentionedAll = true;
                        break;
                    }
                    if(!mention["first_name"] || !mention["last_name"]) {
                        var exclude = false;
                        if(excludeIds != null) {
                            for(var i in excludeIds) {
                                if(mention["id"] === excludeIds[i]) {
                                    exclude = true;
                                    break;
                                }
                            }
                            if(exclude) {
                                continue;
                            }
                        }
                        userIds.push(id);
                    } else {
                        mentionedMembers.push(mention);
                    }
                }
                if(mentionedAll && isGroup) {
                    var json = await this.getGroupMembers(chatId, isAux);
                    if(json) {
                        for(var index in json) {
                            var member = json[index];
                            var exclude = false;
                            if(excludeIds != null) {
                                for(var i in excludeIds) {
                                    if(member["id"] === excludeIds[i]) {
                                        exclude = true;
                                        break;
                                    }
                                }
                                if(exclude) {
                                    Logger.debug("MessengerClient::completeMentions() Ignored message user member as mention");
                                    continue;
                                }
                            }
                            mentionedMembers.push(member);
                        }
                    }
                } else if(userIds.length > 0) {
                    for(var index in userIds) {
                        var json = await this.getUser(userIds[index]);
                        if(json) {
                            mentionedMembers.push(json);
                        }
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