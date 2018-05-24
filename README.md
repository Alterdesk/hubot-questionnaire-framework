# Hubot Questionnaire Framework

Framework for creating a questionnaire(follow up questions) isolated per user and per room for 
[Hubot](https://hubot.github.com/) scripts. It also enables listening to Alterdesk messenger events.

## Example script
The [Alterdesk Hubot Example](https://github.com/Alterdesk/hubot-example) uses the questionnaire framework in 
[example.js](https://github.com/Alterdesk/hubot-example/blob/master/alterdesk-example-script/example.js)

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
.robotAllowed(false);

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

```javascript
// Regular expressions to use to parse positive and negative answers with
var positiveRegex = new RegExp(/yes/, 'i');
var negativeRegex = new RegExp(/no/, 'i');

var positiveFlow = new Flow(control);
positiveFlow.email("email", "What is your email address?", "Invalid email address");

var negativeFlow = new Flow(control);
negativeFlow.text("reason", "That is to bad, can you give us a reason?", "Invalid answer");

flow.polar("startedSubFlow", "Do you want to subscribe to our newsletter? (Yes or no)", "Invalid answer.", postiveRegex, negativeRegex, positiveFlow, negativeFlow);
```

### MultipleChoiceQuestion
To let the user make a choice of multiple options, the MultipleChoiceQuestion can be used. Each option is set with a 
corresponding regex and an optional sub flow. First call multiple() on the flow and for each option call option() after 
that.
```javascript
// Regular expressions to use to parse options with
var emailRegex = new RegExp(/email/, 'i');
var phoneRegex = new RegExp(/phone/, 'i');
var skipRegex = new RegExp(/skip/, 'i');

flow.multiple("registerBy", "Do you want to register by email, phone number or skip this question?", "Invalid choice.")
.option(emailRegex, emailFlow)
.option(phoneRegex, phoneFlow)
.option(skipRegex);
```

### Listener
The listener class is used to await an answer from a user in a room
* Answer regex to check the message that was received
* Passes along the Answers object
* Automatically times out if a response takes too long

Listener constructor parameters
* Response or msg
* Callback function when an answer is received
* Answers object for collection answers and other data
* Regex to check answer with *(optional)*
* Timeout milliseconds *(optional)*
* Timeout callback *(optional)*

#### Adding a Listener manually
You can also add a listener to the control instance by message manually
```javascript
// Adding a listener after a start command was heard
control.addListener(msg.message, new Listener(msg, callbackOne, new Answers(), question));

// Adding a listener after a response
control.addListener(response.message, new Listener(response, callbackTwo, listener.answers, question));
```

#### Listener callback
The callback function that is given to the Listener constructor is called when a message was received.

Example of a listener callback
```javascript
var callbackOne = function(response, listener) {
    // Check if the stop regex was triggered
    if(listener.stop) {
        response.send("Stopped the questionnaire");
        return;
    }
    
    // Check if rexex accepted the answer
    if(listener.matches == null) {
        response.send("Answer not accepted by regex, What is the answer for question one?");
        return control.addListener(response.message, new Listener(response, callbackOne, listener.answers));
    }
    // Valid answer, store in the answers object
    listener.answers.answerOne = response.message.text;
    
    response.send("What is the answer for question two?");
    return control.addListener(response.message, new Listener(response, callbackTwo, listener.answers));
};
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
* HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT *(int)*

Response timeout text to send on timeout
* HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT_TEXT *(string)*

Catch commands that are not present in the accepted commands list
* HUBOT_QUESTIONNAIRE_CATCH_ALL *(boolean)*

Catch all text to send on unaccepted command
* HUBOT_QUESTIONNAIRE_CATCH_ALL_TEXT *(string)*

Override default hubot help command
* HUBOT_QUESTIONNAIRE_CATCH_HELP *(boolean)*

Help text to send when default hubot help command is overridden
* HUBOT_QUESTIONNAIRE_CATCH_HELP_TEXT *(string)*

Remove a questionnaire listener when a user leave is detected
* HUBOT_QUESTIONNAIRE_REMOVE_ON_LEAVE *(boolean)*

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
* key *(string)* - Key to add the value with
* value *(object)* - Value to add

#### get(key)

Get a value by key
* key *(string)* - Key that the requested value was added with

returns *(object)* - Value corresponding to the key

#### keys()

Get the keys that are added

returns *(array)* - Array of keys

#### size()

Count of values that are added

returns *(int)* - Size of added values
