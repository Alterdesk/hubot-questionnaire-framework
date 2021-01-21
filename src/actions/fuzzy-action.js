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
        var answerKey = this.getAnswerKey();
        Logger.debug("FuzzyAction::start() \"" + answerKey + "\"");
        this.flowCallback = flowCallback;
        this.reset();
        this.askText(this.questionText);
        this.flow.startSubFlow(this.innerFlow, false);
    }

    askText(text) {
        Logger.debug("FuzzyAction::askText()", text);
        this.createInnerFlow();
        var answerKey = this.getAnswerKey();
        var textAnswerKey = answerKey + "_text_" + this.textAttempts;
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
        var answerKey = this.getAnswerKey();
        var candidateAnswerKey = answerKey + "_candidate_" + this.candidateAttempts;
        var candidateText = text || "";
        this.steps.push(candidateAnswerKey);
        this.candidateAttempts++;
        this.innerFlow.multiple(candidateAnswerKey, candidateText, this.invalidText);
        for(let index in candidates) {
            var candidate = candidates[index];
            var name = candidate.name;
            var label = candidate.label;
            var style = candidate.style;
            this.innerFlow.option(RegexTools.getOptionRegex(name))
            .button(name, label, style);
        }
        this.innerFlow.option(this.didNotRegex)
        .button(this.didNotButtonName, this.didNotButtonLabel, this.didNotButtonStyle)
        .action((subFlowCallback) => {
            var answerValue = this.flow.answers.get(candidateAnswerKey);
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
            for(let index in candidates) {
                var candidate = candidates[index];
                if(candidate.name === answerValue) {
                    this.done(candidate);
                    subFlowCallback();
                    return;
                }
            }
            this.onError("FuzzyAction::showCandidates() Unable to find matching candidate: ", answerValue)
            this.done(null);
            subFlowCallback();
        });
    }

    showIndex() {
        Logger.debug("FuzzyAction::showIndex()");
        this.createInnerFlow();
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
            this.askText(this.reformulateText || this.questionText);
            return;
        }
        var answerKey = this.getAnswerKey();
        var indexAnswerKey = answerKey + "_index_" + this.indexAttempts;
        this.steps.push(indexAnswerKey);
        this.indexAttempts++;
        this.innerFlow.multiple(indexAnswerKey, this.indexText, this.invalidText)
        for(let index in availableOptions) {
            var option = availableOptions[index];
            var label = option.toUpperCase();
            var style = "orange";
            this.innerFlow.option(RegexTools.getOptionRegex(option))
            .button(option, label, style);
        }
        this.innerFlow.action((subFlowCallback) => {
            var answerValue = this.flow.answers.get(indexAnswerKey);
            this.showIndexOption(answerValue);
            subFlowCallback();
        });
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
        var answerValue = this.flow.answers.get(textAnswerKey);
        Logger.debug("FuzzyAction::checkText() Checking: attempt: key: " + textAnswerKey + " value: " + answerValue);

        this.lastText = answerValue;

        // Copy candidates
        var checkCandidates = this.candidates.slice();
        var possibleCandidates = [];
        var matchedCandidates = [];
        var checkWords = [];

        var words = answerValue.match(RegexTools.getTextRegex());
        for(let i in words) {
            var word = words[i];
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

        var matches = [];

        for(let i in checkWords) {
            var word = checkWords[i];
            Logger.debug("FuzzyAction::checkText() Checking word: " + word);

            let removeCandidates = [];

            for(let i in checkCandidates) {
                var candidate = checkCandidates[i];

                var name = candidate.getName();
                var nameDistance = Levenshtein(word, name);
//                Logger.debug("FuzzyAction::checkText() word: " + word + " name: " + name + " distance: " + nameDistance);

                var bestAlias;
                var aliasDistance = Number.MAX_SAFE_INTEGER;

                var aliases = candidate.getAliases();
                for(let index in aliases) {
                    var alias = aliases[index];
                    var d = Levenshtein(word, alias);
//                    Logger.debug("FuzzyAction::checkText() word: " + word + " alias: " + alias + " distance: " + d);
                    if(d < aliasDistance) {
                        aliasDistance = d;
                        bestAlias = alias;
                    }
                }

                var distance;
                if(aliasDistance < nameDistance) {
                    distance = aliasDistance;
                } else {
                    distance = nameDistance;
                }

                if(distance > this.maxLevenshteinDistance) {
//                    Logger.debug("FuzzyAction::checkText() Candidate exceeds max distance: " + name + " distance: " + distance);
                    continue;
                }

                var matchData = {};
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
            for(let i in removeCandidates) {
                var removeCandidate = removeCandidates[i];
                var index = checkCandidates.indexOf(removeCandidate);
                checkCandidates.splice(index, 1);
            }
        }

        this.flow.answers.add(textAnswerKey + "_matches", matches);

        if(!this.alwaysConfirm && matchedCandidates.length === 1 && possibleCandidates.length === 0) {
            this.done(matchedCandidates[0]);
            return;
        }

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
        var answerKey = this.getAnswerKey();
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
            var attemptsKey = answerKey + "_attempts";
            Logger.debug("FuzzyAction::done() Adding key: " + attemptsKey + " value: " + this.textAttempts);
            this.flow.answers.add(attemptsKey, this.textAttempts);
        }
        if(this.steps && this.steps.length > 0) {
            var stepsKey = answerKey + "_steps";
            Logger.debug("FuzzyAction::done() Adding key: " + stepsKey + " value: " + this.steps);
            this.flow.answers.add(stepsKey, this.steps);
        }
        if(this.lastText && this.lastText !== "") {
            var textKey = answerKey + "_text";
            Logger.debug("FuzzyAction::done() Adding key: " + textKey + " value: " + this.lastText);
            this.flow.answers.add(textKey, this.lastText);
        }
        var successKey = answerKey + "_success";
        var successValue = candidate != null;
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
        var candidate = new FuzzyCandidate(name, label, style, subFlow);
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

        var answers = this.flow.answers;
        var answerKey = this.getAnswerKey();
        var keys = answers.getKeysWithPrefix(answerKey);
        for(let i in keys) {
            var key = keys[i];
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
        for(let index in aliases) {
            this.addAlias(aliases[index]);
        }
    }

    getAliases() {
        return this.aliases;
    }
}

module.exports = FuzzyAction;
