const Extra = require('node-messenger-extra');
const {Response} = require('hubot');

const Logger = require('./logger.js');

// Listener class for consecutive questions
class Listener {
    constructor(msg, callback, question) {
        this.call = this.call.bind(this);
        this.msg = msg;
        this.callback = callback;
        this.question = question;
        this.regex = question.regex || Extra.getTextRegex();

        // Matcher for given regex
        this.matcher = (message) => {
            if (message.text != null) {
                return message.text.match(this.regex);
            }
        };
    }

    // Configure the listener for the given control instance
    configure(control) {
        this.control = control;

        // Matcher for stop regex
        this.stopMatcher = (responseMessage) => {
            if (responseMessage.text != null && control.stopRegex != null) {
                return responseMessage.text.match(control.stopRegex);
            }
        };

        // Matcher for back regex
        this.backMatcher = (responseMessage) => {
            if (responseMessage.text != null && control.backRegex != null) {
                return responseMessage.text.match(control.backRegex);
            }
        };
    }

    // Called when a message was received for the listener
    call(responseMessage) {
        Logger.debug("Listener::call() text: \"" + responseMessage.text + "\"");

        // Check if given regex matches
        this.matches = this.matcher(responseMessage);

        // Check if stop regex matches
        this.stop = this.stopMatcher(responseMessage);

        // Check if back regex matches
        this.back = this.backMatcher(responseMessage);

        // Call callback
        this.callback(new Response(this.msg.robot, responseMessage, true), this);
    }
}

module.exports = Listener;