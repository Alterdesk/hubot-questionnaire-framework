class GroupSettingsData {
    constructor() {
        this.allowContacts = null; //true;
        this.autoCloseAfter = null; //0;
        this.autoExpireAfter = null; //0;
        this.hybridMessaging = null; //false;
        this.membersCanInvite = null; //true;
    }

    setChat(chatId, isAux) {
        this.chatId = chatId;
        this.isAux = isAux;
    }

    setAllowContacts(allow) {
        this.allowContacts = allow;
    }

    setCloseAfter(after) {
        this.autoCloseAfter = after;
    }

    setExpireAfter(after) {
        this.autoExpireAfter = after;
    }

    setHybridMessaging(hybrid) {
        this.hybridMessaging = hybrid;
    }

    setMembersCanInvite(invite) {
        this.membersCanInvite = invite;
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }

    getOverrideToken() {
        this.overrideToken;
    }

    getPutUrl() {
        if(this.isAux) {
            return "aux/groupchats/" + encodeURIComponent(this.chatId) + "/settings";
        } else {
            return "groupchats/" + encodeURIComponent(this.chatId) + "/settings";
        }
    }

    getPutData() {
        var data = {};

        data["allow_contacts"] = this.allowContacts;
        data["auto_close_after"] = this.autoCloseAfter;
        data["auto_expire_after"] = this.autoExpireAfter;
        data["hybrid_messaging"] = this.hybridMessaging;
        data["members_can_invite"] = this.membersCanInvite;

        return data;
    }
}

module.exports = GroupSettingsData;