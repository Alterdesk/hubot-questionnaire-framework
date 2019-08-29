const {Response, User, Message, TextMessage} = require('hubot');

class ChatTools {

    // Alterdesk adapter uses separate user id field(user.id in groups consists of (group_id + user_id)
    static getUserId(user) {
        if(user.user_id != null) {
            return user.user_id;
        }
        return user.id;
    }

    // Alterdesk adapter uses user.is_groupchat variable to pass group chat id when message was sent in group
    static isUserInGroup(user) {
        if(user.is_groupchat != null) {
            return user.is_groupchat;
        }
        return false;
    }

    static createHubotUser(userId, chatId, isGroup) {
        var user = new User(userId);
        user.is_groupchat = isGroup;
        user.user_id = userId;
        user.room = chatId;
        user.name = chatId;
        return user;
    }

    static createHubotResponse(robot, userId, chatId, isGroup) {
        var user = ChatTools.createHubotUser(userId, chatId, isGroup);
        var message = new Message(user);
        message.room = chatId;
        return new Response(robot, message, true);
    }

    static hubotMessageToResponse(robot, message) {
        return new Response(robot, message, true);
    }

    static createHubotTextMessage(userId, chatId, isGroup, text) {
        var user = ChatTools.createHubotUser(userId, chatId, isGroup);
        var textMessage = new TextMessage(user, text, "dummy_id");
        textMessage.room = chatId;
        return textMessage;
    }

    static getAnswerKey(answerKey, flow, forceRepeatIteration) {
        if(!answerKey || answerKey.length === 0) {
            return null;
        }
        var repeatIteration;
        if(typeof forceRepeatIteration === "number") {
            repeatIteration = forceRepeatIteration;
        } else if(flow) {
            repeatIteration = flow.repeatIteration;
        }
        if(typeof repeatIteration === "number" && repeatIteration > -1) {//} && answerKey.indexOf("#") !== -1) {  // TODO Temporary fallback for old checks
            if(answerKey.indexOf("#") !== -1) {
                answerKey = answerKey.replace("#", repeatIteration);
            } else {
                answerKey += "_" + repeatIteration;
            }
        }
        return answerKey;
    }

    static getChatUserKey(chatId, userId) {
        return chatId + "/" + userId;
    }

}

module.exports = ChatTools;