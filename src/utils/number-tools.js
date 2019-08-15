class NumberTools {

    // Round a number to a given precision
    static round(value, precision) {
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

}

module.exports = NumberTools;