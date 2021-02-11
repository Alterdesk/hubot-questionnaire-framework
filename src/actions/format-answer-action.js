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
        let answers = this.flow.answers;
        let answerKey = this.getAnswerKey();
        let text = this.getAnswerValue(this.text, answers, "");
        Logger.debug("FormatAnswerAction::start() Using " + this.formatters.length + " formatters");
        for(let formatter of this.formatters) {
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

    addFormatters(formatters) {
        this.formatters = this.formatters.concat(formatters);
    }
}

module.exports = FormatAnswerAction;
