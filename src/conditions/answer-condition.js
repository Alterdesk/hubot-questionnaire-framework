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
            var answerValue = answers.get(answerKey);
            if(typeof answerValue === "object") {
                if(answerValue.length === 0) {
                    return this.checkAnswer(answerKey, null);
                }
                for(let i in answerValue) {
                    if(this.checkAnswer(answerKey, answerValue[i])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    checkAnswer(answerKey, answerValue) {
        var checkValue = this.answerValues[answerKey];
        var regex = this.answerRegex[answerKey];
        if(checkValue == null && !regex) {
            return true;
        }
        if(checkValue != null && checkValue === answerValue) {
            return true;
        }
        if(regex && answerValue.match && answerValue.match(regex)) {
            return true;
        }
        return false;
    }
}

module.exports = AnswerCondition;