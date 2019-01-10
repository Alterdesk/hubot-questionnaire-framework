const Extra = require('node-messenger-extra');

const Question = require('./question.js');

// Email Question, accepts email addresses, able to limit to domains
class EmailQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getEmailRegex();
        this.allowedDomains = [];
    }

    // Check for valid email and if domain is allowed
    checkAndParseAnswer(matches, message) {
        if(matches == null || message.text == null) {
            return null;
        }
        var email = matches[0];
        if(this.allowedDomains.length === 0) {
            return email;
        }
        for(let index in this.allowedDomains) {
            if(email.endsWith(this.allowedDomains[index])) {
                return email;
            }
        }
        return null;
    }

    // Add a domain to limit accepted answers to
    addAllowedDomain(domain) {
        if(this.allowedDomains.indexOf(domain) !== -1) {
            Logger.error("EmailQuestion::addAllowedDomain() Domain already configured as allowed: " + domain);
            return;
        }
        this.allowedDomains.push(domain);
    }

    // Add a list of accepted domains
    addAllowedDomains(domains) {
        for(let index in domains) {
            this.addAllowedDomain(domains[index]);
        }
    }
}

module.exports = EmailQuestion;