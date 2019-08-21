const ChatTools = require('./chat-tools.js');

class AnswerValue {

    constructor(answerKey) {
        this.answerKey = answerKey
    }

    getValue(answers, flow, forceRepeatIteration) {
        var answerKey = ChatTools.getAnswerKey(this.answerKey, flow, forceRepeatIteration);
        return answers.get(answerKey);
    }

    static get(data, answers, defaultValue, flow, forceRepeatIteration) {
        var result = null;
        if(data instanceof AnswerValue) {
            var value = data.getValue(answers, flow, forceRepeatIteration);
            result = AnswerValue.get(value, answers, defaultValue, flow, forceRepeatIteration);
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