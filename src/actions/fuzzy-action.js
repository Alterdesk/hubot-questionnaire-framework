const Extra = require('node-messenger-extra');
const Levenshtein = require('js-levenshtein');

const Action = require('./action.js');
const Logger = require('./../logger.js');

class FuzzyAction extends Action {  // TODO This class may be subject to change
    constructor(flow, answerKey, questionText, invalidText, waitMs) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, waitMs);

        this.flow = flow;
        this.answerKey = answerKey;
        this.questionText = questionText;
        this.invalidText = invalidText;
        this.candidates = [];
        this.minWordLength = 3;
        this.maxLevenshteinDistance = 2;
        this.attempts = 0;
        this.maxAttempts = 0;
        this.indexOptions = ["abc","def","ghi","jkl","mno","pqrs","tuv","wxyz"];
    }

    start(response, answers, flowCallback) {
        Logger.debug("FuzzyAction::start()", this.answerKey);
        this.answers = answers;
        this.flowCallback = flowCallback;

        this.askText(this.questionText);
    }

    askText(text) {
        Logger.debug("FuzzyAction::askText()", text);
        var askTextFlow = this.flow.createInstance()
        .text(this.answerKey, text, this.invalidText)
        .action((response, answers, subFlowCallback) => {
            this.checkText();
            subFlowCallback();
        });
        this.flow.startSubFlow(askTextFlow, false);
    }

    showCandidates(candidates, text, askAgainOnDidNot) {
        Logger.debug("FuzzyAction::showCandidates() Candidates: " + candidates.length);
        var askDidMeanFlow = this.flow.createInstance()
        .multiple(this.answerKey, text, this.invalidText);
        for(let index in candidates) {
            var candidate = candidates[index];
            var name = candidate.name;
            var label = candidate.label;
            var style = candidate.style;
            var subFlow = candidate.subFlow;
            askDidMeanFlow.option(name, subFlow)
            .button(name, label, style);
        }
        askDidMeanFlow.option(this.didNotRegex)
        .button(this.didNotButtonName, this.didNotButtonLabel)
        .action((response, answers, subFlowCallback) => {
            var answerValue = answers.get(this.answerKey);
            if(!answerValue || !answerValue.match || answerValue.match(this.didNotRegex)) {
                answers.remove(this.answerKey);
                if(askAgainOnDidNot) {
                    this.askText(this.reformulateText || this.questionText);
                } else {
                    this.showIndex();
                }
                subFlowCallback();
                return;
            }
            subFlowCallback();
            this.done();
        });
        this.flow.startSubFlow(askDidMeanFlow, false);
    }

    showIndex() {
        Logger.debug("FuzzyAction::showIndex()");
        var letters = [];
        var availableOptions = [];
        for(let index in this.candidates) {
            var candidate = this.candidates[index];
            var name = candidate.name;
            if(!name || name === "") {
                continue;
            }
            var letter = name.charAt(0);
            if(letters.indexOf(letter) === -1) {
                letters.push(letter);
            }
        }

        for(let index in this.indexOptions) {
            var option = this.indexOptions[index];
            for(let i = 0 ; i < option.length ; i++) {
                var c  = option.charAt(i);
                if(letters.indexOf(c) !== -1) {
                    availableOptions.push(option);
                    break;
                }
            }
        }

        Logger.debug("FuzzyAction::showIndex() Letters ", letters);
        Logger.debug("FuzzyAction::showIndex() Options ", availableOptions);

        if(availableOptions.length === 0) {
            this.askText(this.reformulateText || this.questionText);    // TODO Or fail?
            return;
        }

        var indexFlow = this.flow.createInstance()
        indexFlow.multiple(this.answerKey, this.indexText, this.invalidText)
        for(let index in availableOptions) {
            var option = availableOptions[index];
            var label = option.toUpperCase();
            var style = "orange";   // TODO Style?
            indexFlow.option(option)
            .button(option, label, style);
        }
        indexFlow.action((response, answers, subFlowCallback) => {
            var answerValue = answers.get(this.answerKey);
            answers.remove(this.answerKey);
            this.showIndexOption(answerValue);
            subFlowCallback();
        });
        this.flow.startSubFlow(indexFlow, false);
    }

    showIndexOption(indexOption) {
        Logger.debug("FuzzyAction::showIndexOption() Index option " + indexOption);
        var availableCandidates = [];
        for(let index in this.candidates) {
            var candidate = this.candidates[index];
            var name = candidate.name;
            if(!name || name === "") {
                continue;
            }
            var letter = name.charAt(0);
            if(indexOption.indexOf(letter) !== -1) {
                availableCandidates.push(candidate);
            }
        }
        this.showCandidates(availableCandidates, this.indexOptionText, false);
    }

    checkText() {
        this.attempts++;
        var answerValue = this.answers.get(this.answerKey);
        Logger.debug("FuzzyAction::checkText() Checking: attempt: " + this.attempts + " key: " + this.answerKey + " value: " + answerValue);

        var possibleCandidates = [];
        var matchedCandidates = [];

        var start = Date.now();

        var words = answerValue.match(Extra.getTextRegex());
        for(let i in words) {
            var word = words[i];
            if(word.length < this.minWordLength) {
                Logger.debug("FuzzyAction::checkText() Skipping word, too short: " + word);
                continue;
            }
            word = word.toLowerCase();

            for(let index in this.candidates) {
                var candidate = this.candidates[index];
                var distance = candidate.getDistance(word);
                if(distance === 0) {
                    Logger.debug("FuzzyAction::checkText() Exact match candidate: " + candidate.name);
                    matchedCandidates.push(candidate);
                } else if(distance <= this.maxLevenshteinDistance) {
                    Logger.debug("FuzzyAction::checkText() Possible candidate: " + candidate.name);
                    possibleCandidates.push(candidate);
                }
            }
        }

        if(matchedCandidates.length === 1) {
            this.done(matchedCandidates[0]);
            return;
        }

        this.answers.remove(this.answerKey);

        if(this.maxAttempts > 0 && this.attempts >= this.maxAttempts) {     // TODO Check if "index" was set
            this.showIndex();
        } else if(matchedCandidates.length > 0) {     // TODO Check if "did you mean" was set
            this.showCandidates(matchedCandidates, this.didYouMeanText, true);
        } else if(possibleCandidates.length > 0) {     // TODO Check if "did you mean" was set
            this.showCandidates(possibleCandidates, this.didYouMeanText, true);
        } else {
            this.askText(this.reformulateText || this.questionText);
        }
    }

    done(candidate) {
        Logger.debug("FuzzyAction::done()", this.answerKey);
        if(candidate && candidate.subFlow) {
            this.setSubFlow(candidate.subFlow);
        }
        // TODO Log failed attempts with chosen answer
        this.flowCallback();
    }

    addCandidate(name, label, style, aliases, subFlow) {
        this.candidates.push(new FuzzyCandidate(name, label, style, aliases, subFlow));
    }

    setReformulateText(reformulateText) {
        this.reformulateText = reformulateText;
    }

    setShowIndex(indexText, indexOptionText, maxAttempts) {
        this.indexText = indexText;
        this.indexOptionText =indexOptionText;
        this.maxAttempts = maxAttempts;
    }

    setDidYouMean(didYouMeanText, didNotRegex) {
        this.didYouMeanText = didYouMeanText;
        this.didNotRegex = didNotRegex;
    }

    setDidNotMeanButton(name, label, style) {
        this.didNotButtonName = name;
        this.didNotButtonLabel = label;
        this.didNotButtonStyle = style;
    }
}

class FuzzyCandidate {
    constructor(name, label, style, aliases, subFlow) {
        this.name = name;
        this.label = label;
        this.style = style;
        this.aliases = aliases;
        this.subFlow = subFlow;
    }

    getDistance(word) {
        var nameDistance = Levenshtein(word, this.name);
        Logger.debug("FuzzyCandidate::getDistance() word: " + word + " name: " + this.name + " distance: " + nameDistance);
        if(nameDistance === 0 || this.aliases.length === 0) {
            return nameDistance;
        }
        var aliasDistance;
        for(let index in this.aliases) {
            var alias = this.aliases[index];
            var distance = Levenshtein(word, alias);
            Logger.debug("FuzzyCandidate::getDistance() word: " + word + " alias: " + alias + " distance: " + distance);
            if(distance === 0) {
                return 0;
            } else if(!aliasDistance) {
                aliasDistance = distance;
            } else if(distance < aliasDistance) {
                aliasDistance = distance;
            }
        }
        if(nameDistance < aliasDistance) {
            return nameDistance;
        } else {
            return aliasDistance;
        }
    }
}

module.exports = FuzzyAction;
