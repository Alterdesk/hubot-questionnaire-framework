const ChatTools = require('./chat-tools.js');

class AnswerValue {

    constructor(answerKey) {
        this.answerKey = answerKey
    }

    getValue(answers, flow, forceRepeatIteration) {
        let answerKey = ChatTools.getAnswerKey(this.answerKey, flow, forceRepeatIteration);
        return answers.get(answerKey);
    }

    static get(data, answers, defaultValue, flow, forceRepeatIteration) {
        let result = null;
        if(data instanceof AnswerValue) {
            let value = data.getValue(answers, flow, forceRepeatIteration);
            result = AnswerValue.get(value, answers, defaultValue, flow, forceRepeatIteration);
        } else if(data instanceof Date) {
            result = data;
        } else if(data instanceof Array) {
            result = "";
            for(let value of data) {
                result += AnswerValue.get(value, answers);
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
