const Extra = require('node-messenger-extra');

const Logger = require('./../logger.js');
const Question = require('./question.js');

// Attachment question, request files from a user
class AttachmentQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
        this.allowedExtensions = [];
        this.allowedMimeTypes = [];
    }

    // Get attachments that were sent with the message
    checkAndParseAnswer(matches, message) {
        if(typeof message.text === "object" && message.text.length > 0) {
            return message.text;
        }
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
            if(this.allowedExtensions.length > 0) {
                var name = attachment["name"];
                if(typeof name !== "string") {
                    continue;
                }
                name = name.toUpperCase();
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
            if(this.allowedMimeTypes.length > 0) {
                var mime = attachment["mime_type"];
                if(typeof mime !== "string") {
                    continue;
                }
                mime = mime.toUpperCase();
                var allowed = false;
                for(let i in this.allowedMimeTypes) {
                    if(mime === this.allowedMimeTypes[i]) {
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

        if(value.length > 0 && this.inCountRange(value.length)) {
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
        if(this.allowedExtensions.indexOf(extension) !== -1) {
            Logger.error("AttachmentQuestion::addAllowedExtension() Extension already configured as allowed: " + extension);
            return;
        }
        if(!extension.startsWith(".")) {
            extension = "." + extension;
        }
        this.allowedExtensions.push(extension.toUpperCase());
    }

    // Add a list of accepted extensions
    addAllowedExtensions(extensions) {
        for(let index in extensions) {
            this.addAllowedExtension(extensions[index]);
        }
    }

    // Add a mime type to limit accepted answers to
    addAllowedMimeType(mimeType) {
        if(this.allowedMimeTypes.indexOf(mimeType) !== -1) {
            Logger.error("AttachmentQuestion::addAllowedMimeType() MIME type already configured as allowed: " + mimeType);
            return;
        }
        this.allowedMimeTypes.push(mimeType.toUpperCase());
    }

    // Add a list of accepted extensions
    addAllowedMimeTypes(mimeTypes) {
        for(let index in mimeTypes) {
            this.addAllowedMimeType(mimeTypes[index]);
        }
    }
}

module.exports = AttachmentQuestion;