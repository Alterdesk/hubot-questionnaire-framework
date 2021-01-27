const ChatTools = require('./../utils/chat-tools.js');
const StringTools = require('./../utils/string-tools.js');

class SendMessageData {
    constructor() {
        this.message = "";
        this.attachmentPaths = [];
        this.requestUserIds = [];
        this.questionOptions = [];
    }

    setChat(chatId, isGroup, isAux) {
        this.chatId = chatId;
        this.isGroup = isGroup;
        this.isAux = isAux;
    }

    getChatId() {
        return this.chatId;
    }

    getIsGroup() {
        return this.isGroup;
    }

    getIsAux() {
        return this.isAux;
    }

    setHubotMessage(hubotMessage) {
        this.hubotMessage = hubotMessage;
        this.chatId = hubotMessage.room;
        this.isGroup = ChatTools.isUserInGroup(hubotMessage.user);
        this.isAux = false;
    }

    getHubotMessage() {
        return this.hubotMessage;
    }

    getMessage() {
        return this.message;
    }

    setMessage(message) {
        this.message = message;
    }

    addAttachmentPath(path) {
        this.attachmentPaths.push(path);
    }

    addAttachmentPaths(paths) {
        for(let path of paths) {
            this.attachmentPaths.push(path);
        }
    }

    getAttachmentPaths() {
        return this.attachmentPaths;
    }

    setRequestOptions(multiAnswer, style) {
        this.multiAnswer = multiAnswer;
        this.requestStyle = style;
    }

    addRequestUserId(userId) {
        this.requestUserIds.push(userId);
    }

    addRequestUserIds(userIds) {
        for(let userId of userIds) {
            this.requestUserIds.push(userId);
        }
    }

    addQuestionButton(label, style) {
        let name = StringTools.safeName(label, 32, true);
        this.addQuestionButtonWithName(name, label, style);
    }

    addQuestionButtonWithName(name, label, style) {
        let option = {};
        option["name"] = name;
        option["label"] = label;
        if(style) {
            option["style"] = style;
        }
        this.questionOptions.push(option);
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }

    getOverrideToken() {
        return this.overrideToken;
    }

    hasAttachments() {
        return this.attachmentPaths.length > 0;
    }

    usePostCall() {
        return this.hasAttachments() || this.questionOptions.length > 0 || this.isAux;
    }

    getPostUrl() {
        let methodPrefix = "";
        if(this.isAux) {
            methodPrefix += "aux/"
        }
        if(this.isGroup) {
            methodPrefix += "groupchats/";
        } else {
            methodPrefix += "conversations/";
        }
        if(this.hasAttachments()) {
            return methodPrefix + encodeURIComponent(this.chatId) + "/attachments";
        } else {
            return methodPrefix + encodeURIComponent(this.chatId) + "/messages";
        }
    }

    getPostData() {
        let data = {};
        if(this.hasAttachments()) {
            data["message"] = this.message;
        } else {
            data["body"] = this.message;

            if(this.questionOptions.length > 0) {
                let question = {};
                question["multi_answer"] = this.multiAnswer || false;
                question["style"] = this.requestStyle || "horizontal";
                question["users"] = this.requestUserIds;
                question["options"] = this.questionOptions;
                data["question"] = question;
            }
        }

        return data;
    }
}

module.exports = SendMessageData;
