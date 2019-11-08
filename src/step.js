const AnswerValue = require('./utils/answer-value.js');
const ChatTools = require('./utils/chat-tools.js');

class Step {
    constructor() {

    }

    // Set the parent flow
    setFlow(flow) {
        this.flow = flow;
    }

    setAnswerKey(answerKey) {
        this.answerKey = answerKey;
    }

    getAnswerKey() {
        return ChatTools.getAnswerKey(this.answerKey, this.flow);
    }

    getRepeatKey() {
        return ChatTools.getRepeatKey(this.answerKey);
    }

    getRepeatIterations(answers) {
        return ChatTools.getRepeatIterations(this.answerKey, answers);
    }

    getRepeatedKeys(answers) {
        return ChatTools.getRepeatedKeys(this.answerKey, answers);
    }

    getLabelAnswerKey() {
        return ChatTools.getAnswerKey(this.answerKey + "_label", this.flow);
    }

    getValueAnswerKey() {
        return ChatTools.getAnswerKey(this.answerKey + "_value", this.flow);
    }

    getAnswerValue(data, answers, defaultValue) {
        return AnswerValue.get(data, answers, defaultValue, this.flow);
    }

    reset() {
        var answerKey = this.getAnswerKey();
        if(answerKey) {
            this.flow.answers.remove(answerKey);
        }
    }
}

module.exports = Step;