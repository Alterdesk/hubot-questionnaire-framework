class AnswerCondition {
    constructor(answerKey) {
        this.answerKey = answerKey;
    }

    setValue(answerValue) {
        this.answerValue = answerValue;
    }

    setRegex(regex) {
        this.regex = regex;
    }

    check(answers) {
        var value = answers.get(this.answerKey);
        if(value && value.constructor && value.constructor.name === "Array") {
            for(let i in value) {
                if(this.checkValue(value[i])) {
                    return true;
                }
            }
            return false;
        }
        return this.checkValue(value);
    }

    checkValue(value) {
        if(this.answerValue != null) {
            return value === this.answerValue;
        } if(!this.regex) {
            return value != null;
        } else if(!value || !value.match) {
            return false;
        }
        return value.match(this.regex) !== null;
    }
}

module.exports = AnswerCondition;