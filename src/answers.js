// Data container of answers that the user has given
class Answers {
    constructor() {
        this.data = {};
    }

    // Add a value by key
    add(key, value) {
        this.data[key] = value;
    }

    remove(key) {
        var value = this.data[key];
        delete this.data[key];
        return value;
    }

    // Get a value by key
    get(key) {
        return this.data[key];
    }

    // Check if a value is set by key
    has(key) {
        return typeof this.get(key) !== typeof undefined;
    }

    // Get the keys that are set
    keys() {
        return Object.keys(this.data);
    }

    // Get the number of values that are set
    size() {
        return this.keys().length;
    }

    toObject() {
        var answersObject = {};
        var keys = this.keys();
        if(!keys) {
            return answersObject;
        }
        for(var index in keys) {
            var key = keys[index];
            var value = this.get(key);
            if(value instanceof Answers) {
                answersObject[key] = value.toObject();
            } else {
                answersObject[key] = value;
            }
        }
        return answersObject;
    }

    static fromObject(object) {
        if(!object) {
            return null;
        }
        var keys = Object.keys(object);
        if(!keys) {
            return null;
        }
        var answers = new Answers();
        for(var index in keys) {
            var key = keys[index];
            var value = object[key];
            if(typeof value === 'object') {
                answers.add(key, Answers.fromObject(value));
            } else {
                answers.add(key, value);
            }
        }
        return answers;
    }
}

module.exports = Answers;