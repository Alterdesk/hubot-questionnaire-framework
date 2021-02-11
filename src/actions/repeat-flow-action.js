const Action = require('./action.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class RepeatFlowAction extends Action {
    constructor(repeatFlow) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.repeatFlow = repeatFlow;
        this.conditions = [];
        this.iteration = 0;
        this.minIterations = 1;
        this.summaryQuestions = {};

        if(this.repeatFlow) {
            this.repeatFlow.finish(() => {
                Logger.debug("RepeatFlowAction::finish() Iteration finished:", this.iteration);
                let questions = this.repeatFlow.getSummaryQuestions(null, null, false);
                if(questions && questions.length !== 0) {
                    for(let question of questions) {
                        let repeatKey = question.getRepeatKey();
                        if(!repeatKey || repeatKey === "") {
                            continue;
                        }
                        if(this.summaryQuestions[repeatKey]) {
                            continue;
                        }
                        this.summaryQuestions[repeatKey] = question;
                    }
                }
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

        for(let condition of this.conditions) {
            if(!condition.check(this.flow)) {
                Logger.debug("RepeatFlowAction::checkRepeat() Condition not met: ", condition);
                this.flowCallback();
                return;
            }
        }
        let answers = this.flow.answers;
        let minIterations = this.getAnswerValue(this.minIterations, answers);
        if(!minIterations) {
            Logger.error("RepeatFlowAction::checkRepeat() Invalid minimal iterations given:", minIterations);
            minIterations = 1;
        }
        if(this.iteration < minIterations) {
            Logger.debug("RepeatFlowAction::checkRepeat() Minimal iterations not met:", minIterations);
            this.nextIteration();
            return;
        }

        if(!this.repeatKey || this.repeatKey.length === 0) {
            Logger.debug("RepeatFlowAction::checkRepeat() No repeat key to check");
            this.flowCallback();
            return;
        }

        let previousIteration = this.iteration;
        previousIteration--;
        if(previousIteration < 0) {
            Logger.debug("RepeatFlowAction::checkRepeat() No value to check for repeat key");
            this.flowCallback();
            return;
        }

        let repeatKey = ChatTools.getAnswerKey(this.repeatKey, this.flow, previousIteration);
        let value = answers.get(repeatKey);
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
        this.nextIteration();
    }

    nextIteration() {
        Logger.debug("RepeatFlowAction::nextIteration() Iteration:", this.iteration);
        if(this.repeatKey && this.repeatKey !== "") {
            let repeatKey = this.repeatKey.replace("#", "");    // TODO Replace with proper iterationKey as property of action
            this.flow.answers.add(repeatKey + "iteration", this.iteration);
        }
        this.repeatFlow.setRepeatIteration(this.iteration);
        this.iteration++;
        setImmediate(() => {
            this.flow.startSubFlow(this.repeatFlow, false);
        })
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }

    addConditions(conditions) {
        this.conditions = this.conditions.concat(conditions);
    }

    setRepeatAnswer(repeatKey, repeatValue) {
        this.repeatKey = repeatKey;
        this.repeatValue = repeatValue;
    }

    setMinIterations(minIterations) {
        this.minIterations = minIterations;
    }

    getSummaryQuestions(limitToTitles, excludeTitles) {
        if(!this.repeatFlow || !this.summaryQuestions) {
            return null;
        }
        let questions = [];
        for(let repeatKey in this.summaryQuestions) {
            let question = this.summaryQuestions[repeatKey];
            if(ChatTools.filterSummaryQuestion(question, limitToTitles, excludeTitles)) {
                questions.push(question);
            }
        }
        return questions;
    }

    reset() {
        super.reset();
        this.iteration = 0;
    }
}

module.exports = RepeatFlowAction;
