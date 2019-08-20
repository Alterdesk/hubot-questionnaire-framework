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

    getLabelAnswerKey() {
        return ChatTools.getAnswerKey(this.answerKey + "_label", this.flow);
    }

    getValueAnswerKey() {
        return ChatTools.getAnswerKey(this.answerKey + "_value", this.flow);
    }

    reset() {
        var answerKey = getAnswerKey();
        if(answerKey) {
            this.flow.answers.remove(answerKey);
        }
    }
}

module.exports = Step;