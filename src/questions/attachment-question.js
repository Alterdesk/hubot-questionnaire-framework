const Extra = require('node-messenger-extra');

const Logger = require('./../logger.js');
const Question = require('./question.js');

// Attachment question, request files from a user
class AttachmentQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
        this.allowedExtensions = [];
    }

    // Get attachments that were sent with the message
    checkAndParseAnswer(matches, message) {
        if(message.attachments === null) {
            return null;
        }
        var value = [];

        for(let index in message.attachments) {
            var attachment = message.attachments[index];
            if(this.minSize !== null || this.maxSize !== null) {
                var size = parseFloat(attachment["size"]);
                if(!this.inSizeRange(size)) {
                    continue;
                }
            }
            if(this.allowedExtensions.length != 0) {
                var name = attachment["name"];
                var allowed = false;
                for(let i in this.allowedExtensions) {
                    if(name.endsWith(this.allowedExtensions[i])) {
                        allowed = true;
                        break;
                    }
                }
                if(!allowed) {
                    continue;
                }
            }
            value.push(attachment);
        }

        if(value.length != 0 && this.inCountRange(value.length)) {
            return value;
        }
        return null;
    }

    // Check if the value is in range
    inCountRange(value) {
        if(this.minCount != null && this.maxCount != null) {
            return value >= this.minCount && value <= this.maxCount;
        } else if(this.minCount != null) {
            return value >= this.minCount;
        } else if(this.maxCount != null) {
            return value <= this.maxCount;
        }
        return true;
    }

    // Check if the value is in range
    inSizeRange(value) {
        if(this.minSize != null && this.maxSize != null) {
            return value >= this.minSize && value <= this.maxSize;
        } else if(this.minSize != null) {
            return value >= this.minSize;
        } else if(this.maxSize != null) {
            return value <= this.maxSize;
        }
        return true;
    }

    // Set a minimum and/or maximum count of attachments to accept
    setCountRange(minCount, maxCount) {
        this.minCount = minCount;
        this.maxCount = maxCount;
    }

    // Set a minimum and/or maximum size to accept
    setSizeRange(minSize, maxSize) {
        this.minSize = minSize;
        this.maxSize = maxSize;
    }

    // Add an extension to limit accepted answers to
    addAllowedExtension(extension) {
        for(let index in this.allowedExtensions) {
            if(extension === this.allowedExtensions[index]) {
                Logger.error("AttachmentQuestion::addAllowedExtension() Extension already configured as allowed: " + extension);
                return;
            }
        }
        this.allowedExtensions.push(extension);
    }

    // Add a list of accepted extensions
    addAllowedExtensions(extensions) {
        for(let index in extensions) {
            this.addAllowedExtension(extensions[index]);
        }
    }
}

module.exports = AttachmentQuestion;