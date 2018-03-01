# Hubot Questionnaire Framework

Framework for creating a questionnaire(follow up questions) isolated per user and per room for [Hubot](https://hubot.github.com/) scripts

## Classes
### Control
The control class can override the default Hubot message receiver to:
* Manage accepted commands
* Override the default Hubot help command
* Adding/Removing message listeners per user per room

#### Minimal setup for Control
To intercept messages with the control instance the following code is needed
```javascript
var control;

module.exports = function(robot) {
    control = new Control();
    control.overrideReceiver(robot);
};
```

### Listener
The listener class is used to await an answer from a user in a room
* Answer regex to check the message that was received
* Passes along the Answers object
* Automatically times out if a response takes too long

#### Adding a Listener
Adding a listener to the control instance
```javascript
// Adding a listener after a start command was heard
control.addListener(msg, new Listener(response, callbackOne, new Answers()));

// Adding a listener after a response
control.addListener(response.message, new Listener(response, callbackTwo, listener.answers));
```

#### Override some defaults when adding a Listener
You can also use a Lister with your own regex and timeout settings
```javascript
// Adding a listener which checks message with "myRegex", times out after three minutes and uses a custom timeout callback
control.addListener(response.message, new Listener(response, callbackThree, listener.answers, myRegex, 180000, myTimeoutCallback));
```

#### Example of a listener callback
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
Data container class that holds the answers given by a user in a questionnaire

## Example script
The example given below uses the Hubot Questionnaire Framework in a Hubot script
```javascript
var questionnaire = require('hubot-questionnaire-framework');
const {Control, Listener, Answers} = require('hubot-questionnaire-framework');

// Questionnaire control instance
var control;

module.exports = function(robot) {

    // Create a control instance
    control = new Control();
    
    // Override the stop regex to "abort" instead of "stop"
    control.setStopRegex(new RegExp(/abort/, 'i'));
    
    // Override default hubot help command
    control.setCatchHelp(true);
    // Override the help regex to "what" instead of "help"
    control.setHelpRegex(/what/, 'i');
    // Set the text to send when help was requested
    control.setCatchHelpText("You can send \"command\" to start the questionnaire");
    
    // Wait for two minutes for a reply from a user
    control.setResponseTimeoutMs(120000);
    // Set the text to send when a user is too late
    control.setResponseTimeoutText("You waited too long to answer, stopped listening");
    
    // When an unknown command was heard, do not pass it along to the default hubot receiver
    control.setCatchAll(true);
    // Set the text to send when an unknown command was heard
    control.setCatchAllText(catchAllText);
    
    // Mark the words "command" and "ping" as an accepted commands
    control.addAcceptedCommands(["command", "ping"]);

    // Override the default robot message receiver
    control.overrideReceiver(robot);
    
    // Check if the start command of the questionnaire is heard
    robot.hear(/command/i, function(msg) {
        // Optional check if user has permission to execute the questionnaire
        hasPermission(user, function(allowed) {
            if(allowed) {
                // Ask the first question
                msg.send("What is the answer for question one?");
                // Object to contain the answers of the questionnaire
                var answers = new Answers();
                // Create a listener to await response for the user in this room
                var listener = new Listener(msg, callbackOne, answers);
                // Add the listener
                return control.addListener(msg.message, listener);
            } else {
                msg.send("Sorry you have no access to command");
            }
        });
    },
    
    // Example simple command that does not use the questionnaire
    robot.hear(/ping/i, function(msg) {
        msg.send("PONG!");
    }
};

// Check if user has permission
var hasPermission = function(user, callback) {
    // Using a callback mechanism like this the check can be an asynchonous network call
    callback(true);
};


// Check and store the answer for the first question and ask followup question when valid
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

// Check and store the answer for the second question and show summary when valid
var callbackTwo = function(response, listener) {
    // Check if the stop regex was triggered
    if(listener.stop) {
        response.send("Stopped the questionnaire");
        return;
    }
    
    // Check if rexex accepted the answer
    if(listener.matches == null) {
        response.send("Answer not accepted by regex, What is the answer for question two?");
        return control.addListener(response.message, new Listener(response, callbackTwo, listener.answers));
    }
    // Valid answer, store in the answers object
    listener.answers.answerTwo = response.message.text;
    
    // Show summary of answers
    response.send("Thank you, your answers were: " + listener.answers.answerOne + " and " + listener.answers.answerTwo);
    
    // Execute the command
    executeCommand(listener.answers);
};

var executeCommand = function(answers) {
    // Do something with the given answers
};
```

## Environment variables
Certain settings can also be set through environment variables if desired


* Response timeout milliseconds
HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT (int)
* Response timeout text to send on timeout
HUBOT_QUESTIONNAIRE_RESPONSE_TIMEOUT_TEXT (string)
* Catch commands that are not present in the accepted commands list
HUBOT_QUESTIONNAIRE_CATCH_ALL (boolean);
* Catch all text to send on unaccepted command
HUBOT_QUESTIONNAIRE_CATCH_ALL_TEXT (string)
* Override default hubot help command
HUBOT_QUESTIONNAIRE_CATCH_HELP (boolean)
* Help text to send when default hubot help command is overridden
HUBOT_QUESTIONNAIRE_CATCH_HELP_TEXT (string)
* Remove a questionnaire listener when a user leave is detected
HUBOT_QUESTIONNAIRE_REMOVE_ON_LEAVE (boolean)