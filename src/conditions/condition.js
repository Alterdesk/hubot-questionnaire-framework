const Logger = require('./../logger.js');

class Condition {
    constructor() {
        this.repeatIteration = -1;
    }

    check(answers) {

    }

    setInverse(inverse) {
        this.inverse = inverse;
    }

    setRepeatIteration(repeatIteration) {
        this.repeatIteration = repeatIteration;
    }

}

module.exports = Condition;