const Logger = require('./../logger.js');
const Question = require('./question.js');
const RegexTools = require('./../utils/regex-tools.js');

// Attachment question, request files from a user
class AttachmentQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = RegexTools.getTextRegex();
        this.allowedExtensions = [];
        this.allowedMimeTypes = [];
    }

    // Get attachments that were sent with the message
    checkAndParseAnswer(matches, message) {
        if(typeof message.text === "object" && message.text.length > 0) {
            Logger.debug("AttachmentQuestion::checkAndParseAnswer():", message.text);
            return message.text;
        }
        if(!message.attachments || message.attachments.length === 0) {
            Logger.error("AttachmentQuestion::checkAndParseAnswer() Invalid attachments: ", message.attachments);
            return null;
        }
        let value = [];

        for(let attachment of message.attachments) {
            if(this.minSize !== null || this.maxSize !== null) {
                let size = parseFloat(attachment["size"]);
                if(typeof size !== "number") {
                    Logger.error("AttachmentQuestion::checkAndParseAnswer() Unable to parse size: ", attachment);
                    continue;
                }
                if(!this.inSizeRange(size)) {
                    Logger.debug("AttachmentQuestion::checkAndParseAnswer() Size not in range:", attachment);
                    continue;
                }
            }
            if(this.allowedExtensions.length > 0) {
                let name = attachment["name"];
                if(typeof name !== "string") {
                    Logger.debug("AttachmentQuestion::checkAndParseAnswer() Invalid attachment name:", attachment);
                    continue;
                }
                name = name.toUpperCase();
                let allowed = false;
                for(let extension of this.allowedExtensions) {
                    if(name.endsWith(extension)) {
                        allowed = true;
                        break;
                    }
                }
                if(!allowed) {
                    Logger.debug("AttachmentQuestion::checkAndParseAnswer() Extension not allowed:", attachment);
                    continue;
                }
            }
            if(this.allowedMimeTypes.length > 0) {
                let mime = attachment["mime_type"];
                if(typeof mime !== "string") {
                    Logger.debug("AttachmentQuestion::checkAndParseAnswer() Invalid attachment mime:", attachment);
                    continue;
                }
                mime = mime.toUpperCase();
                let allowed = false;
                for(let allowedMime of this.allowedMimeTypes) {
                    if(mime === allowedMime) {
                        allowed = true;
                        break;
                    }
                }
                if(!allowed) {
                    Logger.debug("AttachmentQuestion::checkAndParseAnswer() Mime not allowed:", attachment);
                    continue;
                }
            }
            value.push(attachment);
        }
        if(value.length === 0) {
            Logger.error("AttachmentQuestion::checkAndParseAnswer() Unable to parse attachments: ", message.attachments);
            return null;
        }

        if(!this.inCountRange(value.length)) {
            Logger.debug("AttachmentQuestion::checkAndParseAnswer() Count not in range: " + value.length);
            return null;
        }
        Logger.debug("AttachmentQuestion::checkAndParseAnswer() Parsed " + value.length + " attachments");
        return value;
    }

    // Check if the value is in range
    inCountRange(value) {
        Logger.debug("AttachmentQuestion::inCountRange() Value: " + value + " min: " + this.minCount + " max: " + this.maxCount);
        let minValid = typeof this.minCount === "number" && this.minCount > 0;
        let maxValid = typeof this.maxCount === "number" && this.maxCount > 0;
        if(minValid && maxValid) {
            return value >= this.minCount && value <= this.maxCount;
        } else if(minValid) {
            return value >= this.minCount;
        } else if(maxValid) {
            return value <= this.maxCount;
        }
        return true;
    }

    // Check if the value is in range
    inSizeRange(value) {
        Logger.debug("AttachmentQuestion::inSizeRange() Value: " + value + " min: " + this.minSize + " max: " + this.maxSize);
        let minValid = typeof this.minSize === "number" && this.minSize > 0;
        let maxValid = typeof this.maxSize === "number" && this.maxSize > 0;
        if(minValid && maxValid) {
            return value >= this.minSize && value <= this.maxSize;
        } else if(minValid) {
            return value >= this.minSize;
        } else if(maxValid) {
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
        for(let extension of extensions) {
            this.addAllowedExtension(extension);
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
        for(let mime of mimeTypes) {
            this.addAllowedMimeType(mime);
        }
    }
}

module.exports = AttachmentQuestion;
