const Action = require('./actions/action.js');
const Answers = require('./answers.js');
const AnswerCondition = require('./conditions/answer-condition.js');
const AttachmentQuestion = require('./questions/attachment-question.js');
const BackAction = require('./actions/back-action.js');
const ChatTools = require('./utils/chat-tools.js');
const CloseGroupAction = require('./actions/close-group-action.js');
const CompleteMentionsAction = require('./actions/complete-mentions-action.js');
const EmailQuestion = require('./questions/email-question.js');
const FuzzyAction = require('./actions/fuzzy-action.js');
const Information = require('./information.js');
const Listener = require('./listener.js');
const MentionQuestion = require('./questions/mention-question.js');
const MultipleChoiceQuestion = require('./questions/multiple-choice-question.js');
const NumberQuestion = require('./questions/number-question.js');
const LeaveGroupAction = require('./actions/leave-group-action.js');
const Logger = require('./logger.js');
const PhoneNumberQuestion = require('./questions/phone-number-question.js');
const PendingRequest = require('./pending-request.js');
const PolarQuestion = require('./questions/polar-question.js');
const Question = require('./questions/question.js');
const SendMessageData = require('./containers/send-message-data.js');
const SetAnswerAction = require('./actions/set-answer-action.js');
const StopConditionAction = require('./actions/stop-condition-action.js');
const StringTools = require('./utils/string-tools.js');
const SummaryAction = require('./actions/summary-action.js');
const TextQuestion = require('./questions/text-question.js');
const VerificationQuestion = require('./questions/verification-question.js');

// Class for a flow of questions
class Flow {
    constructor(control, stopText, errorText, backText, checkpointText) {
        if(control) {
            this.control = control;
            this.stopText = stopText || control.flowStopText;
            this.errorText = errorText || control.flowErrorText;
            this.backText = backText || control.flowBackText;
            this.checkpointText = checkpointText || control.flowCheckpointText;
            this.restartButtonName = control.restartButtonName;
            this.restartButtonLabel = control.restartButtonLabel;
            this.restartButtonStyle = control.restartButtonStyle;
        } else {
            this.stopText = stopText;
            this.errorText = errorText;
            this.backText = backText;
            this.checkpointText = checkpointText;
        }
        this.currentStep = 0;
        this.repeatIteration = -1;
        this.steps = [];
        this.parsedAnswerKeys = {};
        this.parsedMultiUserAnswers = {};
        this.isRunning = false;
        this.name = "NO_NAME";
    }

    // Add a step to the flow
    add(step) {
        step.setFlow(this);
        if(step instanceof Question) {
            this.lastAddedQuestion = step;
        } else if(step instanceof Action) {
            this.lastAddedAction = step;
        }
        step.addedAfterStart = this.isRunning;
        this.steps.push(step);
        return this;
    }

    // Add a information message to the flow
    info(text, waitMs) {
        this.add(new Information(text, waitMs));
        return this;
    }

    // Add an external action to the flow
    action(callback, waitMs) {
        this.add(new Action(callback, waitMs));
        return this;
    }

    // Add new TextQuestion
    text(answerKey, questionText, invalidText) {
        return this.add(new TextQuestion(answerKey, questionText, invalidText));
    }

