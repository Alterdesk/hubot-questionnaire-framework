const Extra = require('node-messenger-extra');

const Logger = require('./../logger.js');
const Question = require('./question.js');

// Phone Number Question, accepts phone numbers, able to limit to country codes
class PhoneNumberQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getPhoneRegex();
        this.allowedCountryCodes = [];
    }

    // Check if valid phone number and if country code is allowed
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        var phone = matches[0];
        if(this.allowedCountryCodes.length === 0) {
            return phone;
        }
        for(let index in this.allowedCountryCodes) {
            if(phone.startsWith(this.allowedCountryCodes[index])) {
                return phone;
            }
        }
        return null;
    }

    // Add a country code to limit accepted answers to
    addAllowedCountryCode(code) {
        for(let index in this.allowedCountryCodes) {
            if(code === this.allowedCountryCodes[index]) {
                Logger.error("PhoneNumberQuestion::addAllowedCountryCode() Country code already configured as allowed: " + code);
                return;
            }
        }
        this.allowedCountryCodes.push(code);
    }

    // Add a list of accepted country codes
    addAllowedCountryCodes(codes) {
        for(let index in codes) {
            this.addAllowedCountryCode(codes[index]);
        }
    }
}

module.exports = PhoneNumberQuestion;