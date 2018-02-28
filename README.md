# Hubot Questionnaire Framework

Framework for creating a questionnaire(follow up questions) isolated per user and per room for [Hubot](https://hubot.github.com/) scripts

## Classes
## Control
The control class can override the default Hubot message receiver to:
* Manage accepted commands
* Override the default Hubot help command
* Adding/Removing message listeners per user per room

### Listener
The listener class is used to await an answer from the user, containing answer regex and timeout information.

### Answers
Data container class that holds the answers given by a user in a questionnaire

```javascript
var questionnaire = require('hubot-questionnaire-framework');

// Questionnaire control instance
var control;

module.exports = function(robot) {
    // Override the default robot message receiver
    control = new questionnaire.Control();
    control.overrideReceiver(robot);
    
    // Check if the start command of the questionnaire is heard
    robot.hear(/command/i, function(msg) {
        // Optional check if user has permission to execute the questionnaire
        hasPermission(user, function(allowed) {
            if(allowed) {
                // Ask the first question
                msg.send("What is the answer for question one?");
                // Object to contain the answers of the questionnaire
                var answers = new questionnaire.Answers();
                var listener = new questionnaire.Listener(robot, msg, callbackOne, answers);
                // Add the listener
                return control.addListener(msg.message, listener);
            } else {
                msg.send("Sorry you have no access to command");
            }
        });
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
        return control.addListener(response.message, new questionnaire.Listener(response.robot, response, callbackOne, listener.answers));
    }
    // Valid answer, store in the answers object
    listener.answers.answerOne = response.message.text;
    
    response.send("What is the answer for question two?");
    return control.addListener(response.message, new questionnaire.Listener(response.robot, response, callbackTwo, listener.answers));
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
        return control.addListener(response.message, new questionnaire.Listener(response.robot, response, callbackTwo, listener.answers));
    }
    // Valid answer, store in the answers object
    listener.answers.answerTwo = response.message.text;
    
    // Show summary of answers
    response.send("Thank you, your answers were: " + listener.answers.answerOne + " and " + listener.answers.answerTwo);
};
```