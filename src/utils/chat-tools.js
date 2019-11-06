const {Response, User, Message, TextMessage} = require('hubot');
const RegexTools = require('./regex-tools.js');

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
        if(typeof repeatIteration === "number" && repeatIteration > -1 && answerKey.indexOf("#") !== -1) {
            if(answerKey.indexOf("#") !== -1) {
                answerKey = answerKey.replace("#", repeatIteration);
            }
        }
        return answerKey;
    }

    static getRepeatKey(answerKey) {
        if(typeof answerKey === "string" && answerKey.indexOf("#") !== -1) {
            return answerKey;
        }
        return null;
    }

    static getRepeatedKeys(answerKey, answers) {
        if(typeof answerKey !== "string" || !answers) {
            console.log("getRepeatedKeys() invalid answerkey or answers:", answerKey, answers);
            return null;
        }
        var hashIndex = answerKey.indexOf("#");
        if(hashIndex === -1) {
            console.log("getRepeatedKeys() invalid hash index:", hashIndex);
            return null;
        }
        var keySubstring;
        if(hashIndex === 0) {
            keySubstring = answerKey.substring(hashIndex + 1);
        } else {
            keySubstring = answerKey.substring(0, hashIndex);
        }
        console.log("getRepeatedKeys() got sub string:", keySubstring);
        var result = answers.getKeysContaining(keySubstring);
        console.log("getRepeatedKeys() result:", result);
        if(!result) {
            return null;
        }
        var numberRegex = RegexTools.getNumberOnlyRegex();
        var filteredKeys = [];
        for(let index in result) {
            var key = result[index];
            var replaceResult = key.replace(keySubstring, "");
            if(typeof replaceResult === "string" && replaceResult.match(numberRegex)) {
                filteredKeys.push(key);
            }
        }
        console.log("getRepeatedKeys() filtered:", filteredKeys);
        return filteredKeys;
    }

    static getChatUserKey(chatId, userId) {
        if(chatId === userId) {
            return "conversation/" + userId;
        }
        return "groupchat/" + chatId + "/" + userId;
    }

}

module.exports = ChatTools;