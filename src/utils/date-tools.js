const Moment = require('moment-timezone');

const USE_TIMEZONE = process.env.HUBOT_QUESTIONNAIRE_USE_TIMEZONE || process.env.USE_TIMEZONE || "UTC";

class DateTools {
    static getMoment(data) {
        return Moment(data).tz(USE_TIMEZONE);
    }

    static parse(string, format) {
        return Moment(string, format).tz(USE_TIMEZONE);
    }

    static format(date, format) {
        return DateTools.getMoment(date).format(format);
    }

    static timePassed(date, timeScale, timeValue) {
        var moment = DateTools.getMoment(date);
        if(timeScale === "MILLISECONDS") {
            moment.add(timeValue, "ms");
        } else if(timeScale === "SECONDS") {
            moment.add(timeValue, "s");
        } else if(timeScale === "MINUTES") {
            moment.add(timeValue, "m");
        } else if(timeScale === "HOURS") {
            moment.add(timeValue, "h");
        } else if(timeScale === "DAYS") {
            moment.add(timeValue, "d");
        } else if(timeScale === "WEEKS") {
            moment.add(timeValue, "w");
        } else if(timeScale === "MONTHS") {
            moment.add(timeValue, "M");
        } else if(timeScale === "YEARS") {
            moment.add(timeValue, "y");
        } else {
            return false;
        }
        return moment.isBefore(DateTools.getMoment());
    }

    static timeInRange(date, min, max) {
        var minTime = DateTools.parse(min, "HH:mm");
        var maxTime = DateTools.parse(max, "HH:mm");
        return DateTools.getMoment(date).isBetween(minTime, maxTime, "minute");
    }

    static dateInRange(date, min, max) {
        return DateTools.getMoment(date).isBetween(min, max, "day");
    }

    static weekdayInRange(date, min, max) {
        var weekday = DateTools.getMoment(date).isoWeekday();
        return weekday >= min && weekday <= max;
    }

    static weekInRange(date, min, max) {
        var week = DateTools.getWeekNumber(date);
        return week >= min && week <= max;
    }

    static getWeekNumber(date) {
        return DateTools.getMoment(date).isoWeek();
    }

    static monthInRange(date, min, max) {
        var month = DateTools.getMoment(date).month();
        return month >= min && month <= max;
    }
}

module.exports = DateTools;