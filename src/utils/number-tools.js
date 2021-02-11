class NumberTools {

    // Round a number to a given precision
    static round(value, precision) {
        let multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

    static generate(min, max) {
        return Math.round((Math.random() * (max - min)) + min);
    }

}

module.exports = NumberTools;
