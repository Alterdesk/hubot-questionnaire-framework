const Moment = require('moment-timezone');

const LocaleTools = require('./locale-tools.js');
const Logger = require('./../logger.js');

const USE_TIMEZONE = process.env.HUBOT_QUESTIONNAIRE_USE_TIMEZONE || process.env.USE_TIMEZONE || "UTC";
const USE_LOCALE = LocaleTools.getLocale();

const MILLISECONDS = "MILLISECONDS";
const SECONDS = "SECONDS";
const MINUTES = "MINUTES";
const HOURS = "HOURS";
const DAYS = "DAYS";
const WEEKS = "WEEKS";
const MONTHS = "MONTHS";
const YEARS = "YEARS";

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = SECOND_IN_MS * 60;
const HOUR_IN_MS = MINUTE_IN_MS * 60;
const DAY_IN_MS = HOUR_IN_MS * 24;
const WEEK_IN_MS = DAY_IN_MS * 7;
const YEAR_IN_MS = WEEK_IN_MS * 52; // Not precise

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

    static addTimeMoment(date, timeScale, timeValue) {
        let moment = DateTools.getUTCMoment(date);
        let useScale = DateTools.getTimeScale(timeScale);
        if(!useScale) {
            return null;
        }
        moment.add(timeValue, useScale);
        return moment;
    }

    static addTimeDate(date, timeScale, timeValue) {
        let moment = DateTools.addTimeMoment(date, timeScale, timeValue);
        if(!moment) {
            Logger.error("DateTools::addTimeDate() Invalid moment:", moment);
            return null;
        }
        return moment.toDate();
    }

    static timePassed(date, timeScale, timeValue) {
        let moment = DateTools.addTimeMoment(date, timeScale, timeValue);
        if(!moment) {
            Logger.error("DateTools::timePassed() Invalid moment:", moment);
            return false;
        }
        return moment.isBefore(DateTools.getUTCMoment());
    }

    static isBefore(date, compareDate) {
        let moment = DateTools.getUTCMoment(date);
        return moment.isBefore(compareDate);
    }

    static isAfter(date, compareDate) {
        let moment = DateTools.getUTCMoment(date);
        return moment.isAfter(compareDate);
    }

    static isDate(date, year, month, day) {
        let moment = DateTools.getUTCMoment(date);
        if(year > 0) {
            let currentYear = moment.year();
            if(year !== currentYear) {
                return false;
            }
        }
        if(month > 0) {
            // Months are zero indexed
            let currentMonth = (moment.month() + 1);
            if(month !== currentMonth) {
                return false;
            }
        }
        if(day > 0) {
            let currentDay = moment.date();
            if(day !== currentDay) {
                return false;
            }
        }
        return true;
    }

    static dateBetween(date, min, max, precisionScale) {
        let timeScale;
        if(precisionScale) {
            timeScale = DateTools.getTimeScale(precisionScale);
        }
        return DateTools.getUTCMoment(date).isBetween(min, max, timeScale);
    }

    static timeInRange(date, min, max) {
        let parsedDate = DateTools.getUTCMoment(date);
        let currentTime = DateTools.getUTCMoment();
        currentTime.hours(parsedDate.hours());
        currentTime.minutes(parsedDate.minutes());
        currentTime.seconds(30);
        let minTime = DateTools.parseLocalToUTC(min + ":00", "HH:mm:ss");
        let maxTime = DateTools.parseLocalToUTC(max + ":59", "HH:mm:ss");
        return currentTime.isBetween(minTime, maxTime, "second");
    }

    static dateInRange(date, min, max) {
        return DateTools.getUTCMoment(date).isBetween(min, max, "day");
    }

    static weekdayInRange(date, min, max) {
        let weekday = DateTools.getUTCMoment(date).isoWeekday();
        return weekday >= min && weekday <= max;
    }

    static weekInRange(date, min, max) {
        let week = DateTools.getWeekNumber(date);
        return week >= min && week <= max;
    }

    static getWeekNumber(date) {
        return DateTools.getUTCMoment(date).isoWeek();
    }

    static getWeeksInYear(date) {
        return DateTools.getUTCMoment(date).isoWeeksInYear();
    }

    static monthInRange(date, min, max) {
        // Months are zero indexed
        let month = (DateTools.getUTCMoment(date).month() + 1);
        return month >= min && month <= max;
    }

    static getDiffMs(minDate, maxDate) {
        let moment = DateTools.getUTCMoment(maxDate);
        return moment.diff(minDate);
    }

    static epochSeconds(date) {
        let moment = DateTools.getUTCMoment(date);
        return moment.unix();
    }

    static getTimeScale(timeScale) {
        if(timeScale === MILLISECONDS) {
            return "ms";
        } else if(timeScale === SECONDS) {
            return "s";
        } else if(timeScale === MINUTES) {
            return "m";
        } else if(timeScale === HOURS) {
            return "h";
        } else if(timeScale === DAYS) {
            return "d";
        } else if(timeScale === WEEKS) {
            return "w";
        } else if(timeScale === MONTHS) {
            return "M";
        } else if(timeScale === YEARS) {
            return "y";
        }
        Logger.error("DateTools::getTimeScale() Invalid timescale:", timeScale);
        return null;
    }

    static getYearInMs() {
        return YEAR_IN_MS;
    }

    static getWeekInMs() {
        return WEEK_IN_MS;
    }

    static getDayInMs() {
        return DAY_IN_MS;
    }

    static getHourInMs() {
        return HOUR_IN_MS;
    }

    static getMinuteInMs() {
        return MINUTE_IN_MS;
    }

    static getSecondInMs() {
        return SECOND_IN_MS;
    }

    static localDate() {
        return this.getLocalMoment().toDate();
    }

    static utcDate() {
        return this.getUTCMoment().toDate();
    }
}

module.exports = DateTools;
