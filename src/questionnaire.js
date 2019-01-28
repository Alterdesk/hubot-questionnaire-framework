// Description:
//   Hubot Questionnaire Framework
//
// Dependencies:
//   hubot
//   node-messenger-Logger.debug
//
// Author:
//   Alterdesk

// Export the classes
module.exports = {

    Action : require('./actions/action.js'),
    AlternateTextFormatter : require('./formatters/alternate-text-formatter.js'),
    AnswerCondition : require('./conditions/answer-condition.js'),
    Answers : require('./answers.js'),
    AttachmentQuestion : require('./questions/attachment-question.js'),
    BackAction : require('./actions/back-action.js'),
    CaseFormatter : require('./formatters/case-formatter.js'),
    CheckUserAction : require('./actions/check-user-action.js'),
    CloseGroupAction : require('./actions/close-group-action.js'),
    CompleteMentionsAction : require('./actions/complete-mentions-action.js'),
    Control : require('./control.js'),
    EmailQuestion : require('./questions/email-question.js'),
    Flow : require('./flow.js'),
    FlowAction : require('./actions/flow-action.js'),
    FuzzyAction : require('./actions/fuzzy-action.js'),
    Information : require('./information.js'),
    InviteAction : require('./actions/invite-action.js'),
    MentionQuestion : require('./questions/mention-question.js'),
    MultiFormatter : require('./formatters/multi-formatter.js'),
    MultipleChoiceQuestion : require('./questions/multiple-choice-question.js'),
    NumberQuestion : require('./questions/number-question.js'),
    LeaveGroupAction : require('./actions/leave-group-action.js'),
    Listener : require('./listener.js'),
    Logger : require('./logger.js'),
    PendingRequest : require('./pending-request.js'),
    PhoneNumberQuestion : require('./questions/phone-number-question.js'),
    PolarQuestion : require('./questions/polar-question.js'),
    Question : require('./questions/question.js'),
    ReplaceAnswerFormatter : require('./formatters/replace-answer-formatter.js'),
    ReplaceDateFormatter : require('./formatters/replace-date-formatter.js'),
    ReplaceTextFormatter : require('./formatters/replace-text-formatter.js'),
    RetrieveAction : require('./actions/retrieve-action.js'),
    SetAnswerAction : require('./actions/set-answer-action.js'),
    StopConditionAction : require('./actions/stop-condition-action.js'),
    SummaryAction : require('./actions/summary-action.js'),
    TextQuestion : require('./questions/text-question.js'),
    VerificationQuestion : require('./questions/verification-question.js')

};