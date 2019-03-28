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
        var useScale = DateTools.getTimeScale(timeScale);
        if(!useScale) {
            return false;
        }
        moment.add(timeValue, useScale);
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

    static getTimeScale(timeScale) {
        if(timeScale === "MILLISECONDS") {
            return "ms";
        } else if(timeScale === "SECONDS") {
            return "s";
        } else if(timeScale === "MINUTES") {
            return "m";
        } else if(timeScale === "HOURS") {
            return "h";
        } else if(timeScale === "DAYS") {
            return "d";
        } else if(timeScale === "WEEKS") {
            return "w";
        } else if(timeScale === "MONTHS") {
            return "M";
        } else if(timeScale === "YEARS") {
            return "y";
        }
        return null;
    }
}

module.exports = DateTools;