const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');
const Question = require('./question.js');
const RegexTools = require('./../utils/regex-tools.js');
const SendMessageData = require('./../containers/send-message-data.js');

// Multiple choice question, add options by regex and optional sub flow
class MultipleChoiceQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = RegexTools.getNonEmptyRegex();
        this.options = [];
        this.useButtons = false;
        this.multiAnswer = false;
    }

    // Add an option answer regex and optional sub flow
    addOption(regex, subFlow, value, conditions) {
        let option = new MultipleChoiceOption(regex, subFlow, value, conditions);
        this.options.push(option);
    }

    // Add a button to the last added MultipleChoiceOption
    addButton(name, label, style) {
        this.useButtons = true;
        if(this.options && this.options.length > 0) {
            let option = this.options[this.options.length - 1];
            if(option) {
                option.name = name;
                option.label = label;
                option.style = style;
            }
        }
    }

    // Allow multiple answers
    setMultiAnswer(multiAnswer) {
        this.multiAnswer = multiAnswer;
    }

    // Set the question payload style
    setQuestionStyle(style) {
        this.questionStyle = style;
    }

    getOptionForAnswer(answerValue) {
        let optionMatch = null;
        let longestMatch = null;
        for(let option of this.options) {
            let match = answerValue.match(option.regex);
            if(match) {
                let matchString = match[0];
                if(longestMatch && longestMatch.length > matchString.length) {
                    continue;
                }
                longestMatch = matchString;
                optionMatch = option;
            }
        }
        return optionMatch;
    }

    getLabelForAnswer(answerValue) {
        if(!answerValue || answerValue.length === 0) {
            return null;
        }
        if(this.multiAnswer && typeof answerValue === "object") {
            let labels = [];
            for(let value of answerValue) {
                let label = this.getLabelForAnswer(value);
                if(!label) {
                    continue;
                }
                labels.push(label);
            }
            if(labels.length === 0) {
                return null;
            }
            return labels;
        }
        let option = this.getOptionForAnswer(answerValue);
        if(option) {
            return option.label;
        }
        return null;
    }

    getValueForAnswer(answerValue) {
        if(!answerValue || answerValue.length === 0) {
            return null;
        }
        if(this.multiAnswer && typeof answerValue === "object") {
            let values = [];
            for(let value of answerValue) {
                let label = this.getValueForAnswer(value);
                if(!label) {
                    continue;
                }
                values.push(label);
            }
            if(values.length === 0) {
                return null;
            }
            return values;
        }
        let option = this.getOptionForAnswer(answerValue);
        if(option) {
            return option.value;
        }
        return null;
    }

    getRequestMessageId(userId) {
        return this.requestMessageId;
    }

    async send() {
        let msg = this.flow.msg;
        if(this.useButtons) {
            let sendMessageData = new SendMessageData();
            let messageText = this.getQuestionText();
            sendMessageData.setMessage(messageText);
            sendMessageData.setHubotMessage(msg.message);
            let requestStyle = this.questionStyle || "horizontal";
            sendMessageData.setRequestOptions(this.multiAnswer, requestStyle);

            for(let i in this.options) {
                let option = this.options[i];

                if(!option.isAvailable(this.flow)) {
                    continue;
                }

                let label = option.label || option.regex;
                if(!label) {
                    label = "Label" + i;
                }
                let style = option.style || "theme";

                let name = option.name || option.regex;
                if(name) {
                    name = name.toLowerCase();
                    sendMessageData.addQuestionButtonWithName(name, label, style);
                } else {
                    sendMessageData.addQuestionButton(label, style);
                }

            }
            if(this.isMultiUser && this.userIds && this.userIds.length > 0) {
                let remainingUserIds = this.getRemainingUserIds();
                if(remainingUserIds && remainingUserIds.length > 0) {
                    sendMessageData.addRequestUserIds(remainingUserIds);
                } else {
                    Logger.error("MultipleChoiceQuestion::send() Got no remaining user ids for multi-user question: " + this.answerKey);
                    sendMessageData.addRequestUserId(ChatTools.getUserId(msg.message.user));
                }
            } else {
                sendMessageData.addRequestUserId(ChatTools.getUserId(msg.message.user));
            }

            this.usePendingRequests = true;
            this.setListenersAndPendingRequests();

            this.flow.control.sendComposing(msg);

            let json = await this.flow.control.messengerClient.sendMessage(sendMessageData);
            let success = json != null;
            Logger.debug("MultipleChoiceQuestion::send() Successful: " + success);
            if(json != null) {
                let messageId = json["id"];
                Logger.debug("MultipleChoiceQuestion::send() Question message id: " + messageId);
                this.requestMessageId = messageId;
            } else {
                let fallbackText = messageText;
                for(let option of this.options) {
                    fallbackText += "\n • \"" + option.name + "\" - " + option.label;
                }
                msg.send(fallbackText);
            }
        } else {
            this.setListenersAndPendingRequests();
            msg.send(this.getQuestionText());
        }
    }

    // Check the if one of the option regex matches, and set the corresponding sub flow to execute
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        if(this.multiAnswer) {
            let choices = message.text.split("|");
            let options = [];
            for(let choice of choices) {
                let option = this.checkAndParseChoice(choice);
                if(option && option !== "") {
                    options.push(option);
                }
            }
            if(options && options.length > 0) {
                return options;
            }
            return null;
        } else {
            let choice = matches[0];
            return this.checkAndParseChoice(choice);
        }
    }

    checkAndParseChoice(choice) {
        let optionMatch = null;
        let longestMatch = null;
        for(let option of this.options) {
            if(!option.isAvailable(this.flow)) {
                continue;
            }
            let match = choice.match(option.regex);
            if(match) {
                let matchString = match[0];
                if(longestMatch && longestMatch.length > matchString.length) {
                    continue;
                }
                longestMatch = matchString;
                optionMatch = option;
            }
        }
        if(!optionMatch) {
            Logger.error("MultipleChoiceQuestion::checkAndParseChoice() No option match found: " + choice);
            return null;
        }
        // Set the sub flow if available
        let subFlow = optionMatch.subFlow;
        if(subFlow) {
            this.setSubFlow(subFlow);
        }
        return longestMatch;
    }
}

// Class to contain a option of a multiple choice question
class MultipleChoiceOption {
    constructor(regex, subFlow, value, conditions) {
        this.regex = regex;
        this.subFlow = subFlow;
        this.value = value;
        this.conditions = conditions;
    }

    isAvailable(flow) {
        if(typeof this.available === "boolean") {
            return this.available;
        }
        this.available = true;
        if(this.conditions && this.conditions.length > 0) {
            for(let condition of this.conditions) {
                if(!condition.check(flow)) {
                    Logger.debug("MultipleChoiceOption::isAvailable() Condition not met: ", condition);
                    this.available = false;
                    break;
                }
                Logger.debug("MultipleChoiceOption::isAvailable() Condition met: ", condition);
            }
        }
        return this.available;
    }
}

module.exports = MultipleChoiceQuestion;
