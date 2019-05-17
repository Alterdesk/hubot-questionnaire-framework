// Data container of answers that the user has given
class Answers {
    constructor() {
        this.data = {};
    }

    // Add a value by key
    add(key, value) {
        this.data[key] = value;
    }

    addObject(keyPrefix, object) {
        if(!object) {
            return;
        }
        var keys = Object.keys(object);
        if(!keys) {
            return;
        }
        for(var index in keys) {
            var key = keys[index];
            var value = object[key];
            var useKey = keyPrefix + "_" + key;
            if(typeof value === 'object') {
                this.addObject(useKey, value);
            } else {
                this.add(useKey, value);
            }
        }
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

    getKeysWithPrefix(prefix) {
        var result = [];
        var keys = this.keys();
        for(let i in keys) {
            var key = keys[i];
            if(key.startsWith(prefix)) {
                result.push(key);
            }
        }
        return result;
    }

    toJson() {
        return JSON.stringify(this.toObject());
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

    merge(answers, skipExistingKeys) {
        if(!answers) {
            return;
        }
        var keys = answers.keys();
        for(let index in keys) {
            var key = keys[index];
            if(skipExistingKeys && this.has(key)) {
                continue;
            }
            var value = answers.get(key);
            this.add(key, value);
        }
    }

    static fromJson(json) {
        return this.fromObject(JSON.parse(json));
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