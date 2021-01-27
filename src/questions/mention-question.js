const Logger = require('./../logger.js');
const Question = require('./question.js');
const RegexTools = require('./../utils/regex-tools.js');

// Mention Question, accepts mentioned all and mentioned user tags
class MentionQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = RegexTools.getMentionedRegex();
        this.allAllowed = true;
        this.robotAllowed = false;
    }

    // Include these mentions after question is answered
    setIncludeMentions(mentions) {
        this.includeMentions = mentions;
    }

    // Change if if the mentioned all tag is allowed
    setAllAllowed(allowed) {
        this.allAllowed = allowed;
    }

    // Change if it is allowed to mention robot
    setRobotAllowed(allowed) {
        this.robotAllowed = allowed;
    }

    // Parse mentioned users or mentioned all tags
    checkAndParseAnswer(matches, message) {
        if(typeof message.text === "object" && message.text.length > 0) {
            return message.text;
        }
        if(matches === null || message.text === null) {
            return null;
        }
        let value = [];

        // Check for the mentioned all tag
        if(message.text.match(RegexTools.getMentionedAllRegex()) !== null) {
            // Check if the all tag is configured as allowed
            if(!this.allAllowed) {
                return null;
            }
            let mention = {};
            mention["id"] = "@all";
            value.push(mention);
            return value;
        }

        let mentions;

        // Copy mention data if already parsed by gateway
        if(message.mentions !== null) {
            // Parsed by gateway
            mentions = message.mentions;
        } else {
            // Not parsed yet
            mentions = [];
            let mentionedUserRegex = RegexTools.getMentionedUserRegex();
            let uuidRegex = RegexTools.getUuidRegex();
            let mentionResult;
            while((mentionResult = mentionedUserRegex.exec(message.text)) !== null) {
                let userResult = mentionResult[0].match(uuidRegex);
                if(userResult == null) {
                    continue;
                }
                let mention = {};
                mention["id"] = userResult[0];
                mentions.push(mention);
            }
        }

        // Retrieve robot id if available
        let robotId = null;
        if(this.flow.control.robot.user != null) {
            robotId = this.flow.control.robotUserId;
        }

        // Check for duplicates and robot mention
        for(let mention of mentions) {
            let userId = mention["id"];
            // Skip robot mention if not allowed
            if(!this.robotAllowed && robotId !== null && userId === robotId) {
                Logger.debug("MentionQuestion::checkAndParseAnswer() Removed robot mention")
                continue;
            }
            let add = true;
            for(let user of value) {
                if(userId === user["id"]) {
                    Logger.debug("MentionQuestion::checkAndParseAnswer() User id already mentioned: " + userId);
                    add = false;
                    break;
                }
            }
            if(add) {
                Logger.debug("MentionQuestion::checkAndParseAnswer() Adding mentioned user id: " + userId);
                value.push(mention);
            }
        }

        // If a valid answer has been given, add the include mention list
        if(value.length !== 0) {
            if(this.includeMentions != null) {
                for(let includeMention of this.includeMentions) {
                    let userId = includeMention["id"];
                    let add = true;
                    for(let user of value) {
                        if(userId === user["id"]) {
                            add = false;
                            break;
                        }
                    }
                    if(add) {
                        value.push(includeMention);
                    }
                }
            }
            return value;
        }
        return null;
    }
}

module.exports = MentionQuestion;
