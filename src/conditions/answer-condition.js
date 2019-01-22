class AnswerCondition {
    constructor() {
        this.answerKeys = [];
        this.answerValues = {};
        this.answerRegex = {};
    }

    addKey(answerKey) {
        this.answerKeys.push(answerKey);
    }

    setValue(answerKey, answerValue) {
        this.answerValues[answerKey] = answerValue;
    }

    setRegex(answerKey, answerRegex) {
        this.answerRegex[answerKey] = answerRegex;
    }

    check(answers) {
        for(let i in this.answerKeys) {
            var answerKey = this.answerKeys[i];
            if(!answers.has(answerKey)) {
                continue;
            }
            var value = answers.get(answerKey);
            var checkValue = this.answerValues[answerKey];
            var regex = this.answerRegex[answerKey];
            if(checkValue == null && !regex) {
                return true;
            }
            if(checkValue != null && checkValue === value) {
                return true;
            }
            if(regex && value.match && value.match(regex)) {
                return true;
            }
        }
        return false;
    }
}

module.exports = AnswerCondition;