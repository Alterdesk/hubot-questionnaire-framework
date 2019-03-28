class AnswerOrFixed {

    constructor() {
    }

    getValue(answers) {
        if(this.answerKey) {
            return answers.get(this.answerKey);
        } else {
            return this.value;
        }
    }

    setAnswerKey(answerKey) {
        this.answerKey = answerKey;
    }

    setFixedValue(value) {
        this.value = value;
    }

    static get(data, answers, defaultValue) {
        var result = null;
        if(data instanceof AnswerOrFixed) {
            result = AnswerOrFixed.get(data.getValue(answers), answers);
        } else if(data instanceof Date) {
            result = data;
        } else if(typeof data === "object") {
            result = "";
            for(let index in data) {
                result += AnswerOrFixed.get(data[index], answers);
            }
        } else if(data != null) {
            result = data;
        }
        if(result == null) {
            return defaultValue;
        }
        return result;
    }

}

module.exports = AnswerOrFixed;