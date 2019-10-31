const Action = require('./action.js');
const AnswerCondition = require('./../conditions/answer-condition.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class RepeatFlowAction extends Action {
    constructor(repeatFlow) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.repeatFlow = repeatFlow;
        this.conditions = [];
        this.iteration = -1;
        this.minIterations = 1;

        if(this.repeatFlow) {
            this.repeatFlow.finish(() => {
                Logger.debug("RepeatFlowAction::finish() Iteration finished:", this.iteration);
                this.askedQuestions = true;
                this.checkRepeat();
            });
        }
    }

    start(flowCallback) {
        this.flowCallback = flowCallback;

        if(!this.repeatFlow) {
            Logger.debug("RepeatFlowAction::start() No repeat flow was set:", this.repeatFlow);
            this.flowCallback();
            return;
        }

        this.checkRepeat();
    }

    checkRepeat() {
        Logger.debug("RepeatFlowAction::checkRepeat() Iteration:", this.iteration);

        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(!condition.check(this.flow)) {
                Logger.debug("RepeatFlowAction::checkRepeat() Condition not met: ", condition);
                this.flowCallback();
                return;
            }
        }
        var answers = this.flow.answers;
        var checkIteration = this.iteration;
        checkIteration++;
        var minIterations = this.getAnswerValue(this.minIterations, answers);
        if(!minIterations) {
            Logger.error("RepeatFlowAction::checkRepeat() Invalid minimal iterations given:", minIterations);
            minIterations = 1;
        }
        if(checkIteration < minIterations) {
            Logger.debug("RepeatFlowAction::checkRepeat() Minimal iterations not met:", minIterations);
            this.nextIteration();
            return;
        }

        if(this.iteration > -1 && this.repeatKey && this.repeatKey !== "") {
            var repeatKey = ChatTools.getAnswerKey(this.repeatKey, this.flow, this.iteration);
            var value = answers.get(repeatKey);
            if(value == null) {
                Logger.debug("RepeatFlowAction::checkRepeat() Repeat answer not given:", repeatKey, value);
                this.flowCallback();
                return;
            }
            if(this.repeatValue !== value && this.repeatValue != null) {
                Logger.debug("RepeatFlowAction::checkRepeat() Repeat answer does not match:", repeatKey, value, this.repeatValue);
                this.flowCallback();
                return;
            }
            Logger.debug("RepeatFlowAction::checkRepeat() Repeat answer accepted:", repeatKey, value);
        }

        this.nextIteration();
    }

    nextIteration() {
        this.iteration++;
        Logger.debug("RepeatFlowAction::nextIteration() Iteration:", this.iteration);
        if(this.repeatKey && this.repeatKey !== "") {
            var repeatKey = this.repeatKey.replace("#", "");    // TODO Replace with proper iterationKey
            this.flow.answers.add(repeatKey + "iteration", this.iteration);
        }
        this.repeatFlow.setRepeatIteration(this.iteration);
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

    reset() {
        super.reset();
        this.iteration = -1;
    }
}

module.exports = RepeatFlowAction;