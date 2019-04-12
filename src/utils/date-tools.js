const Moment = require('moment-timezone');

const Logger = require('./../logger.js');

const USE_TIMEZONE = process.env.HUBOT_QUESTIONNAIRE_USE_TIMEZONE || process.env.USE_TIMEZONE || "UTC";
const USE_LOCALE = process.env.HUBOT_QUESTIONNAIRE_USE_LOCALE || process.env.USE_LOCALE || "en-US";

class DateTools {

    static getUTCMoment(data) {
        return Moment.tz(data, "UTC").locale(USE_LOCALE);
    }

    static getLocalMoment(data) {
        return Moment.tz(data, USE_TIMEZONE).locale(USE_LOCALE);
    }

    static parseToUtc(string, format) {
        return Moment.tz(string, format, "UTC").locale(USE_LOCALE);
    }

    static parseLocalToUTC(string, format) {
        return Moment.tz(string, format, USE_TIMEZONE).locale(USE_LOCALE);
    }

    static formatToUTC(date, format) {
        return DateTools.getUTCMoment(date).format(format);
    }

    static formatToLocal(date, format) {
        return DateTools.getLocalMoment(date).format(format);
    }

    static timePassed(date, timeScale, timeValue) {
        var moment = DateTools.getUTCMoment(date);
        var useScale = DateTools.getTimeScale(timeScale);
        if(!useScale) {
            return false;
        }
        moment.add(timeValue, useScale);
        return moment.isBefore(DateTools.getUTCMoment());
    }

    static isDate(date, year, month, day) {
        var moment = DateTools.getUTCMoment(date);
        if(year > 0) {
            var currentYear = moment.year();
            if(year !== currentYear) {
                return false;
            }
        }
        if(month > 0) {
            var currentMonth = moment.month();
            if(month !== currentMonth) {
                return false;
            }
        }
        if(day > 0) {
            var currentDay = moment.date();
            if(day !== currentDay) {
                return false;
            }
        }
        return true;
    }

    static timeInRange(date, min, max) {
        var parsedDate = DateTools.getUTCMoment(date);
        var currentTime = DateTools.getUTCMoment();
        currentTime.hours(parsedDate.hours());
        currentTime.minutes(parsedDate.minutes());
        currentTime.seconds(30);
        var minTime = DateTools.parseLocalToUTC(min + ":00", "HH:mm:ss");
        var maxTime = DateTools.parseLocalToUTC(max + ":59", "HH:mm:ss");
        return currentTime.isBetween(minTime, maxTime, "second");
    }

    static dateInRange(date, min, max) {
        return DateTools.getUTCMoment(date).isBetween(min, max, "day");
    }

    static weekdayInRange(date, min, max) {
        var weekday = DateTools.getUTCMoment(date).isoWeekday();
        return weekday >= min && weekday <= max;
    }

    static weekInRange(date, min, max) {
        var week = DateTools.getWeekNumber(date);
        return week >= min && week <= max;
    }

    static getWeekNumber(date) {
        return DateTools.getUTCMoment(date).isoWeek();
    }

    static monthInRange(date, min, max) {
        var month = DateTools.getUTCMoment(date).month();
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

    static localDate() {
        return this.getLocalMoment().toDate();
    }

    static utcDate() {
        return this.getUTCMoment().toDate();
    }
}

module.exports = DateTools;