    // Use an alternative regular expression for the last added TextQuestion
    regex(regex) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::regex() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof TextQuestion)) {
            Logger.error("Flow::regex() Last added Question is not an instance of TextQuestion");
            return this;
        }
        this.lastAddedQuestion.setRegex(regex);
        return this;
    }

    // Set the minimum and/or maximum length of the last added TextQuestion
    length(minLength, maxLength) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::length() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof TextQuestion)) {
            Logger.error("Flow::length() Last added Question is not an instance of TextQuestion");
            return this;
        }
        this.lastAddedQuestion.setLength(minLength, maxLength);
        return this;
    }

    // Capitalize the first letter of the answer of the last added TextQuestion
    capitalize() {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::capitalize() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof TextQuestion)) {
            Logger.error("Flow::capitalize() Last added Question is not an instance of TextQuestion");
            return this;
        }
        this.lastAddedQuestion.setFormatAnswerFunction(StringTools.capitalizeFirstLetter);
        return this;
    }

    // Capitalize the answer as a last name of the last added TextQuestion
    lastName() {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::lastName() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof TextQuestion)) {
            Logger.error("Flow::lastName() Last added Question is not an instance of TextQuestion");
            return this;
        }
        this.lastAddedQuestion.setFormatAnswerFunction(StringTools.capitalizeLastName);
        return this;
    }

    // Add new NumberQuestion
    number(answerKey, questionText, invalidText) {
        return this.add(new NumberQuestion(answerKey, questionText, invalidText));
    }

    // Set the minimum and/or maximum value range of the last added NumberQuestion
    range(minValue, maxValue) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::range() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof NumberQuestion)) {
            Logger.error("Flow::range() Last added Question is not an instance of NumberQuestion");
            return this;
        }
        this.lastAddedQuestion.setRange(minValue, maxValue);
        return this;
    }

    // Add new EmailQuestion
    email(answerKey, questionText, invalidText) {
        return this.add(new EmailQuestion(answerKey, questionText, invalidText));
    }

    // Set the allowed email domains of the last added EmailQuestion
    domains(allowedDomains) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::domains() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof EmailQuestion)) {
            Logger.error("Flow::domains() Last added Question is not an instance of EmailQuestion");
            return this;
        }
        if(allowedDomains != null) {
            this.lastAddedQuestion.addAllowedDomains(allowedDomains);
        }
        return this;
    }

    // Add new PhoneNumberQuestion
    phone(answerKey, questionText, invalidText) {
        return this.add(new PhoneNumberQuestion(answerKey, questionText, invalidText));
    }

    // Set the allowed country codes of the last added PhoneNumberQuestion
    countryCodes(allowedCountryCodes) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::countryCodes() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PhoneNumberQuestion)) {
            Logger.error("Flow::countryCodes() Last added Question is not an instance of PhoneNumberQuestion");
            return this;
        }
        if(allowedCountryCodes != null) {
            this.lastAddedQuestion.addAllowedCountryCodes(allowedCountryCodes);
        }
        return this;
    }

    // Add new MentionQuestion
    mention(answerKey, questionText, invalidText) {
        return this.add(new MentionQuestion(answerKey, questionText, invalidText));
    }

    // Add mentions to include after answer of the last added MentionQuestion
    includeMentions(mentions) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::includeMentions() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MentionQuestion)) {
            Logger.error("Flow::includeMentions() Last added Question is not an instance of MentionQuestion");
            return this;
        }
        this.lastAddedQuestion.setIncludeMentions(mentions);
        return this;
    }

    // Change if the all mentioned tag is allowed of the last added MentionQuestion
    allAllowed(allowed) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::allAllowed() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MentionQuestion)) {
            Logger.error("Flow::allAllowed() Last added Question is not an instance of MentionQuestion");
            return this;
        }
        this.lastAddedQuestion.setAllAllowed(allowed);
        return this;
    }

    // Change if the robot mentioned tag is allowed of the last added MentionQuestion
    robotAllowed(allowed) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::robotAllowed() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MentionQuestion)) {
            Logger.error("Flow::robotAllowed() Last added Question is not an instance of MentionQuestion");
            return this;
        }
        this.lastAddedQuestion.setRobotAllowed(allowed);
        return this;
    }

    // Add predefined action to complete mentioned user data that were mentioned in the last added MentionQuestion
    completeMentions(onlyCompleteAll) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::completeMentions() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MentionQuestion)) {
            Logger.error("Flow::completeMentions() Last added Question is not an instance of MentionQuestion");
            return this;
        }
        var answerKey = this.lastAddedQuestion.answerKey;
        return this.add(new CompleteMentionsAction(answerKey, onlyCompleteAll));
    }

    // Add new AttachmentQuestion
    attachment(answerKey, questionText, invalidText) {
        return this.add(new AttachmentQuestion(answerKey, questionText, invalidText));
    }

    // Set the minimum and/or maximum count of attachments of the last added AttachmentQuestion
    count(minCount, maxCount) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::count() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof AttachmentQuestion)) {
            Logger.error("Flow::count() Last added Question is not an instance of AttachmentQuestion");
            return this;
        }
        this.lastAddedQuestion.setCountRange(minCount, maxCount);
        return this;
    }

    // Set the minimum and/or maximum file size in bytes of attachments of the last added AttachmentQuestion
    size(minSize, maxSize) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::size() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof AttachmentQuestion)) {
            Logger.error("Flow::size() Last added Question is not an instance of AttachmentQuestion");
            return this;
        }
        this.lastAddedQuestion.setSizeRange(minSize, maxSize);
        return this;
    }

    // Set an array of allowed extensions for attachments of the last added AttachmentQuestion
    extensions(allowedExtensions) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::extensions() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof AttachmentQuestion)) {
            Logger.error("Flow::extensions() Last added Question is not an instance of AttachmentQuestion");
            return this;
        }
        this.lastAddedQuestion.addAllowedExtensions(allowedExtensions);
        return this;
    }

    // Add new PolarQuestion
    polar(answerKey, questionText, invalidText) {
        return this.add(new PolarQuestion(answerKey, questionText, invalidText));
    }

    // Set the positive regex and optional sub flow of the last added PolarQuestion
    positive(regex, subFlow) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::positive() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            Logger.error("Flow::positive() Last added Question is not an instance of PolarQuestion");
            return this;
        }
        this.lastAddedQuestion.setPositive(regex, subFlow);
        return this;
    }

    // Add a button for the positive answer of the last added PolarQuestion
    positiveButton(name, label, style) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::positiveButton() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            Logger.error("Flow::positiveButton() Last added Question is not an instance of PolarQuestion");
            return this;
        }
        this.lastAddedQuestion.setPositiveButton(name, label, style);
        return this;
    }

    // Set the negative regex and optional sub flow of the last added PolarQuestion
    negative(regex, subFlow) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::negative() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            Logger.error("Flow::negative() Last added Question is not an instance of PolarQuestion");
            return this;
        }
        this.lastAddedQuestion.setNegative(regex, subFlow);
        return this;
    }

    // Add a button for the negative answer of the last added PolarQuestion
    negativeButton(name, label, style) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::negativeButton() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion)) {
            Logger.error("Flow::negativeButton() Last added Question is not an instance of PolarQuestion");
            return this;
        }
        this.lastAddedQuestion.setNegativeButton(name, label, style);
        return this;
    }

    // Add new MultipleChoiceQuestion
    multiple(answerKey, questionText, invalidText) {
        return this.add(new MultipleChoiceQuestion(answerKey, questionText, invalidText));
    }

    // Add an option regex, optional sub flow and optional value of the last added MultipleChoiceQuestion
    option(regex, subFlow, value) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::option() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MultipleChoiceQuestion)) {
            Logger.error("Flow::option() Last added Question is not an instance of MultipleChoiceQuestion");
            return this;
        }
        this.lastAddedQuestion.addOption(regex, subFlow, value);
        return this;
    }

    // Add a button to the last added MultipleChoiceOption
    button(name, label, style) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::button() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MultipleChoiceQuestion)) {
            Logger.error("Flow::button() Last added Question is not an instance of MultipleChoiceQuestion");
            return this;
        }
        this.lastAddedQuestion.addButton(name, label, style);
        return this;
    }

    // Set the last added MultipleChoiceQuestion to allow multiple answers
    multiAnswer() {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::multiAnswer() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof MultipleChoiceQuestion)) {
            Logger.error("Flow::multiAnswer() Last added Question is not an instance of MultipleChoiceQuestion");
            return this;
        }
        this.lastAddedQuestion.setMultiAnswer(true);
        return this;
    }

    // Set the question payload style for the last added MultipleChoiceQuestion
    questionStyle(style) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::questionStyle() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof PolarQuestion) && !(this.lastAddedQuestion instanceof MultipleChoiceQuestion)) {
            Logger.error("Flow::questionStyle() Last added Question is not an instance of PolarQuestion or MultipleChoiceQuestion");
            return this;
        }
        this.lastAddedQuestion.setQuestionStyle(style);
        return this;
    }

    // Add new VerificationQuestion
    verification(answerKey, provider, retrieveAttributes) {
        var verificationQuestion = new VerificationQuestion(answerKey, "", "");
        verificationQuestion.setProvider(provider);
        if(retrieveAttributes != null) {
            verificationQuestion.setRetrieveAttributes(retrieveAttributes);
        }
        return this.add(verificationQuestion);
    }

    // Set an optional sub flow if the user is verified
    verified(subFlow) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::verified() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof VerificationQuestion)) {
            Logger.error("Flow::verified() Last added Question is not an instance of MultipleChoiceQuestion");
            return this;
        }
        this.lastAddedQuestion.setVerifiedSubFlow(subFlow);
        return this;
    }

    // Set an optional sub flow if the user declines verification
    unverified(subFlow) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::unverified() No Question added to flow");
            return this;
        }
        if(!(this.lastAddedQuestion instanceof VerificationQuestion)) {
            Logger.error("Flow::unverified() Last added Question is not an instance of MultipleChoiceQuestion");
            return this;
        }
        this.lastAddedQuestion.setUnverifiedSubFlow(subFlow);
        return this;
    }

    // Mark this question as a checkpoint
    checkpoint() {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::checkpoint() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setCheckpoint(true);
        return this;
    }

    // Ask the last added question to the users that were mentioned a MentionQuestion earlier (multi user question)
    askMentions(mentionAnswerKey) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::askMentions() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setMentionAnswerKey(mentionAnswerKey);
        return this;
    }

    // Ask the last added question to a list of user ids (multi user question)
    askUserIds(userIds) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::askUserIds() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setUserIds(userIds);
        return this;
    }

    // Break multi user question on a certain answer value, and set if the flow should continue or stop
    breakOnValue(value, stop) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::breakOnValue() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setBreakOnValue(value, stop);
        return this;
    }

    // Break multi user question when an answer matches the given regex, and set if the flow should continue or stop
    breakOnRegex(regex, stop) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::breakOnRegex() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setBreakOnRegex(regex, stop);
        return this;
    }

    // Break multi user question on a certain number of answers
    breakOnCount(count, stop) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::breakOnCount() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setBreakOnCount(count, stop);
        return this;
    }

    // Stop the flow when a certain answer value, optionally set an answer value by key
    stopOnValue(value, sendMessage, setAnswerKey, setAnswerValue) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::stopOnValue() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setStopOnValue(value, sendMessage, setAnswerKey, setAnswerValue);
        return this;
    }

    // Stop the flow when an answer matches the given regex, optionally set an answer value by key
    stopOnRegex(regex, sendMessage, setAnswerKey, setAnswerValue) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::stopOnRegex() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setStopOnRegex(regex, sendMessage, setAnswerKey, setAnswerValue);
        return this;
    }

    // Set a callback to format the question text with by the answers given earlier
    formatAnswer(formatAnswerFunction) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::formatAnswer() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setFormatAnswerFunction(formatAnswerFunction);
        return this;
    }

    // Set a callback to format the question text with by the answers given earlier
    formatQuestion(formatQuestionFunction) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::formatQuestion() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setFormatQuestionFunction(formatQuestionFunction);
        return this;
    }

    // Set a callback to summarize given answers after every user answer for a multi user question
    multiUserSummary(multiUserSummaryFunction) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::multiUserSummary() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setMultiUserSummaryFunction(multiUserSummaryFunction);
        return this;
    }

    // Add a delay to the last added question
    delay(ms) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::delay() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setDelay(ms);
        return this;
    }

    // Use non-default timeout for last added question
    timeout(ms, text, callback) {
        if(this.lastAddedQuestion == null) {
            Logger.error("Flow::timeout() No Question added to flow");
            return this;
        }
        this.lastAddedQuestion.setTimeout(ms, text, callback);
        return this;
    }

    // Set an action using a callback to summarize the given answers
    summary(summaryFunction, waitMs) {
        this.add(new SummaryAction(summaryFunction, waitMs));
        return this;
    }

    fuzzy(answerKey, questionText, invalidText, waitMs) {
        this.add(new FuzzyAction(answerKey, questionText, invalidText, waitMs));
        return this;
    }

    candidate(name, label, style, aliases, subFlow) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::candidate() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof FuzzyAction)) {
            Logger.error("Flow::candidate() Last added Action is not an instance of FuzzyAction");
            return this;
        }
        this.lastAddedAction.addCandidate(name, label, style, aliases, subFlow);
        return this;
    }

    reformulate(reformulateText) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::reformulate() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof FuzzyAction)) {
            Logger.error("Flow::reformulate() Last added Action is not an instance of FuzzyAction");
            return this;
        }
        this.lastAddedAction.setReformulateText(reformulateText);
        return this;
    }

    didYouMean(didYouMeanText, didNotRegex) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::didYouMean() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof FuzzyAction)) {
            Logger.error("Flow::didYouMean() Last added Action is not an instance of FuzzyAction");
            return this;
        }
        this.lastAddedAction.setDidYouMean(didYouMeanText, didNotRegex);
        return this;
    }

    didNotMeanButton(name, label, style) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::didNotMeanButton() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof FuzzyAction)) {
            Logger.error("Flow::didNotMeanButton() Last added Action is not an instance of FuzzyAction");
            return this;
        }
        this.lastAddedAction.setDidNotMeanButton(name, label, style);
        return this;
    }

    showIndex(indexText, indexOptionText) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::showIndex() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof FuzzyAction)) {
            Logger.error("Flow::showIndex() Last added Action is not an instance of FuzzyAction");
            return this;
        }
        this.lastAddedAction.setShowIndex(indexText, indexOptionText);
        return this;
    }

    maxAttempts(max) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::maxAttempts() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof FuzzyAction)) {
            Logger.error("Flow::maxAttempts() Last added Action is not an instance of FuzzyAction");
            return this;
        }
        this.lastAddedAction.setMaxAttempts(max);
        return this;
    }

    excludeWord(word) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::excludeWord() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof FuzzyAction)) {
            Logger.error("Flow::excludeWord() Last added Action is not an instance of FuzzyAction");
            return this;
        }
        this.lastAddedAction.addExcludeWord(word);
        return this;
    }

    alwaysConfirmFuzzy(alwaysConfirm) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::alwaysConfirmFuzzy() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof FuzzyAction)) {
            Logger.error("Flow::alwaysConfirmFuzzy() Last added Action is not an instance of FuzzyAction");
            return this;
        }
        this.lastAddedAction.setAlwaysConfirm(alwaysConfirm);
        return this;
    }

    combineMatchesFuzzy(combineMatches) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::combineMatchesFuzzy() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof FuzzyAction)) {
            Logger.error("Flow::combineMatchesFuzzy() Last added Action is not an instance of FuzzyAction");
            return this;
        }
        this.lastAddedAction.setCombineMatches(combineMatches);
        return this;
    }

    stopCondition(sendMessageOnStop, waitMs) {
        this.add(new StopConditionAction(sendMessageOnStop, waitMs));
        return this;
    }

    stopAnswerCondition(answerKey, answerValue) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::stopAnswerCondition() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof StopConditionAction)) {
            Logger.error("Flow::stopAnswerCondition() Last added Action is not an instance of StopConditionAction");
            return this;
        }
        var condition = new AnswerCondition();
        condition.addKey(answerKey);
        condition.setValue(answerKey, answerValue);
        this.lastAddedAction.addCondition(condition);
        return this;
    }

    stopConditionSet(answerKey, answerValue) {
        if(this.lastAddedAction == null) {
            Logger.error("Flow::stopConditionSet() No Action added to flow");
            return this;
        }
        if(!(this.lastAddedAction instanceof StopConditionAction)) {
            Logger.error("Flow::stopConditionSet() Last added Action is not an instance of StopConditionAction");
            return this;
        }
        this.lastAddedAction.setAnswerOnStop(answerKey, answerValue);
        return this;
    }

    setAnswer(answerKey, answerValue) {
        this.add(new SetAnswerAction(answerKey, answerValue));
        return this;
    }

    back(checkpoint) {
        this.add(new BackAction(checkpoint));
        return this;
    }

    leaveGroup() {
        this.add(new LeaveGroupAction());
        return this;
    }

    closeGroup() {
        this.add(new CloseGroupAction());
        return this;
    }

    setRepeatIteration(repeatIteration) {
        Logger.debug("Flow::setRepeatIteration()", repeatIteration);
        this.repeatIteration = repeatIteration;
        this.currentStep = 0;
    }

    setName(name) {
        this.name = name;
    }

    // Set a restart button for error, stop and timeout messages
    restartButton(name, label, style) {
        this.restartButtonName = name;
        this.restartButtonLabel = label;
        this.restartButtonStyle = style;
        return this;
    }

    // Send a restart message
    sendRestartMessage(text) {
        if(!text || text === "") {
            return;
        }
        if(!this.msg || !this.msg.message || !this.msg.message.user) {
            return;
        }

        var sendMessageData = new SendMessageData();
        sendMessageData.setHubotMessage(this.msg.message);
        sendMessageData.setMessage(text);
        if(this.restartButtonName && this.restartButtonLabel) {
            var style = this.restartButtonStyle || "theme";
            sendMessageData.addQuestionButtonWithName(this.restartButtonName, this.restartButtonLabel, style);
            sendMessageData.addRequestUserId(ChatTools.getUserId(this.msg.message.user));
        }
        this.control.sendRequestMessage(sendMessageData);
    }

    // Set the flow stopped callback function
    stopped(stoppedCallback) {
        this.stoppedCallback = stoppedCallback;
        return this;
    }

    // Set the flow finished callback function
    finish(finishedCallback) {
        this.finishedCallback = finishedCallback;
        return this;
    }

    // Start the flow
    start(msg, answers) {
        Logger.info("Flow::start()", this.name);
        if(!this.superFlow) {
            this.control.addActiveQuestionnaire(msg.message, this);
        }
        this.isRunning = true;
        if(this.steps.length === 0) {
            Logger.error("Flow::start() No steps for flow");
            this.stop(true);
            return;
        } else if(msg == null) {
            Logger.error("Flow::start() msg is null");
            this.stop(true);
            return;
        }
        // Check for Schedule API pre-filled answers
        if(msg.message && msg.message.answers) {
            if(answers) {
                var preAnswers = msg.message.answers;
                var keys = preAnswers.keys();
                if(keys) {
                    for(let index in keys) {
                        var key = keys[index];
                        answers.add(key, preAnswers.get(key))
                    }
                }
            } else {
                answers = msg.message.answers;
            }
            Logger.debug("Flow::start() got pre-filled answers", answers);
        }
        this.msg = msg;
        this.answers = answers || new Answers();
        this.next();
    }

    // Callback function that is used with Listeners and PendingRequests
    callback(response, listenerOrPendingRequest) {
        var question = listenerOrPendingRequest.question;
        var flow = question.flow;

        if(listenerOrPendingRequest instanceof Listener) {
            var listener = listenerOrPendingRequest;

            // Check if the stop regex was triggered
            if(listener.stop) {
                Logger.debug("Flow::callback() stop regex triggered");
                question.cleanup(response.message);
                flow.questionStop(question);
                return;
            }

            // Check if the back regex was triggered
            if(listener.back) {
                Logger.debug("Flow::callback() back regex triggered");
                question.cleanup(response.message);
                // Send back text message if set
                if(flow.backText && flow.backText != "") {
                    response.send(flow.backText)
                }
                if(flow.control.questionnaireBackCallback) {
                    var userId = ChatTools.getUserId(flow.msg.message.user);
                    flow.control.questionnaireBackCallback(userId, false, flow.answers);
                }
                // Try to go back
                if(!flow.previous(false)) {
                    Logger.error("Flow::callback() Unable to go back, restarting flow");
                    flow.next();
                }
                return;
            }

            if(listener.checkpoint) {
                Logger.debug("Flow::callback() checkpoint regex triggered");
                question.cleanup(response.message);
                // Send checkpoint text message if set
                if(flow.checkpointText && flow.checkpointText != "") {
                    response.send(flow.checkpointText)
                }
                if(flow.control.questionnaireBackCallback) {
                    var userId = ChatTools.getUserId(flow.msg.message.user);
                    this.control.questionnaireBackCallback(userId, true, flow.answers);
                }
                // Try to go to last checkpoint
                if(!flow.previous(true)) {
                    Logger.error("Flow::callback() Unable to go back to last checkpoint, restarting flow");
                    flow.next();
                }
                return;
            }

            // Let the Question check and parse the message
            var answerValue = question.checkAndParseAnswer(listener.matches, response.message);
            if(answerValue == null) {
                Logger.debug("Flow::callback() No valid answer value from listener, resetting listener");
                if(flow.control.questionAnswerRejectedCallback) {
                    var userId = ChatTools.getUserId(response.message.user);
                    var answerKey = question.getAnswerKey();
                    flow.control.questionAnswerRejectedCallback(userId, answerKey, response.message, flow.answers, question);
                }
                if(question.resendOnInvalid) {
                    response.send(question.invalidText);
                    question.send(flow.control, response, this.callback);
                } else {
                    flow.control.addListener(response.message, new Listener(response, this.callback, question));
                }
                return ;
            }
            if(flow.control.hasPendingRequest(response.message)) {
                flow.control.removePendingRequest(response.message);
            }
            flow.onAnswer(response, question, answerValue);
        } else if(listenerOrPendingRequest instanceof PendingRequest) {
            var pendingRequest = listenerOrPendingRequest;

            var answerValue = question.checkAndParseAnswer(pendingRequest.matches, response.message);
            if(answerValue == null) {
                Logger.debug("Flow::callback() No valid answer value from pending request or wrong request message id, resetting pending request");
                return flow.control.addPendingRequest(response.message, new PendingRequest(response, this.callback, question));
            }
            if(flow.control.hasListener(response.message)) {
                flow.control.removeListener(response.message);
            }
            flow.onAnswer(response, question, answerValue);
        } else {
            Logger.error("Flow::callback() Object not instance of Listener or PendingRequest");
            flow.questionStop(question);
        }
    }

    // Process question answer
    onAnswer(response, question, answerValue) {
        var answerKey = question.getAnswerKey();

        // Format the given answer if a function was set
        if(question.formatAnswerFunction) {
            Logger.debug("Flow::onAnswer() Formatting answer: key: \"" + answerKey + "\" value: \"" + answerValue + "\"");
            var formatted = question.formatAnswerFunction(answerValue);
            if(formatted && formatted !== "") {
                answerValue = formatted;
                Logger.debug("Flow::onAnswer() Formatted answer: key: \"" + answerKey + "\" value: \"" + answerValue + "\"");
            }
        }

        var choiceLabel = question.getLabelForAnswer(answerValue);
        var choiceValue = question.getValueForAnswer(answerValue);

        // Is the question asked to multiple users and not all users answered yet
        if(question.isMultiUser) {
            var multiAnswers = this.answers.get(answerKey);
            if(!multiAnswers) {
                multiAnswers = new Answers();
                this.answers.add(answerKey, multiAnswers);
            }
            var userId = ChatTools.getUserId(response.message.user);
            multiAnswers.add(userId, answerValue);
            Logger.debug("Flow::onAnswer() Added multi-user answer: key: \"" + answerKey + "\" value: \"" + answerValue + "\"");

            if(choiceLabel && choiceLabel.length > 0) {
                var labelKey = userId + "_label";
                multiAnswers.add(labelKey, choiceLabel);
                Logger.debug("Flow::onAnswer() Added multi-user label answer: key: \"" + labelKey + "\" value: \"" + choiceLabel + "\"");
            }

            if(choiceValue != null) {
                var valueKey = userId + "_value";
                multiAnswers.add(valueKey, choiceValue);
                Logger.debug("Flow::onAnswer() Added multi-user value answer: key: \"" + valueKey + "\" value: \"" + choiceValue + "\"");
            }

            var answerCount = 0;
            for(let index in question.userIds) {
                if(multiAnswers.get(question.userIds[index])) {
                    answerCount++;
                }
            }

            let parsedUserIds = this.parsedMultiUserAnswers[answerKey];
            if(!parsedUserIds) {
                parsedUserIds = {};
                this.parsedMultiUserAnswers[answerKey] = parsedUserIds;
            }
            parsedUserIds[userId] = true;

            // Call question answered callback if set
            if(this.control.questionAnsweredCallback) {
                this.control.questionAnsweredCallback(userId, answerKey, answerValue, this.answers, question);
            }

            // Check if a value was set to break multi user question on and use it
            var breaking = false;
            var stopping = false;
            if(question.breakOnValue != null && question.breakOnValue === answerValue) {
                breaking = true;
                stopping = question.stopOnBreak;
            } else if(question.breakOnRegex != null && answerValue.match(question.breakOnRegex) != null) {
                breaking = true;
                stopping = question.stopOnBreak;
            } else if(question.breakOnCount != null && answerCount != question.userIds.length && answerCount >= question.breakOnCount) {
                breaking = true;
            }

            // Call multi user answers summary function if set
            if(question.multiUserSummaryFunction != null) {
                var summary = question.multiUserSummaryFunction(this.answers, userId, breaking);
                if(summary && summary !== "") {
                    response.send(summary);
                }
            }

            // Cleanup on breaking and stop if configured
            if(breaking) {
                question.cleanup(response.message);
                if(stopping) {
                    this.questionStop(question);
                    return true;
                }
            }

            // Check if still waiting for more answers
            if(!breaking && question.userIds.length > answerCount) {
                return false;
            }
        } else {
            // Valid answer, store in the answers object
            this.answers.add(answerKey, answerValue);
            Logger.debug("Flow::onAnswer() Added answer: key: \"" + answerKey + "\" value: \"" + answerValue + "\"");

            if(choiceLabel && choiceLabel !== "") {
                var labelKey = question.getLabelAnswerKey();
                this.answers.add(labelKey, choiceLabel);
                Logger.debug("Flow::onAnswer() Added label answer: key: \"" + labelKey + "\" value: \"" + choiceLabel + "\"");
            }

            if(choiceValue != null) {
                var valueKey = question.getValueAnswerKey();
                this.answers.add(valueKey, choiceValue);
                Logger.debug("Flow::onAnswer() Added value answer: key: \"" + valueKey + "\" value: \"" + choiceValue + "\"");
            }

            // Call question answered callback if set
            if(this.control.questionAnsweredCallback) {
                var userId = ChatTools.getUserId(this.msg.message.user);
                var answerKey = question.getAnswerKey();
                this.control.questionAnsweredCallback(userId, answerKey, answerValue, this.answers, question);
                if(choiceLabel != null) {
                    var labelKey = question.getLabelAnswerKey();
                    this.control.questionAnsweredCallback(userId, labelKey, choiceLabel, this.answers, question);
                }
                if(choiceValue != null) {
                    var valueKey = question.getValueAnswerKey();
                    this.control.questionAnsweredCallback(userId, valueKey, choiceValue, this.answers, question);
                }
            }
        }

        this.parsedAnswerKeys[answerKey] = true;

        if(question.stopOnValue && question.stopOnValue === answerValue) {
            this.questionStop(question);
            return true;
        }
        if(question.stopOnRegex && answerValue.match && answerValue.match(question.stopOnRegex) != null) {
            this.questionStop(question);
            return true;
        }

        this.questionAnswered(question);
        return true;
    }

    questionExecute(question) {
        if(!this.isRunning) {
            Logger.debug("Flow::questionExecute() Flow not running", this.name);
            return;
        }
        Logger.info("Flow::questionExecute() answerKey: \"" + question.getAnswerKey() + "\"");
        question.execute(this.control, this.msg, this.callback, this.answers);
    }

    questionStop(question) {
        if(!this.isRunning) {
            Logger.debug("Flow::questionStop() Flow not running", this.name);
            return;
        }
        Logger.info("Flow::questionStop()");
        if(question.onStopAnswerKey && question.onStopAnswerValue != null) {
            this.answers.add(question.onStopAnswerKey, question.onStopAnswerValue);
        }
        this.stop(question.sendMessageOnStop);
    }

    questionAnswered(question) {
        if(!this.isRunning) {
            Logger.debug("Flow::questionAnswered() Flow not running", this.name);
            return;
        }
        Logger.info("Flow::questionAnswered() answerKey: \"" + question.getAnswerKey() + "\" useFinalize: " + question.useFinalize);
        if(question.useFinalize) {
            question.finalize(this.answers, () => {
                this.questionDone(question);
            });
        } else {
            this.questionDone(question);
        }
    }

    questionDone(question) {
        Logger.info("Flow::questionDone() answerKey: \"" + question.getAnswerKey() + "\"");
        // Trigger sub flow if set in question, otherwise continue
        if(question.subFlow instanceof Flow) {
            Logger.debug("Flow::questionDone() Calling startSubFlow()", question.subFlow.name);
            this.startSubFlow(question.subFlow, true);
        } else {
            this.next();
        }
    }

    actionDone(action) {
        if(!this.isRunning) {
            Logger.debug("Flow::actionDone() Flow not running", this.name);
            return;
        }
        if(this.control.actionDoneCallback) {
            var userId = ChatTools.getUserId(this.msg.message.user);
            this.control.actionDoneCallback(userId, action, this.answers);
        }
        var className = "";
        if(action && action.constructor) {
            className = action.constructor.name;
        }
        Logger.info("Flow::actionDone() \"" + className + "\"");
        if(action.controlsFlow) {
            return;
        }
        // Trigger sub flow if set in question, otherwise continue
        if(action.subFlow instanceof Flow) {
            Logger.debug("Flow::actionDone() Calling startSubFlow()", action.subFlow.name);
            this.startSubFlow(action.subFlow, true);
        } else {
            Logger.debug("Flow::actionDone() Calling next()");
            this.next();
        }
    }

    startSubFlow(subFlow, overrideFinished) {
        Logger.info("Flow::startSubFlow()", subFlow.name);
        // Set this instance as the super flow
        subFlow.superFlow = this;

        // Set control when null
        if(subFlow.control == null) {
            subFlow.control = this.control;
        }
        // Set stop text when null
        if(subFlow.stopText == null) {
            subFlow.stopText = this.stopText;
        }
        // Set error text when null
        if(subFlow.errorText == null) {
            subFlow.errorText = this.errorText;
        }
        // Set back text when null
        if(subFlow.backText == null) {
            subFlow.backText = this.backText;
        }
        // Set checkpoint text when null
        if(subFlow.checkpointText == null) {
            subFlow.checkpointText = this.checkpointText;
        }
        // Set restart button when null
        if(subFlow.restartButtonName == null){
            subFlow.restartButtonName = this.restartButtonName;
        }
        if(subFlow.restartButtonLabel == null) {
            subFlow.restartButtonLabel = this.restartButtonLabel;
        }
        if(subFlow.restartButtonStyle == null) {
            subFlow.restartButtonStyle = this.restartButtonStyle;
        }
        // Set stopped callback when null
        if(subFlow.stoppedCallback == null) {
            subFlow.stoppedCallback = this.stoppedCallback;
        }
        // Set the repeat iteration value if this was set
        if(this.repeatIteration > -1) {
            subFlow.setRepeatIteration(this.repeatIteration);
        }

        if(overrideFinished) {
            // Copy sub flow finished callback
            var subFlowFinish = subFlow.finishedCallback;

            // Continue current flow when sub flow finishes
            subFlow.finish((response, answers) => {
                Logger.debug("Flow::startSubFlow() Sub flow finished()", subFlow.name);
                var superFlow = subFlow.superFlow;
                // Call sub flow finished callback if was set
                if(subFlowFinish) {
                    Logger.debug("Flow::startSubFlow() Calling finish callback of sub flow", subFlow.name);
                    subFlowFinish(superFlow.msg, superFlow.answers);
                    return;
                }
                superFlow.next();
            });
        }

        // Start the sub flow
        subFlow.start(this.msg, this.answers);
    }

    // Stop the flow
    stop(sendMessage, error) {
        if(!this.isRunning) {
            Logger.debug("Flow::stop() Flow not running", this.name);
            // Already stopped
            return;
        }
        Logger.info("Flow::stop()", this.name);
        this.isRunning = false;
        for(let index in this.steps) {
            var step = this.steps[index];
            if(step instanceof Question) {
                var question = step;
                question.cleanup(this.msg.message);
            }
        }
        if(sendMessage) {
            if(error) {
                this.sendRestartMessage(this.errorText);
            } else {
                this.sendRestartMessage(this.stopText);
            }
        }
        if(this.superFlow) {
            this.superFlow.stop(false, error);
        } else {
            this.control.removeActiveQuestionnaire(this.msg.message);
            if(this.stoppedCallback) {
                this.stoppedCallback(this.msg, error, this.answers);
            }
            if(this.control.questionnaireStoppedCallback) {
                var userId = ChatTools.getUserId(this.msg.message.user);
                this.control.questionnaireStoppedCallback(userId, error, this.answers);
            }
        }
    }

    // Execute next question
    next() {
        if(!this.isRunning) {
            Logger.debug("Flow::next() Flow not running", this.name);
            return;
        }
        Logger.debug("Flow::next()", this.name);
        // Check if has more steps or flow is finished
        if(this.currentStep == this.steps.length) {
            Logger.info("Flow::next() Flow finished", this.name);
            if(!this.superFlow) {
                this.control.removeActiveQuestionnaire(this.msg.message);
            }
            if(this.finishedCallback != null) {
                this.finishedCallback(this.msg, this.answers);
            }
            return;
        }
        let stepIndex = this.currentStep;
        this.currentStep++;
        var step = this.steps[stepIndex];
        var className = "";
        if(step && step.constructor) {
            className = step.constructor.name;
        }
        Logger.info("Flow::next() Step " + stepIndex + " \"" + className + "\"");
        if(step instanceof Question) {
            var question = step;
            var answerKey = question.getAnswerKey();
            var answerValue = this.answers.get(answerKey);
            if(answerValue != null) {
                // If question is already checked and parsed and was asked to a single user
                if(this.parsedAnswerKeys[answerKey] && !question.isMultiUser) {
                    Logger.debug("Flow::next() Already have parsed answer \"" + answerValue + "\" for \"" + answerKey + "\", skipping question");
                    this.questionAnswered(question);
                    return;
                }

                var chatId = this.msg.message.room;
                var isGroup = ChatTools.isUserInGroup(this.msg.message.user);

                if(answerValue instanceof Answers) {
                    var multiAnswers = answerValue;
                    var checkUserIds = [];
                    if(question.userIds != null) {
                        for(let index in question.userIds) {
                            var userId = question.userIds[index];
                            if(!checkUserIds.includes(userId)) {
                                checkUserIds.push(userId);
                            }
                        }
                    }
                    var multiUserIds = multiAnswers.keys();
                    for(let index in multiUserIds) {
                        var userId = multiUserIds[index];
                        if(!checkUserIds.includes(userId)) {
                            checkUserIds.push(userId);
                        }
                    }
                    if(checkUserIds.length > 0 && !question.isMultiUser) {
                        Control.warning("Flow::next() Got pre-filled multi-user answers for single user question \"" + answerKey + "\", forcing question to be multi-user");
                        question.isMultiUser = true;
                    }
                    let parsedUserIds = this.parsedMultiUserAnswers[answerKey];
                    let parsedAnswers = 0;
                    for(let index in checkUserIds) {
                        var userId = checkUserIds[index];
                        var userAnswer = multiAnswers.get(userId);
                        if(userAnswer == null) {
                            continue;
                        }
                        if(parsedUserIds && parsedUserIds[userId]) {
                            Logger.debug("Flow::next() Already parsed multi-user answer from \"" + userId + "\" for \"" + answerKey + "\"");
                            parsedAnswers++
                            continue;
                        }
                        var matches;
                        if(userAnswer && userAnswer.match) {
                            matches = userAnswer.match(question.regex);
                        }
                        var message = ChatTools.createHubotResponse(this.control.robot, userId, chatId, isGroup);
                        message.text = userAnswer;
                        var parsedValue = question.checkAndParseAnswer(matches, message);
                        if(parsedValue != null) {
                            Logger.debug("Flow::next() Got pre-filled multi-user answer \"" + parsedValue + "\" for \"" + answerKey + "\"");
                            if(this.onAnswer(message, question, parsedValue)) {
                                Logger.debug("Flow::next() Got all pre-filled user answers for multi-user question \"" + answerKey + "\", skipping question");
                                return;
                            }
                        } else {
                            Logger.error("Flow::next() Rejected pre-filled multi-user answer \"" + userAnswer + "\" for \"" + answerKey + "\" matches: ", matches);
                        }
                    }
                    if(parsedAnswers > 0 && parsedAnswers == checkUserIds.length) {
                        Logger.debug("Flow::next() Parsed all pre-filled user answers for multi-user question \"" + answerKey + "\", skipping question");
                        this.questionAnswered(question);
                        return;
                    }
                } else {
                    // Check and parse pre-filled answer
                    var userId = ChatTools.getUserId(this.msg.message.user);
                    var matches;
                    if(answerValue && answerValue.match) {
                        matches = answerValue.match(question.regex);
                    }
                    var message = ChatTools.createHubotResponse(this.control.robot, userId, chatId, isGroup);
                    message.text = answerValue;
                    var parsedValue = question.checkAndParseAnswer(matches, message);
                    if(parsedValue != null) {
                        Logger.debug("Flow::next() Got pre-filled answer \"" + parsedValue + "\" for \"" + answerKey + "\", skipping question");
                        this.onAnswer(this.msg, question, parsedValue);
                        return;
                    } else {
                        Logger.error("Flow::next() Rejected pre-filled answer \"" + answerValue + "\" for \"" + answerKey + "\" matches: ", matches);
                    }
                }
            }
            Logger.info("Flow::next() Question: \"" + answerKey + "\": \"" + question.getQuestionText() + "\"");

            // Delay executing this message if a delay was set
            if(question.delayMs && question.delayMs > 0) {
                Logger.debug("Flow::next() Executing question delayed by " + question.delayMs + " milliseconds");
                setTimeout(() => {
                    this.questionExecute(question);
                }, question.delayMs);
            } else {
                this.questionExecute(question);
            }
        } else if(step instanceof Information) {
            var information = step;
            information.execute();
        } else if(step instanceof Action) {
            var action = step;
            action.execute();
            if(action.controlsFlow) {
                return;
            }
        } else {
            Logger.error("Flow::next() Invalid step: ", stepIndex, step, this.steps);
            this.next();
        }
    }

    // Find and remove last given answer and ask question again
    previous(checkpoint, ignoreSuperFlow) {
        if(!this.isRunning) {
            Logger.debug("Flow::previous() Flow not running", this.name);
            return false;
        }
        Logger.debug("Flow::previous()", this.name);
        while(this.currentStep > 0) {
            this.currentStep--;
            let stepIndex = this.currentStep;
            var step = this.steps[stepIndex];
            if(!step) {
                Logger.error("Flow::previous() Invalid step: ", stepIndex, step, this.steps);
                continue;
            }
            var className = "";
            if(step && step.constructor) {
                className = step.constructor.name;
            }
            Logger.info("Flow::previous() Step " + stepIndex + " \"" + className + "\"");
            if(step instanceof Question) {
                let question = step;
                let answerKey = question.getAnswerKey();
                if(question.subFlow) {
                    Logger.info("Flow::previous() Question: \"" + answerKey + "\" has sub flow");
                    if(question.subFlow.previous(checkpoint, true)) {
                        Logger.info("Flow::previous() Handled in sub flow of Question: \"" + answerKey + "\"");
                        return true;
                    }
                    Logger.info("Flow::previous() Not handled in sub flow of Question: \"" + answerKey + "\"");
                }
                Logger.info("Flow::previous() Question: \"" + answerKey + "\": " + question.getQuestionText(this.answers));

                let removedAnswer = this.answers.remove(answerKey);

                if(removedAnswer != null) {
                    Logger.info("Flow::previous() Removed answer: key: \"" + answerKey + "\" value: \"" + removedAnswer + "\"");
                    if(question.isMultiUser && this.parsedMultiUserAnswers[answerKey]) {
                        delete this.parsedMultiUserAnswers[answerKey];
                    }
                    this.parsedAnswerKeys[answerKey] = false;
                    question.reset(this.answers);
                    if(checkpoint && !question.isCheckpoint) {
                        Logger.info("Flow::previous() Question is not a checkpoint, continuing");
                        continue;
                    }
                    Logger.debug("Flow::previous() Calling next()");
                    this.next();
                    return true;
                }
            } else if(step instanceof Action) {
                let action = step;
                if(action.subFlow) {
                    Logger.info("Flow::previous() Action: has sub flow");
                    if(action.subFlow.previous(checkpoint, true)) {
                        Logger.info("Flow::previous() Handled in sub flow of Action: \"" + className + "\"");
                        return true;
                    }
                    Logger.info("Flow::previous() Not handled in sub flow of Action: \"" + className + "\"");
                }
                action.reset(this.answers);
                if(!checkpoint && action.askedQuestions) {
                    Logger.info("Flow::previous() Action \"" + className + "\" has asked questions, calling next()");
                    action.resetAskedQuestions();
                    this.next();
                    return true;
                }
            }
            if(step && step.addedAfterStart) {
                Logger.info("Flow::previous() Step added after start, removing \"" + className + "\" from flow");
                this.steps.pop();
            }
        }
        Logger.info("Flow::previous() Beginning of flow reached");

        if(this.superFlow && !ignoreSuperFlow) {
            Logger.info("Flow::previous() Checking super flow");
            return this.superFlow.previous(checkpoint);
        }

        return false;
    }

    getQuestion(answerKey, checkSuperFlow) {
        Logger.info("Flow::getQuestion()", answerKey, this.name);
        for(let index in this.steps) {
            var step = this.steps[index];
            if(step instanceof Question) {
                if(step.getAnswerKey() === answerKey) {
                    Logger.info("Flow::getQuestion() Found question:", answerKey, step);
                    return step;
                }
            }
            if(step.subFlow) {
                Logger.info("Flow::getQuestion() Checking sub flow:", step.subFlow.name);
                var question = step.subFlow.getQuestion(answerKey, false);
                if(question) {
                    return question;
                }
            }
        }
        if(this.superFlow && checkSuperFlow) {
            Logger.info("Flow::getQuestion() Checking super flow:", this.superFlow.name);
            var question = this.superFlow.getQuestion(answerKey);
            if(question) {
                return question;
            }
        }
        Logger.info("Flow::getQuestion() Unable to find question:", answerKey);
        return null;
    }

    getQuestions(answerKeys, checkSuperFlow) {
        Logger.info("Flow::getQuestions()", answerKeys, this.name);
        var questions = [];
        for(let index in this.steps) {
            var step = this.steps[index];
            if(step instanceof Question) {
                var answerKey = question.getAnswerKey();
                if(answerKeys.indexOf(answerKey) !== -1) {
                    Logger.info("Flow::getQuestion() Found question:", answerKey);
                    questions.push(step);
                }
            }
            if(step.subFlow) {
                Logger.info("Flow::getQuestion() Checking sub flow:", step.subFlow.name);
                var subQuestions = step.subFlow.getQuestions(answerKeys, false);
                if(subQuestions && subQuestions.length > 0) {
                    questions = questions.concat(subQuestions);
                }
            }
        }
        if(this.superFlow && checkSuperFlow) {
            Logger.info("Flow::getQuestion() Checking super flow:", this.superFlow.name);
            var superQuestions = this.superFlow.getQuestions(answerKeys);
            if(superQuestions && superQuestions.length > 0) {
                questions = questions.concat(superQuestions);
            }
        }
        return questions;
    }

    getSummaryQuestions(limitToTitles, excludeTitles, checkSuperFlow) {
        Logger.info("Flow::getSummaryQuestions()", this.name);
        var questions = [];
        for(let index in this.steps) {
            var step = this.steps[index];
            Logger.info("Flow::getSummaryQuestions() Checking:", step);
            if(step instanceof Question) {
                var question = step;
                var answerKey = question.getAnswerKey();
                if(question.inSummary) {
                    var title = question.summaryTitle;
                    if((!excludeTitles || excludeTitles.length === 0 || !title || excludeTitles.indexOf(title) === -1)
                       && ((!limitToTitles || limitToTitles.length === 0) || (title && limitToTitles.indexOf(title) !== -1))) {
                        Logger.info("Flow::getSummaryQuestions() Found summary question:", answerKey);
                        questions.push(question);
                    } else {
                        Logger.info("Flow::getSummaryQuestions() Not including question:", answerKey);
                    }
                } else {
                    Logger.debug("Flow::getSummaryQuestions() No summary options for question:", answerKey);
                }
            }
            if(step.subFlow) {
                Logger.info("Flow::getSummaryQuestions() Checking sub flow:", step.subFlow.name);
                var subQuestions = step.subFlow.getSummaryQuestions(limitToTitles, excludeTitles, false);
                if(subQuestions && subQuestions.length > 0) {
                    questions = questions.concat(subQuestions);
                }
            }
        }
        if(this.superFlow && checkSuperFlow) {
            Logger.info("Flow::getSummaryQuestions() Checking super flow:", this.superFlow.name);
            var superQuestions = this.superFlow.getSummaryQuestions(limitToTitles, excludeTitles);
            if(superQuestions && superQuestions.length > 0) {
                questions = questions.concat(superQuestions);
            }
        }
        return questions;
    }

    getRootFlow() {
        if(this.superFlow) {
            return this.superFlow.getRootFlow();
        }
        return this;
    }

    createInstance() {
        return new Flow();
    }
}

module.exports = Flow;