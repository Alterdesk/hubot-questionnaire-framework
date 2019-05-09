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
    AndCondition : require('./conditions/and-condition.js'),
    AnswerCondition : require('./conditions/answer-condition.js'),
    AnswerOrFixed : require('./utils/answer-or-fixed.js'),
    Answers : require('./answers.js'),
    AppendAnswerAction : require('./actions/append-answer-action.js'),
    AppendTextFormatter : require('./formatters/append-text-formatter.js'),
    AttachmentQuestion : require('./questions/attachment-question.js'),
    BackAction : require('./actions/back-action.js'),
    CaseFormatter : require('./formatters/case-formatter.js'),
    ChatPdfAction : require('./actions/chat-pdf-action.js'),
    ChangeGroupAvatarAction : require('./actions/change-group-avatar-action.js'),
    ChangeGroupSettingsAction : require('./actions/change-group-settings-action.js'),
    ChangeMembersAction : require('./actions/change-members-action.js'),
    ChangeSubjectAction : require('./actions/change-subject-action.js'),
    CheckUserAction : require('./actions/check-user-action.js'),
    CloseGroupAction : require('./actions/close-group-action.js'),
    CompleteMentionsAction : require('./actions/complete-mentions-action.js'),
    Condition : require('./conditions/condition.js'),
    CreateGroupAction : require('./actions/create-group-action.js'),
    Control : require('./control.js'),
    DateCondition : require('./conditions/date-condition.js'),
    DateQuestion : require('./questions/date-question.js'),
    DateTools : require('./utils/date-tools.js'),
    EmailQuestion : require('./questions/email-question.js'),
    EnvironmentCondition : require('./conditions/environment-condition.js'),
    Flow : require('./flow.js'),
    FlowAction : require('./actions/flow-action.js'),
    Formatter : require('./formatters/formatter.js'),
    FuzzyAction : require('./actions/fuzzy-action.js'),
    GenerateNumberAction : require('./actions/generate-number-action.js'),
    Information : require('./information.js'),
    InviteAction : require('./actions/invite-action.js'),
    MentionQuestion : require('./questions/mention-question.js'),
    ModifyDateAction : require('./actions/modify-date-action.js'),
    MultiFormatter : require('./formatters/multi-formatter.js'),
    MultipleChoiceQuestion : require('./questions/multiple-choice-question.js'),
    NumberQuestion : require('./questions/number-question.js'),
    OrCondition : require('./conditions/or-condition.js'),
    LeaveGroupAction : require('./actions/leave-group-action.js'),
    Listener : require('./listener.js'),
    Logger : require('./logger.js'),
    PendingRequest : require('./pending-request.js'),
    PhoneNumberQuestion : require('./questions/phone-number-question.js'),
    PolarQuestion : require('./questions/polar-question.js'),
    Question : require('./questions/question.js'),
    RemoveAnswerAction : require('./actions/remove-answer-action.js'),
    RepeatFlowAction : require('./actions/repeat-flow-action.js'),
    RepeatFormatter : require('./formatters/repeat-formatter.js'),
    ReplaceAnswerFormatter : require('./formatters/replace-answer-formatter.js'),
    ReplaceDateFormatter : require('./formatters/replace-date-formatter.js'),
    ReplaceTextFormatter : require('./formatters/replace-text-formatter.js'),
    RetrieveAction : require('./actions/retrieve-action.js'),
    RetrieveMembersAction : require('./actions/retrieve-members-action.js'),
    SendMessageAction : require('./actions/send-message-action.js'),
    SetAnswerAction : require('./actions/set-answer-action.js'),
    StopConditionAction : require('./actions/stop-condition-action.js'),
    SummaryAction : require('./actions/summary-action.js'),
    TextQuestion : require('./questions/text-question.js'),
    VerificationQuestion : require('./questions/verification-question.js')

};