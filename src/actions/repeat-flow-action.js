const Action = require('./action.js');
const AnswerCondition = require('./../conditions/answer-condition.js');
const Logger = require('./../logger.js');

class RepeatFlowAction extends Action {
    constructor(repeatFlow) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.repeatFlow = repeatFlow;
        this.conditions = [];
        this.iteration = -1;
        this.minIterations = 1;
    }

    start(response, answers, flowCallback) {
        this.answers = answers;
        this.flowCallback = flowCallback;

        if(!this.repeatFlow) {
            Logger.debug("RepeatFlowAction::start() No repeat flow was set:", this.repeatFlow);
            this.flowCallback();
            return;
        }

        this.repeatFlow.finish((response, answers) => {
            Logger.debug("RepeatFlowAction::finish() Iteration finished:", this.iteration);
            this.checkRepeat();
        });

        this.checkRepeat();
    }

    checkRepeat() {
        Logger.debug("RepeatFlowAction::checkRepeat() Iteration:", this.iteration);

        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(!condition.check(answers)) {
                Logger.debug("RepeatFlowAction::checkRepeat() Condition not met: ", condition);
                this.flowCallback();
                return;
            }
        }
        var checkIteration = this.iteration;
        checkIteration++;
        if(checkIteration < this.minIterations) {
            Logger.debug("RepeatFlowAction::checkRepeat() Minimal iterations not met:", this.minIterations);
            this.nextIteration();
            return;
        }

        if(this.iteration > -1 && this.repeatKey && this.repeatKey !== "") {
            var key = this.repeatKey + "_" + this.iteration;
            var value = this.answers.get(key);
            if(value == null) {
                Logger.debug("RepeatFlowAction::checkRepeat() Repeat answer not given:", key, value);
                this.flowCallback();
                return;
            }
            if(this.repeatValue !== value && this.repeatValue != null) {
                Logger.debug("RepeatFlowAction::checkRepeat() Repeat answer does not match:", key, value, this.repeatValue);
                this.flowCallback();
                return;
            }
            Logger.debug("RepeatFlowAction::checkRepeat() Repeat answer matches:", key, value, this.repeatValue);
        }

        this.nextIteration();
    }

    nextIteration() {
        this.iteration++;
        Logger.debug("RepeatFlowAction::nextIteration() Iteration:", this.iteration);
        for(let i in this.repeatFlow.steps) {
            var step = this.repeatFlow.steps[i];
            if(!step.answerKey) {
                continue;
            }
            if(!step.originalAnswerKey) {
                step.originalAnswerKey = step.answerKey;
            }
            step.answerKey = step.originalAnswerKey + "_" + this.iteration;
        }
        this.repeatFlow.currentStep = 0;
        this.flow.startSubFlow(this.repeatFlow, false);
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }

    setRepeatAnswer(repeatKey, repeatValue) {
        this.repeatKey = repeatKey;
        this.repeatValue = repeatValue;
    }

    setMinIterations(minIterations) {
        this.minIterations = minIterations;
    }

    reset(answers) {
        super.reset(answers);
        this.iteration = -1;
    }
}

module.exports = RepeatFlowAction;