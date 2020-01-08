const Action = require('./action.js');
const Logger = require('./../logger.js');

class FormatAnswerAction extends Action {
    constructor(answerKey, text) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.answerKey = answerKey;
        this.text = text;
        this.formatters = [];
    }

    start(flowCallback) {
        var answers = this.flow.answers;
        var answerKey = this.getAnswerKey();
        var text = this.getAnswerValue(this.text, answers, "");
        Logger.debug("FormatAnswerAction::start() Using " + this.formatters.length + " formatters");
        for(let i in this.formatters) {
            var formatter = this.formatters[i];
            text = formatter.execute(text, this.flow);
        }
        if(text != null) {
            Logger.debug("FormatAnswerAction::start() Formatted answer: key: " + answerKey + " text: " + text);
            answers.add(answerKey, text);
        }
        flowCallback();
    }

    addFormatter(formatter) {
        this.formatters.push(formatter);
    }
}

module.exports = FormatAnswerAction;