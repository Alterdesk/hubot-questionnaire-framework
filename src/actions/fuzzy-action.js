const Levenshtein = require('js-levenshtein');

const Action = require('./action.js');
const Logger = require('./../logger.js');
const RegexTools = require('./../utils/regex-tools.js');
const StringTools = require('./../utils/string-tools.js');

class FuzzyAction extends Action {
    constructor(answerKey, questionText, invalidText, waitMs) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, waitMs);

        this.answerKey = answerKey;
        this.questionText = questionText;
        this.invalidText = invalidText;
        this.candidates = [];
        this.excludeWords = [];
        this.minWordLength = 3;
        this.maxLevenshteinDistance = 2;
        this.maxAttempts = 0;
        this.alwaysConfirm = true;
        this.combineMatches = true;
        this.indexOptions = ["abc","def","ghi","jkl","mno","pqrs","tuv","wxyz"];
    }

    start(flowCallback) {
        let answerKey = this.getAnswerKey();
        Logger.debug("FuzzyAction::start() \"" + answerKey + "\"");
        this.flowCallback = flowCallback;
        this.reset();
        this.askText(this.questionText);
        this.flow.startSubFlow(this.innerFlow, false);
    }

    askText(text) {
        Logger.debug("FuzzyAction::askText()", text);
        this.createInnerFlow();
        let answerKey = this.getAnswerKey();
        let textAnswerKey = answerKey + "_text_" + this.textAttempts;
        this.steps.push(textAnswerKey);
        this.textAttempts++;
        this.innerFlow.text(textAnswerKey, text, this.invalidText)
        .action((subFlowCallback) => {
            this.askedQuestions = true;
            this.checkText(textAnswerKey);
            subFlowCallback();
        });
    }

    showCandidates(candidates, text, askAgainOnDidNot) {
        Logger.debug("FuzzyAction::showCandidates() Candidates: " + candidates.length);
        this.createInnerFlow();
        let answerKey = this.getAnswerKey();
        let candidateAnswerKey = answerKey + "_candidate_" + this.candidateAttempts;
        let candidateText = text || "";
        this.steps.push(candidateAnswerKey);
        this.candidateAttempts++;
        this.innerFlow.multiple(candidateAnswerKey, candidateText, this.invalidText);
        for(let candidate of candidates) {
            let name = candidate.name;
            let label = candidate.label;
            let style = candidate.style;
            this.innerFlow.option(RegexTools.getOptionRegex(name))
            .button(name, label, style);
        }
        this.innerFlow.option(this.didNotRegex)
        .button(this.didNotButtonName, this.didNotButtonLabel, this.didNotButtonStyle)
        .action((subFlowCallback) => {
            let answerValue = this.flow.answers.get(candidateAnswerKey);
            if(!answerValue || !answerValue.match || answerValue.match(this.didNotRegex)) {
                if(this.maxAttempts > 0 && this.textAttempts >= this.maxAttempts
                        && (this.failFlow || !this.indexText || !this.indexOptionText)) {
                    this.done(null);
                } else if(askAgainOnDidNot) {
                    this.askText(this.reformulateText || this.questionText);
                } else {
                    this.showIndex();
                }
                subFlowCallback();
                return;
            }
            subFlowCallback();
            for(let candidate of candidates) {
                if(candidate.name === answerValue) {
                    this.done(candidate);
                    subFlowCallback();
                    return;
                }
            }
            this.onError("FuzzyAction::showCandidates() Unable to find matching candidate: ", answerValue);
            this.done(null);
            subFlowCallback();
        });
    }

    showIndex() {
        Logger.debug("FuzzyAction::showIndex()");
        this.createInnerFlow();
        let letters = [];
        let availableOptions = [];
        for(let candidate of this.candidates) {
            let name = candidate.name;
            if(!name || name === "") {
                continue;
            }
            let letter = name.charAt(0);
            if(letters.indexOf(letter) === -1) {
                letters.push(letter);
            }
        }

        for(let option of this.indexOptions) {
            for(let i = 0 ; i < option.length ; i++) {
                let c = option.charAt(i);
                if(letters.indexOf(c) !== -1) {
                    availableOptions.push(option);
                    break;
                }
            }
        }

        Logger.debug("FuzzyAction::showIndex() Letters ", letters);
        Logger.debug("FuzzyAction::showIndex() Options ", availableOptions);

        if(availableOptions.length === 0) {
            this.askText(this.reformulateText || this.questionText);
            return;
        }
        let answerKey = this.getAnswerKey();
        let indexAnswerKey = answerKey + "_index_" + this.indexAttempts;
        this.steps.push(indexAnswerKey);
        this.indexAttempts++;
        this.innerFlow.multiple(indexAnswerKey, this.indexText, this.invalidText);
        for(let option of availableOptions) {
            let label = option.toUpperCase();
            let style = "orange";
            this.innerFlow.option(RegexTools.getOptionRegex(option))
            .button(option, label, style);
        }
        this.innerFlow.action((subFlowCallback) => {
            let answerValue = this.flow.answers.get(indexAnswerKey);
            this.showIndexOption(answerValue);
            subFlowCallback();
        });
    }

    showIndexOption(indexOption) {
        Logger.debug("FuzzyAction::showIndexOption() Index option " + indexOption);
        let availableCandidates = [];
        for(let candidate of this.candidates) {
            let name = candidate.name;
            if(!name || name === "") {
                continue;
            }
            let letter = name.charAt(0);
            if(indexOption.indexOf(letter) !== -1) {
                availableCandidates.push(candidate);
            }
        }
        this.showCandidates(availableCandidates, this.indexOptionText, false);
    }

    checkText(textAnswerKey) {
        let answerValue = this.flow.answers.get(textAnswerKey);
        Logger.debug("FuzzyAction::checkText() Checking: attempt: key: " + textAnswerKey + " value: " + answerValue);

        this.lastText = answerValue;

        // Copy candidates
        let checkCandidates = this.candidates.slice();
        let possibleCandidates = [];
        let matchedCandidates = [];
        let checkWords = [];

        let words = answerValue.match(RegexTools.getTextRegex());
        for(let word of words) {
            if(word.length < this.minWordLength) {
//                Logger.debug("FuzzyAction::checkText() Skipping word, too short: " + word);
                continue;
            }
            word = word.toLowerCase();
            if(this.excludeWords.indexOf(word) !== -1) {
                Logger.debug("FuzzyAction::checkText() Word in exclude list: " + word);
                continue;
            }
            if(checkWords.indexOf(word) !== -1) {
//                Logger.debug("FuzzyAction::checkText() Word already in check list: " + word);
                continue;
            }
            checkWords.push(word);
        }

        let matches = [];

        for(let word of checkWords) {
            Logger.debug("FuzzyAction::checkText() Checking word: " + word);

            let removeCandidates = [];

            for(let candidate of checkCandidates) {
                let name = candidate.getName();
                let nameDistance = Levenshtein(word, name);
//                Logger.debug("FuzzyAction::checkText() word: " + word + " name: " + name + " distance: " + nameDistance);

                let bestAlias;
                let aliasDistance = Number.MAX_SAFE_INTEGER;

                let aliases = candidate.getAliases();
                for(let alias of aliases) {
                    let d = Levenshtein(word, alias);
//                    Logger.debug("FuzzyAction::checkText() word: " + word + " alias: " + alias + " distance: " + d);
                    if(d < aliasDistance) {
                        aliasDistance = d;
                        bestAlias = alias;
                    }
                }

                let distance;
                if(aliasDistance < nameDistance) {
                    distance = aliasDistance;
                } else {
                    distance = nameDistance;
                }

                if(distance > this.maxLevenshteinDistance) {
//                    Logger.debug("FuzzyAction::checkText() Candidate exceeds max distance: " + name + " distance: " + distance);
                    continue;
                }

                let matchData = {};
                matchData["distance"] = distance;
                matchData["candidate"] = name;
                matchData["word"] = word;
                if(aliasDistance < nameDistance) {
                    Logger.debug("FuzzyAction::checkText() Candidate alias within distance: name: \"" + name + "\" word: \"" + word + "\" alias: \"" + bestAlias + "\" distance: " + aliasDistance);
                    matchData["alias"] = bestAlias;
                } else {
                    Logger.debug("FuzzyAction::checkText() Candidate name within distance: name: \"" + name + "\" word: \"" + word + "\" distance: " + nameDistance);
                    matchData["name"] = name;
                }

                if(distance === 0) {
                    if(matchedCandidates.indexOf(candidate) === -1) {
                        matchedCandidates.push(candidate);
                        removeCandidates.push(candidate);
                        matches.push(matchData);
                    }
                } else if(distance <= this.maxLevenshteinDistance) {
                    if(possibleCandidates.indexOf(candidate) === -1) {
                        possibleCandidates.push(candidate);
                        matches.push(matchData);
                    }
                }
            }

            // Remove exact matches, don't need to check again
            for(let removeCandidate of removeCandidates) {
                let index = checkCandidates.indexOf(removeCandidate);
                checkCandidates.splice(index, 1);
            }
        }

        this.flow.answers.add(textAnswerKey + "_matches", matches);

        if(!this.alwaysConfirm && matchedCandidates.length === 1 && possibleCandidates.length === 0) {
            this.done(matchedCandidates[0]);
            return;
        }

        if(this.combineMatches && matchedCandidates.length > 0 && possibleCandidates.length > 0) {
            let optionCandidates = [];
            for(let candidate of matchedCandidates) {
                if(optionCandidates.indexOf(candidate) === -1) {
                    optionCandidates.push(candidate);
                }
            }
            for(let candidate of possibleCandidates) {
                if(optionCandidates.indexOf(candidate) === -1) {
                    optionCandidates.push(candidate);
                }
            }
            this.showCandidates(optionCandidates, this.didYouMeanText, true);
        } else if(matchedCandidates.length > 0) {
            this.showCandidates(matchedCandidates, this.didYouMeanText, true);
        } else if(possibleCandidates.length > 0) {
            this.showCandidates(possibleCandidates, this.didYouMeanText, true);
        } else if(this.maxAttempts > 0 && this.textAttempts >= this.maxAttempts) {
            if(this.failFlow || !this.indexText || !this.indexOptionText) {
                this.done(null);
            } else {
                this.showIndex();
            }
        } else {
            this.askText(this.reformulateText || this.questionText);
        }
    }

    done(candidate) {
        let answerKey = this.getAnswerKey();
        Logger.debug("FuzzyAction::done() Answer key: \"" + answerKey + "\" candidate:", candidate);
        if(candidate) {
            if(candidate.name) {
                this.flow.answers.add(answerKey, candidate.name);
                if(candidate.label) {
                    this.flow.answers.add(answerKey + "_label", candidate.label);
                }
            }
        } else if(this.failName) {
            this.flow.answers.add(answerKey, this.failName);
            if(this.failLabel) {
                this.flow.answers.add(answerKey + "_label", this.failLabel);
            }
        }
        if(candidate) {
            if(candidate.subFlow) {
                this.setSubFlow(candidate.subFlow);
            }
        } else if(this.failFlow) {
            this.setSubFlow(this.failFlow);
        }
        if(this.textAttempts && this.textAttempts > 0) {
            let attemptsKey = answerKey + "_attempts";
            Logger.debug("FuzzyAction::done() Adding key: " + attemptsKey + " value: " + this.textAttempts);
            this.flow.answers.add(attemptsKey, this.textAttempts);
        }
        if(this.steps && this.steps.length > 0) {
            let stepsKey = answerKey + "_steps";
            Logger.debug("FuzzyAction::done() Adding key: " + stepsKey + " value: " + this.steps);
            this.flow.answers.add(stepsKey, this.steps);
        }
        if(this.lastText && this.lastText !== "") {
            let textKey = answerKey + "_text";
            Logger.debug("FuzzyAction::done() Adding key: " + textKey + " value: " + this.lastText);
            this.flow.answers.add(textKey, this.lastText);
        }
        let successKey = answerKey + "_success";
        let successValue = candidate != null;
        Logger.debug("FuzzyAction::done() Adding key: " + successKey + " value: " + successValue);
        this.flow.answers.add(successKey, successValue);

//        var keys = this.flow.answers.getKeysWithPrefix(answerKey);
//        for(let i in keys) {
//            var key = keys[i];
//            var value = this.flow.answers.get(key);
//            Logger.debug("FuzzyAction::done() Key: \"" + key + "\" Value: \"" + value + "\"");
//        }

        this.flowCallback();
    }

    createInnerFlow() {
        if(!this.innerFlow) {
            this.innerFlow = this.flow.createInstance();
        }
    }

    addCandidate(name, label, style, aliases, subFlow) {
        let candidate = new FuzzyCandidate(name, label, style, subFlow);
        if(aliases && aliases.length > 0) {
            candidate.addAliases(aliases);
        }
        this.candidates.push(candidate);
    }

    addExcludeWord(word) {
        this.excludeWords.push(word.toLowerCase());
    }

    setReformulateText(reformulateText) {
        this.reformulateText = reformulateText;
    }

    setFailValues(failName, failLabel) {
        this.failName = failName;
        this.failLabel = failLabel;
    }

    setFailFlow(failFlow) {
        this.failFlow = failFlow;
    }

    setMaxAttempts(maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    setMaxLevenshteinDistance(maxLevenshteinDistance) {
        this.maxLevenshteinDistance = maxLevenshteinDistance;
    }

    setMinWordLength(minWordLength) {
        this.minWordLength = minWordLength;
    }

    setShowIndex(indexText, indexOptionText) {
        this.indexText = indexText;
        this.indexOptionText = indexOptionText;
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

    reset() {
        super.reset();
        this.steps = [];
        this.textAttempts = 0;
        this.candidateAttempts = 0;
        this.indexAttempts = 0;
        this.lastText = null;

        let answers = this.flow.answers;
        let answerKey = this.getAnswerKey();
        let keys = answers.getKeysWithPrefix(answerKey);
        for(let key of keys) {
            answers.remove(key);
        }
    }
}

class FuzzyCandidate {
    constructor(name, label, style, subFlow) {
        this.name = name;
        this.label = label;
        this.style = style;
        this.subFlow = subFlow;

        this.aliases = [];
    }

    getName() {
        return this.name;
    }

    addAlias(alias) {
        this.aliases.push(StringTools.safeName(alias, -1, true, true));
    }

    addAliases(aliases) {
        for(let alias of aliases) {
            this.addAlias(alias);
        }
    }

    getAliases() {
        return this.aliases;
    }
}

module.exports = FuzzyAction;
