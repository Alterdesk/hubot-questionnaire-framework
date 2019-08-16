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

    static createHubotResponse(userId, chatId, isGroup) {
        var user = new User(userId);
        user.is_groupchat = isGroup;
        var message = new Message(user);
        message.room = chatId;
        return new Response(this.robot, message, true);
    }

}

module.exports = ChatTools;