# Hubot Questionnaire Framework

Framework for creating a questionnaire(follow up questions) isolated per user and per room for 
[Hubot](https://hubot.github.com/) scripts

## Classes
### Control
The control class can override the default Hubot message receiver to:
* Manage accepted commands
* Override the default Hubot help command
* Adding/Removing message listeners per user per room

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

### Flow
To easily create a questionnaire, the Flow class can be used to create a flow of questions. You can ask the user for
his\her first and last name like so
```javascript
robot.hear(/start/i, function(msg) {
    new Flow(control, "Flow has stopped.", "Error occured during flow")
    .text("firstName", "Can you send me your first name?", "Invalid name.")
    .text("lastName", "Can you send me your last name?", "Invalid name.")
    .finish(callbackFormFinished)
    .start(msg);
})
```
Flow constructor parameters
* Control instance
* Text to send when the user has stopped the flow
* Text to send when an error occurs in the flow

You can chain functions like text() to add questions to the flow. The finish() function will allow you to set a callback
that is called when the flow is finished in which you can use the given answers to preform a task.
```javascript
var callbackFormFinished = function(response, answers) {
    response.send("Your name is " + answers.get("firstName") + " " + answers.get("lastName"));
};
```

### Question
The Question class is extended by the question classes below, the subclasses can be added to a flow instance to ask the
user a question with certain rules.

Question constructor
* Answer key to use when storing given answer in Answers object
* Question text to send to the user
* Text to send when a given answer is invalid

Each Question sub class has a convience method in the Flow class, but you can manually add questions to a flow before 
the flow is started like this
```javascript
// Create a question
var question = new TextQuestion("myKey", "Can you send me some text?", "Invalid text.");

// Optional timeout override
question.setTimeout(timeoutMs, timoutText, timeoutCallback);

// Add the question to the flow
flow.add(question);
```

### TextQuestion
To add a question that excepts non-empty text, simply call text() on a flow instance before starting the flow.
```javascript
// Ask user to send some text and store in Answers with the key "myKey"
flow.text("myKey", "Can you send me some text?", "Invalid text.");
```

### NumberQuestion
Adding a question that only accepts numbers, the NumberQuestion can be used. You can optionally use a range of accepted 
values
```javascript
// Ask the user for a number and store with key "number"
flow.number("number", "Can you send me a number?", "Invalid number.");

// Ask a number between 2 and 5
flow.number("limited", "Can you send me a number between 2 and 5?", "Invalid number or outside range", 2, 5);
```

### EmailQuestion
### PhoneNumberQuestion
### PolarQuestion
### MentionQuestion

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
control.addListener(msg.message, new Listener(msg, callbackOne, new Answers()));

// Adding a listener after a response
control.addListener(response.message, new Listener(response, callbackTwo, listener.answers));
```

#### Override regex and timeout defaults when adding a Listener manually
You can also add a Listener manually with your own regex and timeout settings
```javascript
// Adding a listener which checks message with "myRegex", times out after three minutes and uses a custom timeout callback
control.addListener(response.message, new Listener(response, callbackThree, listener.answers, myRegex, 180000, myTimeoutCallback));
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

## Example script
The [Alterdesk Hubot Example](https://github.com/Alterdesk/hubot-example) uses the questionnaire framework in 
[example.js](https://github.com/Alterdesk/hubot-example/blob/master/alterdesk-example-script/example.js)

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