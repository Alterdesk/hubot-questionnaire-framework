# Hubot Questionnaire Framework

Framework for creating a questionnaire(follow up questions) isolated per user and per room for 
[Hubot](https://hubot.github.com/) scripts. It also enables listening to Alterdesk messenger events.

## Example script
The [Alterdesk Hubot Example](https://github.com/Alterdesk/hubot-example) uses the questionnaire framework in 
[example.js](https://github.com/Alterdesk/hubot-example/blob/master/alterdesk-example-script/example.js)

## Dependencies

Required
* [Hubot](https://hubot.github.com/)
* [node-messenger-extra](https://github.com/Alterdesk/node-messenger-extra)

Optional for request messages
* [node-messenger-sdk](https://github.com/Alterdesk/node-messenger-sdk)

## Classes
### Control
The control class can override the default Hubot message receiver to:
* Manage accepted commands
* Override the default Hubot help command
* Adding/Removing message listeners per user per room
* Listen for [Alterdesk messenger events](https://api.alterdesk.com/documentation/gateway) when using the 
[Hubot Alterdesk Adapter](https://github.com/Alterdesk/hubot-alterdesk-adapter)

#### Minimal setup for Control
To intercept messages with the control instance the following code is needed
```javascript
const {Control} = require('hubot-questionnaire-framework');

var control;

module.exports = function(robot) {
    control = new Control();
    control.overrideReceiver(robot);
};
```

#### Authentication events
Authentication events are received when the Hubot instance is authenticated on the Messenger.
```javascript
control.setAuthenticatedCallback(function(user) {
    console.log("Authenticated: " + user.id);
});
```

#### Typing events
Detect when a user starts or stops typing in a chat.
```javascript
control.setTypingCallback(function(userId, typing, chatId, isGroup) {
    console.log("Typing: " + typing + " user: " + userId + " chat: " + chatId + " isGroup: " + isGroup);
});
```

#### Presence events
Detect when a user changes its presence.
```javascript
control.setPresenceCallback(function(userId, status) {
    console.log("Presence: user: " + userId + " status: " + status);
});
```

#### New chat events
Detect when Hubot is added to a new chat.
```javascript
control.setNewChatCallback(function(chatId, isGroup) {
    console.log("New chat: " + chatId + " isGroup: " + isGroup);
});
```

#### Removed from chat events
Detect when Hubot is removed from a chat.
```javascript
control.setRemovedFromChatCallback(function(groupId) {
    console.log("Removed from groupchat: " + groupId);
});
```

#### Chat closed events
Detect when a chat is closed.
```javascript
control.setClosedChatCallback(function(groupId) {
    console.log("Chat closed: " + groupId);
});
```

#### Message liked events
Detect when a message is liked.
```javascript
control.setMessageLikedCallback(function(userId, messageId, chatId, isGroup) {
    console.log("Message liked: id: " + messageId + " user: " + userId + " chat: " + chatId + " isGroup: " + isGroup);
});
```

#### Message deleted events
Detect when a message is deleted.
```javascript
control.setMessageDeletedCallback(function(userId, messageId, chatId, isGroup) {
    console.log("Message deleted: id: " + messageId + " user: " + userId + " chat: " + chatId + " isGroup: " + isGroup);
});
```

#### User verified event
Detect when a user accepts or rejects a verification request(user is verified when accepted is received)
```javascript
control.setVerificationCallback(function(userId, messageId, chatId, isGroup, accepted) {
        console.log("Verification: id: " + messageId + " user: " + userId + " chat: " + chatId + " isGroup: " + isGroup + " accepted: " + accepted);
    });
```

#### User answers request question
Detect when user answers a question request message
```javascript
control.setQuestionCallback(function(userId, messageId, chatId, isGroup, options) {
        console.log("Question: id: " + messageId + " user: " + userId + " chat: " + chatId + " isGroup: " + isGroup + " options: " + options);
    });
```

#### Group member events
Detect when users are added in or removed from a groupchat.
```javascript
control.setGroupMemberCallback(function(groupId, added, userId, users) {
    for(var index in users) {
        var user = users[index];
        if(added) {
            console.log("Added in group: " + groupId + " userId: " + userId + " member: " + user.id);
        } else {
            console.log("Removed from group: " + groupId + " userId: " + userId + " member: " + user.id);
        }
    }
});
```

#### Group subscription events
Detect when Hubot is subscribed or unsubscribed from a groupchat.
```javascript
control.setGroupSubscribedCallback(function(groupId, subscribed) {
    console.log("Subscribed: " + subscribed + " chat: " + groupId);
});
```

#### User answered question event
Detect that a user has answered a question during a Flow
```javascript
control.setUserAnsweredCallback(function(userId, answerKey, answerValue) {
    console.log("User answered: userId: " + userId + " key: " + answerKey + " value: " + answerValue);
});
```

### Flow
To easily create a questionnaire, the Flow class can be used to create a flow of questions.

Flow constructor parameters
* Control instance
* Text to send when the user has stopped the flow *(optional)*
* Text to send when an error occurs in the flow *(optional)*

#### Create a simple flow of questions

Example of a flow for inviting a user is given below. You can chain functions like text() to add questions to the flow. 
```javascript
robot.hear(/start/i, function(msg) {
    new Flow(control, "Stopped inviting.", "Error occured during invite")
    .text("firstName", "What is the first name?", "Invalid name.")
    .text("lastName", "What is the last name?", "Invalid name.")
    .email("email", "What is the email address", "Invalid email.")
    .summary(getSummary)
    .polar("confirmed", "Are you sure you want to send the invite?", "Invalid confirmation.")
    .positive(positiveRegex)
    .negative(negativeRegex)
    .timeout(600000)
    .finish(callbackFormFinished)
    .start(msg);
})
```

#### Summary

The summary() function allows you to send a summary of the given answers after the last added question. The summary will
be generated by the function that you passed, and then sent to the user. 

Example of a summary function
```javascript
var getSummary(answers) {
    var summary = "Is this correct?";
    summary += "\n\nFirst name:\n    " + answers.get("firstName"); 
    summary += "\n\nLast name:\n    " + answers.get("lastName"); 
    summary += "\n\nEmail address:\n    " + answers.get("email");
    return summary; 
}
```

#### Override default timeout settings

Using the function timeout(), you can override the timeout settings of the last added question

```javascript
// Override timeout time to 5 minutes to last added question
flow.timeout(300000);
// Override timeout time to 5 minutes and custom timeout text to last added question
flow.timeout(300000, "5 minutes are up, too late");
// Override timeout time to 10 minutes and use custom timeout callback
flow.timeout(600000, null, function() {
    console.log("Custom timeout callback triggered");
});
```

#### Flow finished callback
The finish() function will allow you to set a callback
that is called when the flow is finished in which you can use the given answers to preform a task.

Example of a finish callback function
```javascript
var callbackFormFinished = function(response, answers) {
    if(!answers("confirmed")) {
        response.send("Discarded invite");
        return;
    }
    response("Sending invite");
    // Execute invite code
};
```

### Question
The Question class is extended by the question classes below, the subclasses can be added to a flow instance to ask the
user a question with certain rules.

Question constructor
* Answer key to use when storing given answer in Answers object
* Question text to send to the user
* Text to send when a given answer is invalid

Each Question sub class has a convenience function in the Flow class, but you can manually add questions to a flow before 
the flow is started like this
```javascript
// Manually add a question to the flow
flow.add(new TextQuestion("myKey", "Can you send me some text?", "Invalid text."));
```

#### Format a given answer
When a user has given a valid answer, the answer may need need formatting, this can be done with a format callback.
```javascript
form.text("formatted", "", "Invalid answer.")
.formatAnswer(formatAnswerFunction);
```

Format answer text callback function example
```javascript
var formatAnswerFunction = function(value) {
    return value.toLowerCase();
};
```

#### Format a question by given answers
To format a question by using answers given earlier in the flow, a format callback can be set, if the format callback
fails, the unformatted text will be used as fallback.

Add a format callback to a question
```javascript
form.text("textAnswer", "Fallback question text?", "Invalid answer.")
.formatQuestion(formatTextQuestion);
```

Format question text callback function example
```javascript
var formatTextQuestion = function(answers) {
    var givenAnswer = answers.get("given_answer_key");
    if(givenAnswer != null) {
        // Has a value to format the question with
        return "Formatted question with " + givenAnswer + "?";
    }
    // Unable to format question, use fallback text
    return null;
};
```

#### Ask a question to multiple users
You can ask a question to multiple users in a flow, by using the results of a MentionQuestion or a given list of user 
ids. The flow continues after each user has answered the question or the break value was given.

Ask a question to mentioned users
```javascript
// Regular expressions to use to parse positive and negative answers with
var positiveRegex = new RegExp(/yes/, 'i');
var negativeRegex = new RegExp(/no/, 'i');

// Break waiting for other user answers when a user rejected the question
var breakOn = false;
// Continue the flow when rejected
var stopFlowOnBreak = false;

// Ask a MentionQuestion, store results with the key "mentioned" and use with askMentions() to 
// create a multi user question
flow.mention("mentioned", "Who should accept (Mention the users with '@')?", "Invalid mention")
.polar("accepted", "Do you all accept?", "Invalid answer")
.positive(positiveRegex)
.negative(negativeRegex)
.askMentions("mentioned")
.breakOnValue(breakOn, stopFlowOnBreak)
.multiUserSummary(acceptSummary);
```

Ask a question to a list of user ids
```javascript
// List of user ids to ask the question to
var userIds = ["<USER_ID_1>", "<USER_ID_2>", "<USER_ID_3>"];

// Ask each user to add a note, functions like breakOnValue() and multiUserSummary() can also be used here 
flow.text("note","Add a note?","Invalid note")
.askUserIds(userIds);
```

Optional multi user answer summary callback
```javascript
var acceptSummary = funtion(answers, currentUserId, breaking) {
    var summary = "";
    // Retrieve the answers object for the multi user question, the value is stored with the user id as the key
    var acceptedAnswers = answers.get("accepted");
    // Retrieve the currently given answer
    summary += "User " + currentUserId + " answered " + acceptedAnswers.get(currentUserId);
    // Check if the break value was given
    if(breaking) {
        return summary;
    }
    // Retrieve the user mentions that should answer this question
    var mentioned = answers.get("mentioned");
    for(var index in mentioned) {
        var mention = mentioned[index];
        var mentionUserId = mention["id"];
        // Check if an answer value is set for the user id
        if(acceptedAnswers.get(mentionUserId) == null) {
            summary += "User " + mentionUserId + " has not answered the question yet";
        }
    }
    return summary;
}
```

Optional break multi user question on value
```javascript
// Stop waiting on the remaining users when a user answers a polar question negatively
var breakOn = false;
var stopFlowOnBreak = false;
flow.breakOnValue(breakOn, stopFlowOnBreak);
```

Optional break multi user question on regular expression
```javascript
// Stop waiting on the remaining users when a user sends "breaktext" or "decline"
var breakRegex = new RegExp(/breaktext|decline/, 'i');
var stopFlowOnBreak = false;
flow.breakOnRegex(breakRegex, stopFlowOnBreak);
```

Optional break multi user question on answer count
```javascript
// Stop waiting on the remaining users when two answers are received
flow.breakOnCount(2);
```

### TextQuestion
To add a question that excepts non-empty text, simply call text() on a flow instance before starting the flow.
```javascript
// Ask user to send some text and store in Answers with the key "myKey"
flow.text("myKey", "Can you send me some text?", "Invalid text.");

// Ask for text with the length between 4 and 32
flow.text("limitedText", "Can you send me some text between 4 and 32 characters long?", "Invalid text or length.")
.length(4, 32);

// Ask for text that matches a specific regex
flow.text("regexText", "Can you send me apples, pineapple or banana?", "Invalid text or does not match regex.")
.regex(new RegExp(/apples|pineapple|banana/, 'i'));
```

### NumberQuestion
Adding a question that only accepts numbers, the NumberQuestion can be used. You can optionally use a range of accepted 
values. Adding a NumberQuestion can be done with the convenience function number().
```javascript
// Ask the user for a number and store with key "number"
flow.number("number", "Can you send me a number?", "Invalid number.");

// Ask a number between 2 and 5
flow.number("limitedNumber", "Can you send me a number between 2 and 5?", "Invalid number or outside range")
.range(2, 5);
```

### EmailQuestion
The EmailQuestion class is used to ask a user for an email address, you can optionally limit the accepted answers by 
domain by passing an array of accepted domains. Add an EmailQuestion by calling email() on the flow instance.
```javascript
// Ask for any email address
flow.email("email", "What is your email address?", "Invalid email")

// Only accept domains "alterdesk.com" and ".nl"
flow.email("limitedEmail", "What is your email address?", "Invalid email or domain not allowed")
.domains(["alterdesk.com", ".nl"]);
```

### PhoneNumberQuestion
Aks the user for a phone number by using the PhoneNumberQuestion, which can be configured to only accept given country 
codes by passing an array of accepted codes. Add a phone number question by using number().
```javascript
// Ask for any phone number
flow.number("phone", "What is your phone number?", "Invalid phone number");

// Only accept Dutch phone numbers
flow.number("dutch", "What is your phone number?", "Not a Dutch phone number")
.countryCodes(["+31"]);
```

### MentionQuestion
You can ask a user to tag chat members in a flow, the user can use '@' to start a mention tag in the messenger. Ask a
MentionQuestion by using mention().
```javascript
// Ask user to mention chat members
flow.mention("tagged", "Which users do you want to include? (Use '@' to mention users)", "Invalid mention.");

// Do not allow "All members" and robot mentions
flow.mention("limitedTag", "Which users do you want to include? (Use '@' to mention users)", "Invalid mention.")
.allAllowed(false)
.robotAllowed(false)
.completeMentions(false);

// Always include these mentions after user gives a valid answer
var mention = {};
mention["id"] = "<USER_UUID>";
mention["first_name"] = "First";
mention["last_name"] = "Last";
mention["company_name"] = "Company";
var mentions = [];
mentions.push(mention);
flow.mention("taggedIncluded", "Which users do you want to include? (Use '@' to mention users)", "Invalid mention.")
.includeMentions(mentions);
```

### AttachmentQuestion
When using the messenger, you can ask the user to send one or more attachments with a message.
```javascript
// Ask for an attachment
flow.attachment("attachments", "Can you send me a file to use?", "Invalid attachment");

// Ask for one to three attachments from 1KB to 1MB
flow.attachment("files", "Can you send me one to three attachments? (1KB-1MB)", "Invalid attachment or outside ranges")
.count(1, 3)
.size(1024, 1048576);
```

### PolarQuestion
To let the user make a decision by answering either positively or negatively to a question, the PolarQuestion can be 
used. This allows for "Yes/No" questions and optionally start a sub flow of questions for an answer.
To add a polar question, you can use the convenience function polar() with the following parameters
* Answer key to use when storing boolean(positive/negative) in Answers object
* Question text to ask
* Invalid answer text
* Positive answer regex
* Negative answer regex
* Sub flow to start when a positive answer was given *(optional)*
* Sub flow to start when a negative answer was given *(optional)*
* Button to trigger positive answer *(optional)*
* Button to trigger negative answer *(optional)*

```javascript
// Regular expressions to use to parse positive and negative answers with
var positiveRegex = new RegExp(/yes/, 'i');
var negativeRegex = new RegExp(/no/, 'i');

var positiveFlow = new Flow(control);
positiveFlow.email("email", "What is your email address?", "Invalid email address");

var negativeFlow = new Flow(control);
negativeFlow.text("reason", "That is to bad, can you give us a reason?", "Invalid answer");

flow.polar("startedSubFlow", "Do you want to subscribe to our newsletter? (Yes or no)", "Invalid answer.")
.positive(positiveRegex, positiveFlow)
.positiveButton("yes", "Yes", "green")
.negative(negativeRegex, negativeFlow)
.positiveButton("no", "No", "red");
```

### MultipleChoiceQuestion
To let the user make a choice of multiple options, the MultipleChoiceQuestion can be used. Each option is set with a 
corresponding regex and an optional sub flow. First call multiple() on the flow and for each option call option() after 
that. Optionally you can call button() to add a request message button to each option, depends on messenger Api instance
```javascript
// Regular expressions to use to parse options with
var emailRegex = new RegExp(/email/, 'i');
var phoneRegex = new RegExp(/phone/, 'i');
var skipRegex = new RegExp(/skip/, 'i');

flow.multiple("registerBy", "Do you want to register by email, phone number or skip this question?", "Invalid choice.")
.option(emailRegex, emailFlow)
.button("email", "E-mail", "blue")
.option(phoneRegex, phoneFlow)
.button("phone", "Phone number", "blue")
.option(skipRegex)
.button("skip", "Skip", "red");
```

### VerificationQuestion
Ask the user to verify his/her account with the given identity provider, user can accept the request and login on the 
identity provider or reject the request.
```javascript
flow.verification("userVerified", "idin")
.verified(verifiedFlow)
.unverified(verifiedFlow);
```

### Answers
Data container class can hold data that is collected in a questionnaire
An Answer instance is passed along by a Listener, 
so each Listener callback can use or modify the data for the questionnaire.

For example
* Answers given by the user
* Start date of the current questionnaire
* File path
* URL
* Other data containers

#### Add an answer
You can add an answer value by key
```javascript
var answers = new Answers();
answers.add("myKey", myValue);
```

#### Get an answer
To get an answer, you can retrieve the answer value by key
```javascript
var myValue = answers.get("myKey");
```

## Other

### Environment variables
Certain settings can also be set through environment variables if desired

#### Variables
Response timeout milliseconds
* HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT *(Integer)*

Response timeout text to send on timeout
* HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT_TEXT *(String)*

Need to mention robot in group to trigger command
* HUBOT_QUESTIONNAIRE_NEED_MENTION_IN_GROUP *(Boolean)*

Catch commands that are not present in the accepted commands list
* HUBOT_QUESTIONNAIRE_CATCH_ALL *(Boolean)*

Catch all text to send on unaccepted command
* HUBOT_QUESTIONNAIRE_CATCH_ALL_TEXT *(String)*

Catch all button name to use on unaccepted command, depends on messenger Api instance
* HUBOT_QUESTIONNAIRE_CATCH_ALL_BUTTON_NAME *(String)*

Catch all button label to use on unaccepted command, depends on messenger Api instance
* HUBOT_QUESTIONNAIRE_CATCH_ALL_BUTTON_LABEL *(String)*

Catch all button style to use on unaccepted command, depends on messenger Api instance
* HUBOT_QUESTIONNAIRE_CATCH_ALL_BUTTON_STYLE *(String)*

Override default hubot help command
* HUBOT_QUESTIONNAIRE_CATCH_HELP *(Boolean)*

Help text to send when default hubot help command is overridden
* HUBOT_QUESTIONNAIRE_CATCH_HELP_TEXT *(String)*

Remove a questionnaire listener and pending request when a user leave is detected
* HUBOT_QUESTIONNAIRE_REMOVE_ON_LEAVE *(Boolean)*

#### Set an environment variable
You can set an environment variable in your hubot startup script like this
```sh
#!/bin/sh

set -e

export HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT=60000

exec node_modules/.bin/hubot --name "hubot" "$@"
```

## Reference

### Answers
#### constructor()

Create a new Answers instance

#### add(key, value)

Add a value by key
* key *(String)* - Key to add the value with
* value *(Object)* - Value to add

#### get(key)

Get a value by key
* key *(String)* - Key that the requested value was added with

returns *(Object)* - Value corresponding to the key

#### keys()

Get the keys that are added

returns *(Array)* - Array of keys

#### size()

Count of values that are added

returns *(Integer)* - Size of added values


### Control
#### constructor()

Create a new Control instance

#### setMessengerApi(messengerApi)

Set the optional Api instance from node-messenger-sdk for support for request and verification messages
* messengerApi *(Api)* - Api instance

#### overrideReceiver(robot)

Override the default Hubot receiver with the questionnaire receiver
* robot *(Robot)* - Hubot Robot instance to override the receiver for

#### getUserId(user)

Return the user id for a user, use with Alterdesk groupchats
* user *(User)* - Hubot User to get the id for

returns *(String)* - User id

#### isUserInGroup(user)

Check if a user is talking to Hubot from a groupchat
* user *(User)* - Hubot User to check for

returns *(Boolean)* - If the user is talking from a groupchat

#### setStopRegex(regexp)

Set the regular expression to stop flows on
* regexp *(RegExp)* - Regular Expression to stop flows with

#### setHelpRegex(regexp)

Set the regular expression to trigger the help message with
* regexp *(RegExp)* - Regular Expression to trigger the help message with

#### setResponseTimeoutText(text)

Set the text to send when a user does not respond within the configured time
* text *(String)* - Text to send on response timeout

#### setResponseTimeoutMs(ms)

Set the milliseconds to wait for a user response
* ms *(Integer)* - Milliseconds to wait for response

#### setCatchAll(catch)

Set if unknown commands should be catched
* catch *(Boolean)* - If unknown commands should be catched by the overridden receiver

#### setCatchAllText(text)

Set the text to send when an unknown command is catched
* text *(String)* - Text to send when an unknown command is catched

#### setCatchAllButton(name, label, style)

Add a button to the catch all message
* name *(String)* - Name of the button, text received when button is pressed
* label *(String)* - Label on the button
* style *(String)* - Optional style of the button (defaults to 'theme')

#### setCatchHelp(catch)

Set if the default Hubot help should be overridden
* catch *(Boolean)* - If the Hubot help should be overridden

#### setCatchHelpText(text)

Set the text to send when the help command is triggered
* text *(String)* - Text to send when help command is triggered

#### setHelpQuestionStyle(style)

Set the style of request message to use when buttons are added to the help message
* style *(String)* - Request message style

#### createHubotResponse(userId, chatId, isGroup)

Create a Hubot Response object for a given user and chat
* userId *(String)* - Alterdesk user id
* chatId *(String)* - Alterdesk chat id
* isGroup *(Boolean)* - If the chat is a groupchat or one-to-one chat

#### setAuthenticatedCallback(callback)

Set the callback to call when Hubot is authenticated on Alterdesk, callback is called with the user data
* callback *(Function(user))* - Function callback called when authenticated
  * user *(User)* - Alterdek user data

#### setTypingCallback(callback) 

Set the callback to call when a user is typing on Alterdesk, callback is called with the user id and a boolean if the user is typing
* callback *(Function(userId, typing))* - Function callback called when a user starts or stops typing
  * userId *(String)* - Alterdesk user id 
  * typing *(Boolean)* - If the user is typing

#### setPresenceCallback(callback)

Callback that is called when a user presence is detected
* callback *(Function(userId, status))* - Function callback called with Alterdesk user id and the status string

#### setNewChatCallback(callback)

Callback that is called when a new chat is detected
* callback *(Function(chatId, isGroup))* - Function callback called when a new chat is created/added
  * chatId *(String)* - Alterdesk chat id
  * isGroup *(Boolean)* - If the chat is a groupchat or one-to-one chat

#### setRemovedFromChatCallback(callback)

Callback that is called when remove from chat is detected
* callback *(Function(groupId))* - Function callback called with the Alterdesk group chat id that the Hubot is removed from

#### setClosedChatCallback(callback)

Callback that is called when a chat close is detected
* callback *(Function(groupId))* - Function callback called when a groupchat is closed
  * groupId *(String)* - Alterdesk group chat id

#### setMessageLikedCallback(callback)

Callback that is called when a message is liked
* callback *(Function(userId, messageId, chatId, isGroup))* - Function callback when a message is liked
  * userId *(String)* - Alterdesk user id
  * messageId *(String)* - Alterdesk message id
  * chatId *(String)* - Alterdesk chat id
  * isGroup *(Boolean)* - If the chat is a groupchat or one-to-one chat

#### setMessageDeletedCallback(callback)

Callback that is called when a message is deleted
* callback *(Function(userId, messageId, chatId, isGroup))* - Function callback when a message is deleted
  * userId *(String)* - Alterdesk user id
  * messageId *(String)* - Alterdesk message id
  * chatId *(String)* - Alterdesk chat id
  * isGroup *(Boolean)* - If the chat is a groupchat or one-to-one chat


#### setVerificationCallback(callback)

Detect when a user accepts or rejects a verification request(user is verified when accepted is received)
* callback *(Function(userId, messageId, chatId, isGroup, accepted))* - Function callback when a verification is answered
  * userId *(String)* - Alterdesk user id
  * messageId *(String)* - Alterdesk message id
  * chatId *(String)* - Alterdesk chat id
  * isGroup *(Boolean)* - If the chat is a groupchat or one-to-one chat
  * accepted *(Boolean)* - If the verification request was accepted or rejected

#### setQuestionCallback(callback)

Detect when user answers a question request message
* callback *(Function(userId, messageId, chatId, isGroup, options))* - Function callback when a request is answered
  * userId *(String)* - Alterdesk user id
  * messageId *(String)* - Alterdesk message id
  * chatId *(String)* - Alterdesk chat id
  * isGroup *(Boolean)* - If the chat is a groupchat or one-to-one chat
  * options *(Array)* - Array of chosen options

#### setGroupMemberCallback(callback)

Callback that is called when a group member is added or removed
* callback *(Function(groupId, added, userId, users))* - Function callback called when a groupchat member is added or removed
  * groupId *(String)* - Alterdesk group chat id
  * added *(Boolean)* - If the member is added or removed
  * userId *(String)* - Alterdesk user id that added or removed the members
  * users *(Array)* - Array of Alterdesk user data of the members

#### setGroupSubscribedCallback(callback)

Callback that is called when subscribed/unsubscribed to/from a groupchat
* callback *(Function(groupId, subscribed))* - Function callback called when Hubot is subscribed/unsubscribed to/from a groupchat 
  * groupId *(String)* - Alterdesk group chat id
  * subscribed *(Boolean)* - If hubot is subscribed or unsubscribed

#### setUserAnsweredCallback(callback)

Detect that a user has answered a question during a Flow
* callback *(Function(userId, answerKey, answerValue))* - Function callback when a user answers a question during a flow
  * userId *(String)* - Alterdesk user id
  * answerKey *(String)* - Answer key that is answered
  * answerValue *(String)* - Answer value

#### setRemoveListenerOnLeave(remove)  

Set if a Listener should be removed when a LeaveMessage for the user is received
* remove *(Boolean)* - If the Listener should be removed

#### addAcceptedCommand(command, helpText, buttonLabel, buttonStyle) 

Add an accepted command
* command *(String)* - Command text to listen for
* helpText *(String)* - Help text to show when the help command is triggered
* buttonLabel *(String)* - Optional button label for this command in help message, depends on messenger Api instance
* buttonLabel *(String)* - Optional button style for this command in help message, depends on messenger Api instance

### Flow
#### constructor(control, stopText, errorText)

Create a new Flow instance
* control *(Control)* - Control instance to use
* stopText *(String)* - Message text to send when the flow is stopped
* errorText *(String)* - Message text to send when the flow stops with an error

#### add(question)

Add Question to the Flow
* question *(Question)* - Question to add to the Flow

returns *(Flow)* - Flow instance

#### info(text, waitMs)

Add a information message to the flow
* text *(String)* - Information message text to send
* waitMs *(Integer)* - Milliseconds to wait after sending information

returns *(Flow)* - Flow instance

#### action(callback, waitMs)

Add an external asynchronous action to the flow
* callback *(Function(response, answers, flowCallback))* - Function callback called when the external action should be triggered
  * response *(Response)* - Hubot Response instance
  * answers *(Answers)* - Answers instance
  * flowCallback *(Function())* - Callback to call when the flow should continue
* waitMs *(Integer)* - Milliseconds to wait after executing action

#### text(answerKey, questionText, invalidText)

Add a TextQuestion to the Flow
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

returns *(Flow)* - Flow instance

#### regex(regex)

Override the regex used in the last added TextQuestion
* regex *(RegExp)* - Regular expression to check answer with

returns *(Flow)* - Flow instance

#### length(minLength, maxLength)

Set the minimal and/or maximum accepted length of the last added TextQuestion
* minLength *(Integer)* - Minimum accepted length
* maxLength *(Integer)* - Maximum accepted length

returns *(Flow)* - Flow instance

#### capitalize()

Capitalize the first letter of the answer of the last added TextQuestion

returns *(Flow)* - Flow instance

#### lastName()

Capitalize the answer as a last name of the last added TextQuestion

returns *(Flow)* - Flow instance

#### number(answerKey, questionText, invalidText)

Add a NumberQuestion to the Flow
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

returns *(Flow)* - Flow instance

#### range(minValue, maxValue)

Set the minimum and/or maximum value range of the last added NumberQuestion
* minValue *(Integer)* - Minimum accepted value
* maxValue *(Integer)* - Maximum accepted value

returns *(Flow)* - Flow instance

#### email(answerKey, questionText, invalidText)

Add an EmailQuestion to the Flow
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

returns *(Flow)* - Flow instance

#### domains(allowedDomains)

Set the allowed email domains of the last added EmailQuestion
* allowedDomains *(Array)* - String array of accepted domains

returns *(Flow)* - Flow instance

#### phone(answerKey, questionText, invalidText)

Add a PhoneNumberQuestion to the Flow
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

returns *(Flow)* - Flow instance

#### countryCodes(allowedCountryCodes)

Set the allowed country codes of the last added PhoneNumberQuestion
* allowedCountryCodes *(Array)* - String array of allowed country codes

returns *(Flow)* - Flow instance

#### mention(answerKey, questionText, invalidText)

Add a MentionQuestion to the Flow
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

returns *(Flow)* - Flow instance

#### includeMentions(mentions)

Add mentions to include after answer of the last added MentionQuestion
* mentions *(Array)* - Alterdesk mention user data array to add

returns *(Flow)* - Flow instance

#### allAllowed(allowed)

Change if the all mentioned tag is allowed of the last added MentionQuestion
* allowed *(Boolean)* - If the mention all tag is allowed

returns *(Flow)* - Flow instance

#### robotAllowed(allowed)

Change if the robot mentioned tag is allowed of the last added MentionQuestion
* allowed *(allowed)* - If tagging the Hubot user id is allowed

returns *(Flow)* - Flow instance

#### completeMentions(onlyCompleteAll)

Fill in all user data for the last added MentionQuestion, depends on messenger Api instance
* onlyCompleteAll *(Boolean)* - Only retrieve user data when all mention is used

#### attachment(answerKey, questionText, invalidText)

Add an AttachmentQuestion to the Flow
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

returns *(Flow)* - Flow instance

#### count(minCount, maxCount)

Set the minimum and/or maximum count of attachments of the last added AttachmentQuestion
* minCount *(Integer)* - Minimum count of attachments
* maxCount *(Integer)* - Maximum count of attachments

returns *(Flow)* - Flow instance

#### size(minSize, maxSize)

Set the minimum and/or maximum file size in bytes of attachments of the last added AttachmentQuestion
* minSize *(Integer)* - Minimum file size in bytes
* maxSize *(Integer)* - Maximum file size in bytes

returns *(Flow)* - Flow instance

#### extensions(allowedExtensions)

Set the allowed file extensions of the last added AttachmentQuestion
* allowedExtensions *(Array)* - String array of allowed extensions

returns *(Flow)* - Flow instance

#### polar(answerKey, questionText, invalidText)

Add a PolarQuestion to the Flow
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

returns *(Flow)* - Flow instance

#### positive(regex, subFlow)

Set the positive regex and optional sub flow of the last added PolarQuestion
* regex *(RegExp)* - Regular expression to trigger positive answer
* subFlow *(Flow)* - Flow to start when positive answer was given

returns *(Flow)* - Flow instance

#### positiveButton(name, label, style)

Add a button to the question message for a positive answer, depends on messenger Api instance
* name *(String)* - Name of the button, needs to trigger positive regex to function
* label *(String)* - Label on the button
* style *(String)* - Optional style of the button (defaults to 'green')

returns *(Flow)* - Flow instance

#### negative(regex, subFlow)

Set the negative regex and optional sub flow of the last added PolarQuestion
* regex *(RegExp)* - Regular expression to trigger negative answer
* subFlow *(Flow)* - Flow to start when negative answer was given

returns *(Flow)* - Flow instance

#### negativeButton(name, label, style)

Add a button to the question message for a negative answer, depends on messenger Api instance
* name *(String)* - Name of the button, needs to trigger negative regex to function
* label *(String)* - Label on the button
* style *(String)* - Optional style of the button (defaults to 'green')

returns *(Flow)* - Flow instance

#### multiple(answerKey, questionText, invalidText)

Add a MultipleChoiceQuestion to the Flow
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

returns *(Flow)* - Flow instance

#### option(regex, subFlow, value)

Add an option regex, optional sub flow and optional value of the last added MultipleChoiceQuestion
* regex *(RegExp)* - Regular expression to trigger option answer
* subFlow *(Flow)* - Flow to start when option answer was given
* value *(Object)* - Value to set as answer when option answer was given

returns *(Flow)* - Flow instance

#### button(name, label, style)

Add a button to the question message for the last added option, depends on messenger Api instance
* name *(String)* - Name of the button, needs to trigger option regex to function
* label *(String)* - Label on the button
* style *(String)* - Optional style of the button (defaults to 'theme')

returns *(Flow)* - Flow instance

#### multiAnswer()

Set the last added MultipleChoiceQuestion to allow answering with multiple options, depends on messenger Api instance

returns *(Flow)* - Flow instance

#### questionStyle(style)

Set the question payload style for the last added MultipleChoiceQuestion, depends on messenger Api instance
* style *(String)* - Request message question style

returns *(Flow)* - Flow instance

#### verification(answerKey, provider)

Add a VerificationQuestion to the Flow, depends on messenger Api instance
* answerKey *(String)* - Key to store answer in Answers instance with
* provider *(String)* - Identity provider to use for verification

returns *(Flow)* - Flow instance

#### verified(subFlow)

Set an optional sub flow if the user is verified to the last added VerificationQuestion
* subFlow *(Flow)* - Flow to start when the user is verified

returns *(Flow)* - Flow instance

#### unverified(subFlow)

Set an optional sub flow if the user declines verification to the last added VerificationQuestion
* subFlow *(Flow)* - Flow to start when the user declines verification

returns *(Flow)* - Flow instance

#### askMentions(mentionAnswerKey)

Ask the last added question to the users that were mentioned a MentionQuestion earlier
* mentionAnswerKey *(String)* - Key used to store the mentions with in Answers

returns *(Flow)* - Flow instance

#### askUserIds(userIds)

Ask the last added question to a list of user ids
* userIds *(Array)* - String array of Alterdesk user ids

returns *(Flow)* - Flow instance

#### breakOnValue(value, stop)

Break multi user question on a certain answer value, and set if the flow should continue or stop
* value *(Object)* - Value to break on
* stop *(Boolean)* - Stop flow when breaking

returns *(Flow)* - Flow instance

#### breakOnRegex(regex, stop)

Break multi user question when an answer matches the given regex, and set if the flow should continue or stop
* regex *(RegExp)* - Regular expression to break with
* stop *(Boolean)* - Stop flow when breaking

returns *(Flow)* - Flow instance

#### breakOnCount(count)

Break multi user question on a certain number of answers
* count *(Integer)* - Count of answers to break on

returns *(Flow)* - Flow instance

#### formatAnswer(callback)

Set a callback to format the question text with by the answers given earlier
* callback *(Function(answerValue))* - Callback that is called when an answer is given
  * answerValue *(Object)* - Value of the answer
  
  returns *(Object)* - Formatted answer
  
returns *(Flow)* - Flow instance

#### formatQuestion(callback)

Set a callback to format the question text with by the answers given earlier
* callback *(Function(answers))* - Callback that is called before the question is asked
  * answers *(Answers)* - Answers instance
  
  returns *(String)* - Formatted question text to send

returns *(Flow)* - Flow instance

#### multiUserSummary(callback)

Set a callback to summarize given answers after every user answer for a multi user question
* callback *(Function(answers, userId, breaking))* - Callback that is called when a user answers the question
  * answers *(Answers)* - Answers instance
  * userId *(String)* - Alterdesk user id of the user that answered
  * breaking *(Boolean)* - If breaking multi user question because of this answer

  returns *(String)* - Summary text to send

returns *(Flow)* - Flow instance

#### summary(callback)

Set a callback to summarize the given answers after last added question
* callback *(Function(answers))* - Callback called when a summary of the given answers is requested
  * answers *(Answers)* - Answers instance

  returns *(String)* - Summary text to send

returns *(Flow)* - Flow instance

#### delay(ms)

Use a delay before executing the last added question
* ms *(Integer)* - Milliseconds to delay question

returns *(Flow)* - Flow instance

#### timeout(ms, text, callback)

Use non-default timeout for last added question
* ms *(Integer)* - Milliseconds to wait for response
* text *(String)* - Optional override timeout text to send
* callback *(Function())* - Optional override timeout callback to call

returns *(Flow)* - Flow instance

#### restartButton(name, label, style)

Set a restart button for error, stop and timeout messages, depends on messenger Api instance
* name *(String)* - Name of the button, needs to trigger flow start regex to function
* label *(String)* - Label on the button
* style *(String)* - Optional style of the button (defaults to 'theme')

#### finish(callback)

Set the flow finished callback function
* callback *(Function(response, answers))* - Callback called when the flow is finished
  * response *(Response)* - Hubot Response instance
  * answers *(Answers)* - Answers instance

returns *(Flow)* - Flow instance

#### start(message, answers)

Start the flow
* message *(Message)* - Hubot Message instance
* answers *(Answers)* - Answers instance


### Information
#### constructor(text, waitMs)

Create a new Information instance
* text *(String)* - Information message text to send
* waitMs *(Integer)* - Milliseconds to wait after sending information

#### execute(flow, response)

Execute this information message
* flow *(Flow)* - Flow instance that the information is executed for
* response *(Response)* - Hubot Response instance

### Question
#### constructor(answerKey, questionText, invalidText)

Create a new Question instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### setFlow(flow)

Set the parent flow
* flow *(Flow)* - Flow instance

#### setSubFlow(subFlow)

Set the sub flow to execute after this question
* subFlow *(Flow)* - Flow instance

#### setFormatAnswerFunction(callback)

Set a format function to format given answer with
* callback *(Function(answerValue))* - Callback that is called when an answer is given
  * answerValue *(Object)* - Value of the answer
  
  returns *(Object)* - Formatted answer

#### setFormatQuestionFunction(callback)

Set a format question text callback function
* callback *(Function(answers))* - Callback that is called before the question is asked
  * answers *(Answers)* - Answers instance
  
  returns *(String)* - Formatted question text to send

#### setSummaryFunction(callback)

Set a summary callback function to trigger after answer
* callback *(Function(answers))* - Callback called when a summary of the given answers is requested
  * answers *(Answers)* - Answers instance

  returns *(String)* - Summary text to send

#### setDelay(ms)

Use a delay before executing the last added question
* ms *(Integer)* - Milliseconds to delay question

#### setTimeout(ms, text, callback)

Use non-default timeout settings for this question
* ms *(Integer)* - Milliseconds to wait for response
* text *(String)* - Optional override timeout text to send
* callback *(Function())* - Optional override timeout callback to call

#### setMentionAnswerKey(mentionAnswerKey)

Ask this question to users that were mentioned earlier
* mentionAnswerKey *(String)* - Key used to store the mentions with in Answers

#### setUserIds(userIds)

Ask this question to a list of user ids
* userIds *(Array)* - String array of Alterdesk user ids

#### setBreakOnValue(value, stop)

Break this multi user question on an answer value and optionally stop the flow
* value *(Object)* - Value to break on
* stop *(Boolean)* - Stop flow when breaking

#### setBreakOnRegex(regex, stop)

Break this multi user question when an answer matches the given regex and optionally stop the flow
* regex *(RegExp)* - Regular expression to break with
* stop *(Boolean)* - Stop flow when breaking

#### setBreakOnCount(count)

Break this multi user question when a certain number of answers is reached
* count *(Integer)* - Count of answers to break on

#### setMultiUserSummaryFunction(callback)

Set a summary callback function to trigger after every user answer
* callback *(Function(answers, userId, breaking))* - Callback that is called when a user answers the question
  * answers *(Answers)* - Answers instance
  * userId *(String)* - Alterdesk user id of the user that answered
  * breaking *(Boolean)* - If breaking multi user question because of this answer

  returns *(String)* - Summary text to send


### TextQuestion
#### constructor(answerKey, questionText, invalidText)

Create a new TextQuestion instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### setRegex(regex)

Use an alternative regular expression
* regex *(RegExp)* - Regular expression to check answer with

#### setLength(min, max)

Set the accepted length of the answer
* min *(Integer)* - Minimum accepted length
* max *(Integer)* - Maximum accepted length

#### checkAndParseAnswer(matches, message)

Check if valid text and if length is accepted
* matches *(Array)* - Array of regular expression matches
* message *(Message)* - Hubot Message instance

* returns *(String)* - Parsed value when accepted

#### acceptedLength(text)

Check if the text is within length boundaries
* text *(String)* - Text to check

returns *(Boolean)* - Accepted length
 
### NumberQuestion
#### constructor(answerKey, questionText, invalidText)

Create a new NumberQuestion instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### setRange(min, max)

Limit the valid answer to range
* min *(Integer)* - Minimum accepted value
* max *(Integer)* - Maximum accepted value

#### checkAndParseAnswer(matches, message)

Parse given number as float and only accept if in range
* matches *(Array)* - Array of regular expression matches
* message *(Message)* - Hubot Message instance

* returns *(Integer)* - Parsed value when accepted

#### inRange(value)

Check if the value is in range
* value *(Integer)* - Value to check

returns *(Boolean)* - Accepted value

### EmailQuestion
#### constructor(answerKey, questionText, invalidText)

Create a new EmailQuestion instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### checkAndParseAnswer(matches, message)

Check for valid email and if domain is allowed
* matches *(Array)* - Array of regular expression matches
* message *(Message)* - Hubot Message instance

* returns *(String)* - Parsed email address when accepted

#### addAllowedDomain(domain)

Add a domain to limit accepted answers to
* domain *(String)* - Accepted domain

#### addAllowedDomains(domains)

Add a list of accepted domains
* domains *(Array)* - String array of accepted domains
 
### PhoneNumberQuestion
#### constructor(answerKey, questionText, invalidText)

Create a new PhoneNumberQuestion instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### checkAndParseAnswer(matches, message)

Check if valid phone number and if country code is allowed
* matches *(Array)* - Array of regular expression matches
* message *(Message)* - Hubot Message instance

* returns *(String)* - Parsed phone number when accepted

#### addAllowedCountryCode(code)

Add a country code to limit accepted answers to
* code *(String)* - Accepted country code

#### addAllowedCountryCodes(codes)

Add a list of accepted country codes
* codes *(Array)* - String array of allowed country codes

### MentionQuestion
#### constructor(answerKey, questionText, invalidText)

Create a new MentionQuestion instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### setIncludeMentions(mentions)

Include these mentions after question is answered
* mentions *(Array)* - Alterdesk mention user data array to add

#### setAllAllowed(allowed)

Change if if the mentioned all tag is allowed
* allowed *(Boolean)* - If the mention all tag is allowed

#### setRobotAllowed(allowed)

Change if it is allowed to mention robot
* allowed *(allowed)* - If tagging the Hubot user id is allowed

#### checkAndParseAnswer(matches, message)

Parse mentioned users or mentioned all tags
* matches *(Array)* - Array of regular expression matches
* message *(Message)* - Hubot Message instance

* returns *(Array)* - Parsed array of mention data when accepted

### AttachmentQuestion
#### constructor(answerKey, questionText, invalidText)

Create a new AttachmentQuestion instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### checkAndParseAnswer(matches, message)

Get attachments that were sent with the message
* matches *(Array)* - Array of regular expression matches
* message *(Message)* - Hubot Message instance

* returns *(Array)* - Parsed array of attachments when accepted

#### inCountRange(value)

Check if the value is in range
* value *(Integer)* - Count value

returns *(Boolean)* - Accepted count

#### inSizeRange(value)

Check if the value is in range
* value *(Integer)* - Size value

returns *(Boolean)* - Accepted size

#### setCountRange(minCount, maxCount)

Set a minimum and/or maximum count of attachments to accept
* minCount *(Integer)* - Minimum count of attachments
* maxCount *(Integer)* - Maximum count of attachments

#### setSizeRange(minSize, maxSize)

Set a minimum and/or maximum size to accept
* minSize *(Integer)* - Minimum file size in bytes
* maxSize *(Integer)* - Maximum file size in bytes

#### addAllowedExtension(extension)

Add an extension to limit accepted answers to
* extension *(String)* - Allowed extension

#### addAllowedExtensions(extensions)

Add a list of accepted extensions
* extensions *(Array)* - String array of allowed extensions

### PolarQuestion
#### constructor(answerKey, questionText, invalidText)

Create a new PolarQuestion instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### setPositive(regex, subFlow)

Set the positive answer regex and optional sub flow to start when a positive answer was given
* regex *(RegExp)* - Regular expression to trigger positive answer
* subFlow *(Flow)* - Flow to start when positive answer was given

#### setNegative(regex, subFlow)

Set the negative answer regex and optional sub flow to start when a negative answer was given
* regex *(RegExp)* - Regular expression to trigger negative answer
* subFlow *(Flow)* - Flow to start when negative answer was given

#### setPositiveButton(name, label, style)

Set the name, label and style of the positive answer button, depends on messenger Api instance
* name *(String)* - Name of the button, needs to trigger positive regex to function
* label *(String)* - Label on the button
* style *(String)* - Optional style of the button (defaults to 'green')

#### setNegativeButton(name, label, style)

Set the name, label and style of the negative answer button, depends on messenger Api instance
* name *(String)* - Name of the button, needs to trigger negative regex to function
* label *(String)* - Label on the button
* style *(String)* - Optional style of the button (defaults to 'red')

#### checkAndParseAnswer(matches, message)

Check if the positive regex or negative regex matches, and set corresponding sub flow to execute
* matches *(Array)* - Array of regular expression matches
* message *(Message)* - Hubot Message instance

* returns *(Boolean)* - Parsed value when accepted

### MultipleChoiceQuestion
#### constructor(answerKey, questionText, invalidText)

Create a new MultipleChoiceQuestion instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### addOption(regex, subFlow, value)

Add an option answer regex, optional sub flow and optional value 
* regex *(RegExp)* - Regular expression to trigger option answer
* subFlow *(Flow)* - Flow to start when option answer was given
* value *(Object)* - Value to set as answer when option answer was given

#### addButton(name, label, style)

Add a button to the last added MultipleChoiceOption, depends on messenger Api instance
* name *(String)* - Name of the button, needs to trigger option regex to function
* label *(String)* - Label on the button
* style *(String)* - Optional style of the button (defaults to 'theme')

#### checkAndParseAnswer(matches, message)

Check the if one of the option regex matches, and set the corresponding sub flow to execute
* matches *(Array)* - Array of regular expression matches
* message *(Message)* - Hubot Message instance

* returns *(String)* - Parsed value when accepted

### MultipleChoiceOption
#### constructor(regex, subFlow)

Create a new MultipleChoiceOption instance(internal use)

### VerificationQuestion
#### constructor(answerKey, questionText, invalidText)

Create a new VerificationQuestion instance, depends on messenger Api instance
* answerKey *(String)* - Key to store answer in Answers instance with
* questionText *(String)* - Text to send when the question is triggered
* invalidText *(String)* - Text to send when the user sends an invalid answer

#### setProvider(provider)

Set the identity provider for the verification
* provider *(String)* - Identity provider to use for verification

#### setVerifiedSubFlow(subFlow)
Set a sub flow for when a user is verified
* subFlow *(Flow)* - Flow to start when the user is verified

#### setUnverifiedSubFlow(subFlow)

Set a sub flow for when a user declines verification
* subFlow *(Flow)* - Flow to start when the user declines verification