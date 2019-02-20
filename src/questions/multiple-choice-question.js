const Extra = require('node-messenger-extra');

const Logger = require('./../logger.js');
const Question = require('./question.js');

// Multiple choice question, add options by regex and optional sub flow
class MultipleChoiceQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getNonEmptyRegex();
        this.options = [];
        this.useButtons = false;
        this.multiAnswer = false;
    }

    // Add an option answer regex and optional sub flow
    addOption(regex, subFlow, value) {
        this.options.push(new MultipleChoiceOption(regex, subFlow, value));
    }

    // Add a button to the last added MultipleChoiceOption
    addButton(name, label, style) {
        this.useButtons = true;
        if(this.options && this.options.length > 0) {
            var option = this.options[this.options.length - 1];
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
        var optionMatch = null;
        var longestMatch = null;
        for(let index in this.options) {
            var option = this.options[index];
            var match = answerValue.match(option.regex);
            if(match) {
                var matchString = match[0];
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
            var labels = [];
            for(let i in answerValue) {
                var label = this.getLabelForAnswer(answerValue[i]);
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
        var option = this.getOptionForAnswer(answerValue);
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
            var values = [];
            for(let i in answerValue) {
                var label = this.getValueForAnswer(answerValue[i]);
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
        var option = this.getOptionForAnswer(answerValue);
        if(option) {
            return option.value;
        }
        return null;
    }

    getRequestMessageId(userId) {
        return this.requestMessageId;
    }

    send(control, msg, callback) {
        if(control.messengerApi && this.useButtons) {
            var messageData = control.createSendMessageData();
            messageData.message = this.getQuestionText();
            messageData.chatId = msg.message.room;
            messageData.isGroup = control.isUserInGroup(msg.message.user);
            messageData.isAux = false;

            var questionPayload = control.createQuestionPayload();
            questionPayload.multiAnswer = this.multiAnswer;
            questionPayload.style = this.questionStyle || "horizontal";
            for(let i in this.options) {
                var option = this.options[i];

                var label = option.label || option.regex;
                if(!label) {
                    label = "Label" + i;
                }

                var name = option.name || option.regex;
                if(name) {
                    name = name.toLowerCase();
                } else {
                    name = "name" + i;
                }

                var style = option.style || "theme";
                questionPayload.addOption(name, label, style);
            }
            if(this.isMultiUser && this.userIds && this.userIds.length > 0) {
                let remainingUserIds = this.getRemainingUserIds();
                if(remainingUserIds && remainingUserIds.length > 0) {
                    questionPayload.addUserIds(remainingUserIds);
                } else {
                    Logger.error("MultipleChoiceQuestion::send() Got no remaining user ids for multi-user question: " + this.answerKey);
                    questionPayload.addUserId(control.getUserId(msg.message.user));
                }
            } else {
                questionPayload.addUserId(control.getUserId(msg.message.user));
            }
            messageData.payload = questionPayload;

            var question = this;
            question.usePendingRequests = true;

            question.setListenersAndPendingRequests(control, msg, callback);

            control.sendComposing(msg);

            // Send the message and parse result in callback
            control.messengerApi.sendMessage(messageData, function(success, json) {
                Logger.debug("MultipleChoiceQuestion::send() Successful: " + success);
                if(json != null) {
                    var messageId = json["id"];
                    Logger.debug("MultipleChoiceQuestion::send() Question message id: " + messageId);
                    question.requestMessageId = messageId;
                } else {
                    var fallbackText = question.getQuestionText();
                    for(let i in questionPayload.questionOptions) {
                        var option = questionPayload.questionOptions[i];
                        fallbackText += "\n • \"" + option.name + "\" - " + option.label;
                    }
                    msg.send(fallbackText);
                }
            });
        } else {
            if(this.useButtons) {
                Logger.error("MultipleChoiceQuestion::send() Messenger API instance not set");
            }
            this.setListenersAndPendingRequests(control, msg, callback);
            msg.send(this.getQuestionText());
        }
    }

    // Check the if one of the option regex matches, and set the corresponding sub flow to execute
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        if(this.multiAnswer) {
            var choices = message.text.split("|");
            var options = [];
            for(let index in choices) {
                var choice = choices[index];
                var option = this.checkAndParseChoice(choice);
                if(option && option !== "") {
                    options.push(option);
                }
            }
            if(options && options.length > 0) {
                return options;
            }
            return null;
        } else {
            var choice = matches[0];
            return this.checkAndParseChoice(choice);
        }
    }

    checkAndParseChoice(choice) {
        var optionMatch = null;
        var longestMatch = null;
        for(let index in this.options) {
            var option = this.options[index];
            var match = choice.match(option.regex);
            if(match) {
                var matchString = match[0];
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
        var subFlow = optionMatch.subFlow;
        if(subFlow) {
            this.setSubFlow(subFlow);
        }
        return longestMatch;
    }
}

// Class to contain a option of a multiple choice question
class MultipleChoiceOption {
    constructor(regex, subFlow, value) {
        this.regex = regex;
        this.subFlow = subFlow;
        this.value = value;
    }
}

module.exports = MultipleChoiceQuestion;