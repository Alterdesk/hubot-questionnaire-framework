const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class Condition {
    constructor() {

    }

    check(flow) {

    }

    setInverse(inverse) {
        this.inverse = inverse;
    }

    getAnswerKey(flow) {
        return ChatTools.getAnswerKey(this.answerKey, flow, this.forceRepeatIteration);
    }

    setForceRepeatIteration(forceRepeatIteration) {
        Logger.debug("Condition::setForceRepeatIteration():", forceRepeatIteration);
        this.forceRepeatIteration = forceRepeatIteration;
    }

}

module.exports = Condition;