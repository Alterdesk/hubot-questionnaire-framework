const LocaleTools = require('./../utils/locale-tools.js');
const Logger = require('./../logger.js');
const Question = require('./question.js');
const RegexTools = require('./../utils/regex-tools.js');

// Phone Number Question, accepts phone numbers, able to limit to country codes
class PhoneNumberQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = RegexTools.getTextRegex();
        this.phoneRegex = RegexTools.getPhoneRegex();
        this.allowedCountryCodes = [];
        this.replaceLeadingZero = true;
    }

    // Check if valid phone number and if country code is allowed
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        let text = message.text;
        Logger.debug("PhoneNumberQuestion::checkAndParseAnswer() Got text:", text);
        text = text.replace(new RegExp(/[ \-_()\[\]]/, 'gi'), "");
        Logger.debug("PhoneNumberQuestion::checkAndParseAnswer() Filtered:", text);
        let phoneMatches = text.match(this.phoneRegex);
        Logger.debug("PhoneNumberQuestion::checkAndParseAnswer() Phone matches:", phoneMatches);
        if(phoneMatches == null) {
            return null;
        }
        let phone = phoneMatches[0];
        if(this.replaceLeadingZero && phone.startsWith("0")) {
            let code = LocaleTools.getPhoneCountryCode();
            if(code && code.length > 0) {
                phone = code + phone.substring(1);
            }
        }
        if(this.allowedCountryCodes.length === 0) {
            return phone;
        }
        for(let code of this.allowedCountryCodes) {
            if(phone.startsWith(code)) {
                return phone;
            }
        }
        return null;
    }

    setReplaceLeadingZero(replaceLeadingZero) {
        this.replaceLeadingZero = replaceLeadingZero;
    }

    // Add a country code to limit accepted answers to
    addAllowedCountryCode(code) {
        if(this.allowedCountryCodes.indexOf(code) !== -1) {
            Logger.error("PhoneNumberQuestion::addAllowedCountryCode() Country code already configured as allowed: " + code);
            return;
        }
        this.allowedCountryCodes.push(code);
    }

    // Add a list of accepted country codes
    addAllowedCountryCodes(codes) {
        for(let code of codes) {
            this.addAllowedCountryCode(code);
        }
    }
}

module.exports = PhoneNumberQuestion;
