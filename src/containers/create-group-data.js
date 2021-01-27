class CreateGroupData {
    constructor() {
        // Members to add
        this.memberIds = [];

        // Users to invite
        this.inviteUsers = [];

        this.sendEmail = true;
    }

    setSubject(subject) {
        this.subject = subject;
    }

    setSendEmail(sendEmail) {
        this.sendEmail = sendEmail;
    }

    setAuxId(auxId) {
        this.auxId = auxId;
    }

    addMemberId(id) {
        this.memberIds.push(id);
    }

    addMemberIds(ids) {
        for(let id of ids) {
            this.addMemberId.push(id);
        }
    }

    addInvite(invite) {
        this.inviteUsers.push(invite);
    }

    addInvites(invites) {
        for(let invite of invites) {
            this.addInvite.push(invite);
        }
    }

    setGroupSettings(groupSettingsData) {
        this.groupSettingsData = groupSettingsData;
    }

    setOverrideToken(overrideToken) {
        this.overrideToken = overrideToken;
    }

    getOverrideToken() {
        return this.overrideToken;
    }

    getPostUrl() {
        if(this.auxId != null) {
            return "aux/groupchats";
        } else {
            return "groupchats";
        }
    }

    getPostData() {
        var data = {};

        if(this.groupSettingsData) {
            data["settings"] = this.groupSettingsData.getPutData();
        }

        var hasAuxMembers = false;

        // Invite user data
        var inviteUsersData = [];

        for(let inviteUser of this.inviteUsers) {
            if(inviteUser.getAuxId()) {
                hasAuxMembers = true;
            }
            var inviteUserData = inviteUser.getPostData(true);
            inviteUsersData.push(inviteUserData);
        }

        data["invite_users"] = inviteUsersData;
        data["members"] = this.memberIds;
        data["subject"] = this.subject;
        data["send_email"] = this.sendEmail;

        if(this.auxId != null) {
            data["aux_id"] = this.auxId;
            data["aux_members"] = hasAuxMembers;
        }

        return data;
    }
}

module.exports = CreateGroupData;
