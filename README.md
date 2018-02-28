Framework for creating a questionnaire(follow up questions) isolated per user and per room for [Hubot](https://hubot.github.com/) scripts

```javascript
var questionnaire = require('hubot-questionnaire-framework');

module.exports = function(robot) {
    questionnaire.overrideReceiver(robot);
    
    
    robot.hear(/command/i, function(msg) {
        // Optional check if user has permission to execute command
        hasPermission(user, function(allowed) {
            if(allowed) {
                // Ask the first question
                msg.send("What is the answer for question one?");
                // Object to contain the answers of the questionnaire
                var answers = new questionnaire.Answers();
                // Add the listener
                return questionnaire.addListener(msg.message.room, msg.message.user, new questionnaire.Listener(robot, msg, callbackRecord, answers));
            } else {
                msg.send("Sorry you have no access to command");
            }
        });
    }
};

var hasPermission = function(user, callback) {
    // Check if user has permission
    callback(true);
};

var callbackOne = function(response, listener) {
    if(listener.stop) {
        response.send("Stopped the questionnaire");
        return;
    }
    
    if(listener.matches == null) {
        response.send("Answer not accepted by regex, What is the answer for question one?");
        return questionnaire.addListener(response.message.room, response.message.user, new questionnaire.Listener(response.robot, response, callbackOne, listener.answers));
    }
    listener.answers.answerOne = response.message.text;
    
    response.send("What is the answer for question two?");
    return questionnaire.addListener(response.message.room, response.message.user, new questionnaire.Listener(response.robot, response, callbackTwo, listener.answers));
};

var callbackTwo = function(response, listener) {
    if(listener.stop) {
        response.send("Stopped the questionnaire");
        return;
    }
    
    if(listener.matches == null) {
        response.send("Answer not accepted by regex, What is the answer for question two?");
        return questionnaire.addListener(response.message.room, response.message.user, new questionnaire.Listener(response.robot, response, callbackTwo, listener.answers));
    }
    listener.answers.answerTwo = response.message.text;
    
    response.send("Thank you, your answers were: " + listener.answers.answerOne + " and " + listener.answers.answerTwo);
};
```