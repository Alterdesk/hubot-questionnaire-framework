const StringTools = require('./../utils/string-tools.js');

class InviteUserData {
    constructor() {
        this.createConversation = false;
        this.sendEmail = true;
    }

    setFirstName(firstName) {
        this.firstName = firstName;
    }

    setLastName(lastName) {
        this.lastName = lastName;
    }

    setEmail(email) {
        this.email = email;
    }

    setPhoneNumber(phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    setAuxId(auxId) {
        this.auxId = auxId;
    }

    getAuxId() {
        return this.auxId;
    }

    setSendEmail(sendEmail) {
        this.sendEmail = sendEmail;
    }

    setInviteMessage(inviteMessage) {
        this.inviteMessage = inviteMessage;
    }

    setCreateConversation(createConversation) {
        this.createConversation = createConversation;
    }

    setInviteType(inviteType) {
        if(inviteType === "COWORKER") {
            this.inviteType = "coworker";
        } else if(inviteType === "CONTACT") {
            this.inviteType = "contact";
        } else if(inviteType === "PRIVATE") {
            this.inviteType = "private_user";
        } else {
            this.inviteType = inviteType;
        }
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }

    getOverrideToken() {
        return this.overrideToken;
    }

    getPostUrl() {
        if(this.inviteType === "coworker") {
            return "users/invite/coworker";
        } else if(this.inviteType === "contact") {
            return "users/invite/contact";
        } else {
            return "users/invite/private";
        }
    }

    getPostData(isGroupInvite) {
        let data = {};

        if(this.email && this.email.length > 0) {
            data["email"] = this.email;
        } else if(this.phoneNumber && this.phoneNumber.length > 0) {
            data["phone_number"] = this.phoneNumber;
        }
        data["first_name"] = this.firstName;
        data["last_name"] = this.lastName;
        if(this.inviteMessage != null) {
            data["invite_text"] = this.inviteMessage;  // Only used when creating conversation
        }
        if(!isGroupInvite) {
            data["send_email"] = this.sendEmail;
        }
        if(this.auxId) {
            data["aux_id"] = StringTools.removeDiacritics(this.auxId);
        }
        if(isGroupInvite) {
            data["invite_type"] = this.inviteType;
            data["create_conversation"] = this.createConversation;
        }

        return data;
    }
}

module.exports = InviteUserData;
