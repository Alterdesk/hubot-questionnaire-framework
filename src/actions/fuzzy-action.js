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
        this.maxAttempts = 0;
        this.alwaysConfirm = true;
        this.combineMatches = true;
        this.indexOptions = ["abc","def","ghi","jkl","mno","pqrs","tuv","wxyz"];
    }

    start(response, answers, flowCallback) {
        Logger.debug("FuzzyAction::start()", this.answerKey);
        this.answers = answers;
        this.flowCallback = flowCallback;

        this.setAttempts(0);

        this.askText(this.questionText);
    }

    askText(text) {
        Logger.debug("FuzzyAction::askText()", text);
        var textAnswerKey = this.answerKey + "_text_" + this.getAttempts();
        var askTextFlow = this.flow.createInstance()
        .text(textAnswerKey, text, this.invalidText)
        .action((response, answers, subFlowCallback) => {
            this.checkText(textAnswerKey);
            subFlowCallback();
        });
        this.flow.startSubFlow(askTextFlow, false);
    }

    showCandidates(candidates, text, askAgainOnDidNot) {
        Logger.debug("FuzzyAction::showCandidates() Candidates: " + candidates.length);
        var candidateAnswerKey = this.answerKey + "_candidate_" + this.getAttempts();
        var askDidMeanFlow = this.flow.createInstance()
        .multiple(candidateAnswerKey, text, this.invalidText);
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
            var answerValue = answers.get(candidateAnswerKey);
            if(!answerValue || !answerValue.match || answerValue.match(this.didNotRegex)) {
                if(askAgainOnDidNot) {
                    this.askText(this.reformulateText || this.questionText);
                } else {
                    this.showIndex();
                }
                subFlowCallback();
                return;
            }
            subFlowCallback();
            for(let index in candidates) {
                var candidate = candidates[index];
                if(candidate.name === answerValue) {
                    this.done(candidate);
                    return;
                }
            }
            Logger.error("FuzzyAction::showCandidates() Unable to find matching candidate: ", answerValue)
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

        var indexAnswerKey = this.answerKey + "_index_" + this.getAttempts();
        var indexFlow = this.flow.createInstance()
        indexFlow.multiple(indexAnswerKey, this.indexText, this.invalidText)
        for(let index in availableOptions) {
            var option = availableOptions[index];
            var label = option.toUpperCase();
            var style = "orange";   // TODO Style?
            indexFlow.option(option)
            .button(option, label, style);
        }
        indexFlow.action((response, answers, subFlowCallback) => {
            var answerValue = answers.get(indexAnswerKey);
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

    checkText(textAnswerKey) {
        var attempts = this.getAttempts();
        this.setAttempts(attempts + 1);
        var answerValue = this.answers.get(textAnswerKey);
        Logger.debug("FuzzyAction::checkText() Checking: attempt: " + attempts + " key: " + this.answerKey + " value: " + answerValue);

        // Copy candidates
        var checkCandidates = this.candidates.slice();
        var possibleCandidates = [];
        var matchedCandidates = [];

        var start = Date.now();

        var checkWords = [];

        var words = answerValue.match(Extra.getTextRegex());
        for(let i in words) {
            var word = words[i];
            if(word.length < this.minWordLength) {
//                Logger.debug("FuzzyAction::checkText() Skipping word, too short: " + word);
                continue;
            }
            word = word.toLowerCase();
            if(checkWords.indexOf(word) !== -1) {
//                Logger.debug("FuzzyAction::checkText() Word already in check list: " + word);
                continue;
            }
            checkWords.push(word);
        }

        for(let i in checkWords) {
            var word = checkWords[i];

            let removeCandidates = [];

            for(let i in checkCandidates) {
                var candidate = checkCandidates[i];
                var distance = candidate.getDistance(word);
                if(distance === 0) {
                    Logger.debug("FuzzyAction::checkText() Exact match candidate: " + candidate.name);
                    if(matchedCandidates.indexOf(candidate) === -1) {
                        matchedCandidates.push(candidate);
                        removeCandidates.push(candidate);
                    }
                } else if(distance <= this.maxLevenshteinDistance) {
                    Logger.debug("FuzzyAction::checkText() Possible candidate: " + candidate.name);
                    if(possibleCandidates.indexOf(candidate) === -1) {
                        possibleCandidates.push(candidate);
                    }
                }
            }

            // Remove exact matches, don't need to check again
            for(let i in removeCandidates) {
                var removeCandidate = removeCandidates[i];
                var index = checkCandidates.indexOf(removeCandidate);
                checkCandidates.splice(index, 1);
            }
        }

        if(!this.alwaysConfirm && matchedCandidates.length === 1 && possibleCandidates.length === 0) {
            this.done(matchedCandidates[0]);
            return;
        }

        // TODO Check if "index" was set
        // TODO Check if "did you mean" was set
        if(this.combineMatches && matchedCandidates.length > 0 && possibleCandidates.length > 0) {
            var optionCandidates = [];
            for(let i in matchedCandidates) {
                var candidate = matchedCandidates[i];
                if(optionCandidates.indexOf(candidate) === -1) {
                    optionCandidates.push(candidate);
                }
            }
            for(let i in possibleCandidates) {
                var candidate = possibleCandidates[i];
                if(optionCandidates.indexOf(candidate) === -1) {
                    optionCandidates.push(candidate);
                }
            }
            this.showCandidates(optionCandidates, this.didYouMeanText, true);
        } else if(matchedCandidates.length > 0) {
            this.showCandidates(matchedCandidates, this.didYouMeanText, true);
        } else if(possibleCandidates.length > 0) {
            this.showCandidates(possibleCandidates, this.didYouMeanText, true);
        } else if(this.maxAttempts > 0 && attempts >= this.maxAttempts) {
            this.showIndex();
        } else {
            this.askText(this.reformulateText || this.questionText);
        }
    }

    done(candidate) {
        Logger.debug("FuzzyAction::done()", this.answerKey);
        if(candidate && candidate.name) {
            this.answers.add(this.answerKey, candidate.name);
        }
        if(candidate && candidate.subFlow) {
            this.setSubFlow(candidate.subFlow);
        }
        var attempts = this.getAttempts();
        this.setAttempts(0);
        // TODO Log failed attempts with chosen answer and reset values
        this.flowCallback();
    }

    getAttempts() {
        return this.answers.get(this.answerKey + "_attempts");
    }

    setAttempts(attempts) {
        this.answers.add(this.answerKey + "_attempts", attempts);
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

    setAlwaysConfirm(alwaysConfirm) {
        this.alwaysConfirm = alwaysConfirm;
    }

    setCombineMatches(combineMatches) {
        this.combineMatches = combineMatches;
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
//        Logger.debug("FuzzyCandidate::getDistance() word: " + word + " name: " + this.name + " distance: " + nameDistance);
        if(nameDistance === 0 || !this.aliases || this.aliases.length === 0) {
            return nameDistance;
        }
        var aliasDistance;
        for(let index in this.aliases) {
            var alias = this.aliases[index];
            var distance = Levenshtein(word, alias);
//            Logger.debug("FuzzyCandidate::getDistance() word: " + word + " alias: " + alias + " distance: " + distance);
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
