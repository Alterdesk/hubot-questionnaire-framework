const ChatTools = require('./chat-tools.js');

class AnswerValue {

    constructor(answerKey) {
        this.answerKey = answerKey
    }

    getValue(answers, flow, repeatIteration) {
        var answerKey = ChatTools.getAnswerKey(this.answerKey, flow, repeatIteration); // TODO Repeat iteration
        return answers.get(answerKey);
    }

    static get(data, answers, defaultValue, flow, repeatIteration) {
        var result = null;
        if(data instanceof AnswerValue) {
            result = AnswerValue.get(data.getValue(answers, flow, repeatIteration), answers);
        } else if(data instanceof Date) {
            result = data;
        } else if(typeof data === "object") {
            result = "";
            for(let index in data) {
                result += AnswerValue.get(data[index], answers);
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

module.exports = AnswerValue;