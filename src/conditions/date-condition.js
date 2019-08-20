const ChatTools = require('./../utils/chat-tools.js');
const Condition = require('./condition.js');
const DateTools = require('./../utils/date-tools.js');
const Logger = require('./../logger.js');

class DateCondition extends Condition {
    constructor() {
        super();
        this.checks = [];
    }

    check(flow) {
        var date = this.getAnswerValue(this.checkDate, flow.answers);
        if(!date) {
            date = DateTools.utcDate();
        }
        Logger.debug("DateCondition::check() Checking date:", date);
        var inverse = this.getAnswerValue(this.inverse, flow.answers, false);
        for(let index in this.checks) {
            var c = this.checks[index];
            if(c.check(date)) {
                Logger.debug("DateCondition::check() Condition met: inverse: " + inverse + " check:", c);
                return !inverse;
            }
        }
        Logger.debug("DateCondition::check() Condition not met: inverse: " + inverse + " condition:", this);
        return inverse;
    }

    setCheckDate(checkDate) {
        this.checkDate = checkDate;
    }

    addTimePassed(timeScale, timeValue) {
        this.checks.push(new TimePassed(timeScale, timeValue));
    }

    addIsDate(year, month, day) {
        this.checks.push(new IsDate(year, month, day));
    }

    addTimeRange(min, max) {
        this.checks.push(new TimeRange(min, max));
    }

    addWeekdayRange(min, max) {
        this.checks.push(new WeekdayRange(min, max));
    }

    addWeekRange(min, max) {
        this.checks.push(new WeekRange(min, max));
    }

    addEvenWeek(even) {
        this.checks.push(new EvenWeek(even));
    }

    addMonthRange(min, max) {
        this.checks.push(new MonthRange(min, max));
    }

    addDateRange(min, max) {
        this.checks.push(new DateRange(min, max));
    }

    hasChecks() {
        return this.checks.length > 0;
    }

}

class TimePassed {
    constructor(timeScale, timeValue) {
        this.timeScale = timeScale;
        this.timeValue = timeValue;
    }

    check(date) {
        return DateTools.timePassed(date, this.timeScale, this.timeValue);
    }
}

class IsDate {
    constructor(year, month, day){
        this.year = year;
        this.month = month;
        this.day = day;
    }

    check(date) {
        return DateTools.isDate(date, this.year, this.month, this.day);
    }
}

class TimeRange {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    check(date) {
        return DateTools.timeInRange(date, this.min, this.max);
    }
}

class WeekdayRange {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    check(date) {
        return DateTools.weekdayInRange(date, this.min, this.max);
    }
}

class WeekRange {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    check(date) {
        return DateTools.weekInRange(date, this.min, this.max);
    }
}

class EvenWeek {
    constructor(even) {
        this.even;
    }

    check(date) {
        return (DateTools.getWeekNumber(date) % 2 === 0) === this.even;
    }
}

class MonthRange {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    check(date) {
        return DateTools.monthInRange(date, this.min, this.max);
    }
}

class DateRange {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    check(date) {
        return DateTools.dateInRange(date, this.min, this.max);
    }
}

module.exports = DateCondition;