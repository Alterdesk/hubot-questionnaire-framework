const {User, Message, TextMessage} = require('hubot');
const FileSystem = require('fs');
const Path = require('path');
const UuidV1 = require('uuid/v1');

const Answers = require('./answers.js');
const DateTools = require('./utils/date-tools.js');
const Logger = require('./logger.js');

class BotApi {
    constructor(robot, control) {
        this.robot = robot;
        this.control = control;
        this.timers = {};
        this.overrideCallbacks = {};

        var useApi = parseInt(process.env.HUBOT_USE_API || 1);;
        if(useApi === 0) {
            Logger.info("BotApi::constructor() API disabled");
            return;
        }

        this.token = process.env.HUBOT_API_TOKEN;
        if(!this.token || this.token === "") {
            this.token = UuidV1();
            Logger.info("BotApi::constructor() No token configured, set token to: " + this.token);
        }

        var app;
        if(process.env.HUBOT_API_SERVER) {
            var express = require('express');
            app = express();
            app.use(express.json());

            var port = process.env.HUBOT_API_PORT || 8443;
            var host = process.env.HUBOT_API_HOST || "0.0.0.0";
            var keyPath = process.env.HUBOT_API_KEY_PATH;
            var certPath = process.env.HUBOT_API_CERT_PATH;
            if(keyPath && keyPath !== "" && certPath && certPath !== "") {
                var options = {
                   key: FileSystem.readFileSync(keyPath),
                   cert: FileSystem.readFileSync(certPath),
                   passphrase: process.env.HUBOT_API_CERT_PASS
                };
                var https = require('https');
                https.createServer(options, app).listen(port, host, () => {
                    Logger.debug("BotApi::constructor() Started HTTPS schedule API server on port " + port);
                });
            } else {
                var http = require('http');
                http.createServer(app).listen(port, host, () => {
                    Logger.debug("BotApi::constructor() Started HTTP schedule API server on port " + port);
                });
            }
        } else {
            // Use Hubot default express instance
            Logger.debug("BotApi::constructor() Using default Hubot HTTP server for schedule API");
            app = robot.router;
        }

        app.get("/stats/configured", (req, res) => {this.getConfigured(req, res)});
        app.get("/stats/connected", (req, res) => {this.getConnected(req, res)});
        app.get("/stats/questionnaires", (req, res) => {this.getQuestionnaires(req, res)});

        app.get("/actions/stop", (req, res) => {this.getStop(req, res)});
        app.get("/actions/kill", (req, res) => {this.getKill(req, res)});

        app.get("/conversations/:chat_id/schedule/:event_id", (req, res) => {this.getEvent(req, res)});
        app.get("/groupchats/:chat_id/schedule/:event_id", (req, res) => {this.getEvent(req, res)});
        app.delete("/conversations/:chat_id/schedule/:event_id", (req, res) => {this.deleteEvent(req, res)});
        app.delete("/groupchats/:chat_id/schedule/:event_id", (req, res) => {this.deleteEvent(req, res)});
        app.post("/conversations/:chat_id/schedule", (req, res) => {this.postEvent(req, res)});
        app.post("/groupchats/:chat_id/schedule", (req, res) => {this.postEvent(req, res)});
        app.post("/conversations/:chat_id/trigger", (req, res) => {this.postTrigger(req, res)});
        app.post("/groupchats/:chat_id/trigger", (req, res) => {this.postTrigger(req, res)});

        this.scheduleFilePath = process.env.HUBOT_ALTERDESK_FILE_PATH || Path.join(process.cwd(), 'schedule.json');
        this.schedule;
        try {
            if (FileSystem.existsSync(this.scheduleFilePath)) {
                this.schedule = JSON.parse(FileSystem.readFileSync(this.scheduleFilePath));
                Logger.debug("BotApi::constructor() Loaded schedule:", this.schedule);
                var eventIds = Object.keys(this.schedule);
                if(eventIds) {
                    for(var index in eventIds) {
                        var eventId = eventIds[index];
                        var event = this.schedule[eventId];
                        this.setEventTimer(event);
                    }
                }
            }
        } catch(error) {
            Logger.error("BotApi::constructor() Load schedule error:", error);
        }
        if(!this.schedule) {
            this.schedule = {};
        }
    }

    processData(data) {
        if(!data) {
            Logger.error("BotApi::processData() Invalid data:", data);
            return;
        }
        var parsed;
        try {
            parsed = JSON.parse(data);
        } catch(e) {
            Logger.error("BotApi::processData() Invalid JSON:", data, e);
            return;
        }
        Logger.debug("BotApi::processData()", parsed);
        if(parsed["command"]) {
            this.processCommand(parsed);
        } else if(parsed["trigger"]) {
            this.processTrigger(parsed);
        } else {
            Logger.error("BotApi::processData() Invalid data:", parsed);
        }
    }

    processCommand(data) {
        var command = data["command"];
        Logger.debug("BotApi::processCommand() Command:", command);
        var result = {};
        var id = data["id"];
        if(id) {
            result["id"] = id;
        }
        var exitCode = -1;

        if(command === "stop") {
            if(this.control.armExitOnIdle(true)) {
                exitCode = 0;
            }
            result["stop"] = true;
        } else if(command === "kill") {
            exitCode = 1;
            result["kill"] = true;
        } else if(command === "connected") {
            result["connected"] = this.isConnected();
        } else if(command === "configured") {
            result["configured"] = this.isConfigured();
        } else if(command === "questionnaires") {
            result["questionnaires"] = this.control.getActiveQuestionnaires();
        } else if(command === "stats") {
            result["connected"] = this.isConnected();
            result["configured"] = this.isConfigured();
            result["questionnaires"] = this.control.getActiveQuestionnaires();
        } else {
            Logger.error("BotApi::processCommand() Unknown command:", command);
            result["error"] = "Unknown command: \"" + command + "\"";
        }
        console.log(JSON.stringify(result));

        if(exitCode !== -1) {
            Logger.debug("BotApi::processCommand() Exiting:", exitCode);
            process.exit(exitCode);
        }
    }

    processTrigger(data) {
        var param = data["param"];
        if(!param) {
            Logger.error("BotApi::processTrigger() Invalid params:", data);
        }
        var trigger = data["trigger"];
        Logger.debug("BotApi::processTrigger() Trigger:", trigger, param);

        var chatId = param["chat_id"];
        var isGroup = param["is_group"];
        var userId = param["user_id"];
        var answers = Answers.fromObject(param["answers"]);
        this.executeCommand(chatId, isGroup, userId, trigger, answers);

        var result = {};
        var id = data["id"];
        if(id) {
            result["id"] = id;
        }
        result["trigger"] = trigger;
        console.log(JSON.stringify(result));
    }

    isConnected() {
        if(this.robot.adapter && typeof this.robot.adapter.connected === "boolean") {
           return this.robot.adapter.connected;
        }
        return false;
    }

    isConfigured() {
        return this.control.acceptedCommands.length > 0;
    }

    getConfigured(req, res) {
        try {
            if(!this.checkRequest(req, res)) {
                return;
            }
            var result = {};
            result["result"] = this.isConfigured();
            this.respondRequest(req, res, 200, JSON.stringify(result));
        } catch(error) {
            Logger.error("BotApi::getConfigured()", error);
            this.respondRequest(req, res, 500, this.getJsonError("Get configured event error"));
        }
    }

    getConnected(req, res) {
        try {
            if(!this.checkRequest(req, res)) {
               return;
            }
            var result = {};
            result["result"] = this.isConnected();
            this.respondRequest(req, res, 200, JSON.stringify(result));
        } catch(error) {
            Logger.error("BotApi::getConnected()", error);
            this.respondRequest(req, res, 500, this.getJsonError("Get connected event error"));
        }
    }

    getQuestionnaires(req, res) {
        try {
            if(!this.checkRequest(req, res)) {
                return;
            }
            var questionnaires = this.control.getActiveQuestionnaires();
            this.respondRequest(req, res, 200, JSON.stringify(questionnaires));
        } catch(error) {
            Logger.error("BotApi::getQuestionnaires()", error);
            this.respondRequest(req, res, 500, this.getJsonError("Get questionnaires event error"));
        }
    }

    getStop(req, res) {
        var exitNow = false;
        try {
            if(!this.checkRequest(req, res)) {
                return;
            }
            exitNow = this.control.armExitOnIdle(true);
            var result = {};
            result["result"] = true;
            this.respondRequest(req, res, 200, JSON.stringify(result));
        } catch(error) {
            Logger.error("BotApi::getStop()", error);
            this.respondRequest(req, res, 500, this.getJsonError("Get stop event error"));
        }
        if(exitNow) {
            Logger.debug("BotApi::getStop() Is idle now, exiting");
            process.exit(0);
        }
    }

    getKill(req, res) {
        try {
            if(!this.checkRequest(req, res)) {
                return;
            }
            var result = {};
            result["result"] = true;
            this.respondRequest(req, res, 200, JSON.stringify(result));
        } catch(error) {
            Logger.error("BotApi::getKill()", error);
            this.respondRequest(req, res, 500, this.getJsonError("Get kill event error"));
        }
        process.exit(1);
    }

    getEvent(req, res) {
        try {
            if(!this.checkRequest(req, res)) {
                return;
            }
            var chatId = req.params.chat_id;
            if(!chatId) {
                Logger.error("BotApi::getEvent() Invalid chat id");
                this.respondRequest(req, res, 400, this.getJsonError("Invalid chat id"));
                return;
            }
            var eventId = req.params.event_id;
            if(!chatId) {
                Logger.error("BotApi::getEvent() Invalid event id");
                this.respondRequest(req, res, 400, this.getJsonError("Invalid event id"));
                return;
            }
            var isGroup = req.url.startsWith("/groupchats");

            var event = this.getScheduledEvent(chatId, isGroup, eventId);
            if(!event) {
                this.respondRequest(req, res, 404, this.getJsonError("Event not found"));
                return;
            }

            this.respondRequest(req, res, 200, JSON.stringify(event));
        } catch(error) {
            Logger.error("BotApi::getEvent()", error);
            this.respondRequest(req, res, 500, this.getJsonError("Get scheduled event error"));
        }
    }

    deleteEvent(req, res) {
        try {
            if(!this.checkRequest(req, res)) {
                return;
            }
            var chatId = req.params.chat_id;
            if(!chatId) {
                Logger.error("BotApi::deleteEvent() Invalid chat id");
                this.respondRequest(req, res, 400, this.getJsonError("Invalid chat id"));
                return;
            }
            var eventId = req.params.event_id;
            if(!chatId) {
                Logger.error("BotApi::deleteEvent() Invalid event id");
                this.respondRequest(req, res, 400, this.getJsonError("Invalid event id"));
                return;
            }
            var isGroup = req.url.startsWith("/groupchats");

            var event = this.getScheduledEvent(chatId, isGroup, eventId);
            if(!event) {
                this.respondRequest(req, res, 404, this.getJsonError("Event not found"));
                return;
            }

            this.removeFromSchedule(eventId);

            var result = {};
            result["success"] = true;
            this.respondRequest(req, res, 200, JSON.stringify(result));
        } catch(error) {
            Logger.error("BotApi::deleteEvent()", error);
            this.respondRequest(req, res, 500, this.getJsonError("Delete scheduled event error"));
        }
    }

    postEvent(req, res) {
        try {
            if(!this.checkRequest(req, res)) {
                return;
            }
            var chatId = req.params.chat_id;
            if(!chatId) {
                Logger.error("BotApi::postEvent() Invalid chat id");
                this.respondRequest(req, res, 400, this.getJsonError("Invalid chat id"));
                return;
            }
            var body = req.body;
            if(!body) {
                this.respondRequest(req, res, 400, this.getJsonError("Invalid body on postEvent"));
                return;
            }
            var isGroup = req.url.startsWith("/groupchats");
            var userId = body["user_id"];
            if(isGroup && (!userId || userId === "")) {
                Logger.error("BotApi::postEvent() Invalid user id: " + userId);
                this.respondRequest(req, res, 400, this.getJsonError("Invalid user id"));
                return;
            }
            var command = body["command"];
            if(!command || command === "") {
                Logger.error("BotApi::postEvent() Invalid command: " + command);
                this.respondRequest(req, res, 400, this.getJsonError("Invalid command"));
                return;
            }
            var answers = body["answers"];

            var eventId;

            var date = body["date"];
            var times = body["times"];
            var days = body["week_days"];
            var excludes = body["exclude_dates"];
            if(date && date !== "") {
                eventId = this.scheduleEvent(chatId, isGroup, userId, command, date, answers);
            } else if(times && times.length > 0) {
                eventId = this.scheduleRepeatedEvent(chatId, isGroup, userId, command, times, days, excludes, answers);
            } else {
                Logger.error("BotApi::postEvent() Invalid date: " + date);
                this.respondRequest(req, res, 400, this.getJsonError("Invalid date"));
                return;
            }

            var result = {};
            result["id"] = eventId;
            this.respondRequest(req, res, 201, JSON.stringify(result));
        } catch(error) {
            Logger.error("BotApi::postEvent()", error);
            this.respondRequest(req, res, 500, this.getJsonError("Schedule event error"));
        }
    }

    postTrigger(req, res) {
        try {
            if(!this.checkRequest(req, res)) {
                return;
            }
            var chatId = req.params.chat_id;
            if(!chatId) {
                Logger.error("BotApi::postTrigger() Invalid chat id");
                this.respondRequest(req, res, 400, this.getJsonError("Invalid chat id"));
                return;
            }
            var body = req.body;
            if(!body) {
                this.respondRequest(req, res, 400, this.getJsonError("Invalid body"));
                return;
            }
            var isGroup = req.url.startsWith("/groupchats");

            var userId;
            if(isGroup) {
                userId = body["user_id"]
            } else {
                userId = chatId;
            }
            if(!userId || userId === "") {
                Logger.error("BotApi::postTrigger() Invalid user id: " + userId);
                this.respondRequest(req, res, 400, this.getJsonError("Invalid user id"));
                return;
            }
            var command = body["command"];
            if(!command || command === "") {
                Logger.error("BotApi::postTrigger() Invalid command: " + command);
                this.respondRequest(req, res, 400, this.getJsonError("Invalid command"));
                return;
            }
            var answers = Answers.fromObject(body["answers"]);
            this.executeCommand(chatId, isGroup, userId, command, answers);

            var result = {};
            result["success"] = true;

            this.respondRequest(req, res, 200, JSON.stringify(result));
        } catch(error) {
            Logger.error("BotApi::postTrigger()", error);
            this.respondRequest(req, res, 500, this.getJsonError("Trigger error"));
        }
    }

    checkRequest(req, res) {
        if(!req) {
            Logger.error("BotApi::checkRequest() Invalid request object");
            return false;
        }
        if(!res) {
            Logger.error("BotApi::checkRequest() Invalid response object");
            return false;
        }
        var requestText = "BotApi::" + req.method.toLowerCase() + "() << " + req.url + ":";
        if(req.body) {
            Logger.debug(requestText, req.body);
        } else {
            Logger.debug(requestText);
        }
        var params = req.params;
        if(!params) {
            this.respondRequest(req, res, 400, this.getJsonError("Invalid parameters"));
            return false;
        }
        var headers = req.headers;
        if(!headers) {
            this.respondRequest(req, res, 400, this.getJsonError("Invalid request headers"));
            return false;
        }
        if(!this.token || this.token === "") {
            Logger.error("BotApi::checkRequest() No token configured!");
            return true;
        }
        var token = headers["authorization"];
        if(typeof token !== "string") {
            Logger.error("BotApi::checkRequest() Invalid schedule API token: " + token);
            this.respondRequest(req, res, 403, this.getJsonError("Invalid authorization token"));
            return false;
        }
        token = token.replace("Bearer ", "");
        if(this.token !== token) {
            Logger.error("BotApi::checkRequest() Invalid schedule API token: " + token);
            this.respondRequest(req, res, 403, this.getJsonError("Invalid authorization token"));
            return false;
        }
        return true;
    }

    respondRequest(req, res, statusCode, body) {
        Logger.debug("BotApi::" + req.method.toLowerCase() + "() >> " + req.url + ": " + statusCode + ":", body);
        if(res.status) {
            res.status(statusCode);
        } else {
            res.statusCode = statusCode;
        }
        res.send(body);
    }

    getScheduledEvent(chatId, isGroup, eventId) {
        Logger.debug("BotApi::getScheduledEvent() chatId: " + chatId + " isGroup: " + isGroup + " eventId: " + eventId);
        if(!this.schedule || !this.schedule[eventId]) {
            return null;
        }
        var event = this.schedule[eventId];
        if(event["chat_id"] !== chatId || event["is_groupchat"] !== isGroup) {
            return null;
        }
        return event;
    }

    scheduleEvent(chatId, isGroup, userId, command, date, answers) {
        Logger.debug("BotApi::scheduleEvent() chatId: " + chatId + " isGroup: " + isGroup + " userId: " + userId
            + " command: " + command + " date: " + date + " answers:", answers);

        var event = {};
        event["chat_id"] = chatId;
        event["is_groupchat"] = isGroup;
        if(isGroup) {
            event["user_id"] = userId;
        }
        event["date"] = date;
        event["command"] = command;
        if(answers) {
            if(answers instanceof Answers) {
                event["answers"] = answers.toObject();
            } else {
                event["answers"] = answers;
            }
        }

        var eventId = UuidV1();
        event["id"] = eventId;

        this.addToSchedule(event);
        Logger.debug("BotApi::scheduleEvent() Scheduled eventId: " + eventId);
        return eventId;
    }

    scheduleEventInMs(chatId, isGroup, userId, command, ms, answers) {
        Logger.debug("BotApi::scheduleEventInMs() chatId: " + chatId + " isGroup: " + isGroup + " userId: " + userId
            + " command: " + command + " ms: " + ms + " answers:", answers);

        var date = DateTools.getUTCMoment(Date.now() + ms);
        this.scheduleEvent(chatId, isGroup, userId, command, date, answers);
    }

    scheduleRepeatedEvent(chatId, isGroup, userId, command, times, days, excludes, answers) {
        Logger.debug("BotApi::scheduleRepeatedEvent() chatId: " + chatId + " isGroup: " + isGroup + " userId: " + userId
            + " command: " + command + " times: " + times + " days: " + days + " excludes: " + excludes
            + " answers:", answers);

        var event = {};
        event["chat_id"] = chatId;
        event["is_groupchat"] = isGroup;
        if(isGroup) {
            event["user_id"] = userId;
        }
        event["times"] = times.sort();
        if(days && days.length > 0) {
            event["week_days"] = days.sort();
        }
        if(excludes && excludes.length > 0) {
            event["exclude_dates"] = excludes.sort();
        }
        event["command"] = command;
        if(answers) {
            if(answers instanceof Answers) {
                event["answers"] = answers.toObject();
            } else {
                event["answers"] = answers;
            }
        }

        var eventId = UuidV1();
        event["id"] = eventId;

        this.addToSchedule(event);
        Logger.debug("BotApi::scheduleRepeatedEvent() Scheduled repeated eventId: " + eventId);
        return eventId;
    }

    executeEvent(eventId) {
        Logger.debug("BotApi::executeEvent() eventId: " + eventId);
        var event = this.schedule[eventId];
        if(!event) {
            Logger.error("BotApi::executeEvent() No event found in schedule for id: " + eventId);
            return false;
        }
        var isGroup = event["is_groupchat"];
        var chatId = event["chat_id"];
        if(!chatId || chatId === "") {
            Logger.error("BotApi::executeEvent() Invalid chat id: " + chatId);
            return false;
        }
        var userId;
        if(isGroup) {
            userId = event["user_id"]
        } else {
            userId = chatId;
        }
        if(!userId || userId === "") {
            Logger.error("BotApi::executeEvent() Invalid user id: " + userId);
            return false;
        }
        var command = event["command"];
        if(!command || command === "") {
            Logger.error("BotApi::executeEvent() Invalid command: " + command);
            return false;
        }
        var answers = Answers.fromObject(event["answers"]);
        this.executeCommand(chatId, isGroup, userId, command, answers);
        var times = event["times"];
        if(times && times.length > 0) {
            // Repeated event, set next timer
            this.removeEventTimer(eventId);
            setTimeout(() => {
                this.setEventTimer(event);
            }, 1000);
        } else {
            // One time event, remove from schedule
            this.removeFromSchedule(eventId);
        }
        return true;
    }

    executeCommand(chatId, isGroup, userId, command, answers) {
        Logger.debug("BotApi::executeCommand() chatId: " + chatId + " isGroup: " + isGroup + " userId: " + userId
            + " command: " + command + " answers: ", answers);

        var callback = this.overrideCallbacks[command.toUpperCase()];
        if(callback) {
            Logger.debug("BotApi::executeCommand() Override callback: " + callback);
            callback(chatId, isGroup, userId, answers);
            return;
        }
        var user = new User(userId);
        user.is_groupchat = isGroup;
        var textMessage = new TextMessage(user);
        textMessage.room = chatId;
        textMessage.text = command;
        textMessage.answers = answers;
        this.robot.receive(textMessage);
    }

    getJsonError(errorText) {
        var error = {};
        error["error"] = errorText;
        return JSON.stringify(error);
    }

    calculateNextDate(event) {
        var date = event["date"];
        if(date && date !== "") {
            // One-time event
            return date;
        }
        var times = event["times"];
        if(!times || times.length == 0) {
            Logger.error("BotApi::calculateNextDate() Event has no valid time configuration", event);
            return null;
        }
        var now = new Date();
        var checkMoment = DateTools.getUTCMoment(now).utc();
        Logger.debug("BotApi::calculateNextDate() " + checkMoment.format("YYYY-MM-DDTHH:mm:ss") + "Z");
        if(this.checkDateForEvent(event, checkMoment)) {
            var year = checkMoment.year();
            var month = checkMoment.month();
            var day = checkMoment.date();
            for(var index in times) {
                var time = times[index];
                var timeSplit = time.split(":");
                var hours = timeSplit[0];
                var minutes = timeSplit[1];
                var seconds = timeSplit[2];
                var candidateDate = DateTools.getUTCMoment({y:year, M:month, d:day, h:hours, m:minutes, s:seconds}).utcOffset(0, true);
                Logger.debug("BotApi::calculateNextDate() Candidate date: " + candidateDate.format("YYYY-MM-DDTHH:mm:ss") + "Z");
                var diff = candidateDate.diff(checkMoment);
                // Check if time is in the future
                if(diff >= 0) {
                    return candidateDate.format("YYYY-MM-DDTHH:mm:ss") + "Z";
                }
            }
        }

        do {
            checkMoment = checkMoment.add(1, "day");
        } while(!this.checkDateForEvent(event, checkMoment));
        return checkMoment.format("YYYY-MM-DD") + "T" + times[0] + "Z";
    }

    checkDateForEvent(event, checkMoment) {
        var checkDate = checkMoment.format("YYYY-MM-DD");
        Logger.debug("BotApi::checkDateForEvent() " + checkDate);
        var excludes = event["exclude_dates"];
        if(excludes && excludes.length > 0) {
            for(var index in excludes) {
                var exclude = excludes[index];
                if(checkDate === exclude) {
                    Logger.debug("BotApi::checkDateForEvent() Excluded date: " + exclude);
                    return false;
                }
            }
        }
        var days = event["week_days"];
        if(days && days.length > 0) {
            var checkDay = checkMoment.isoWeekday();
            for(var index in days) {
                var day = days[index];
                if(checkDay === day) {
                    Logger.debug("BotApi::checkDateForEvent() Accepted day of the week: " + day);
                    return true;
                }
            }
            Logger.debug("BotApi::checkDateForEvent() Unaccepted day of the week: " + checkDay);
            return false;
        }
        return true;
    }

    setEventTimer(event) {
        var eventId = event["id"];
        if(!eventId || eventId === "") {
            Logger.error("BotApi::setEventTimer() Invalid event id: " + eventId);
            return false;
        }
        Logger.debug("BotApi::setEventTimer() eventId: " + eventId);
        if(this.timers[eventId]) {
            Logger.error("BotApi::setEventTimer() Timer already set for event: " + eventId);
            return false;
        }
        var dateString;
        var date = event["date"];
        if(date && date !== "") {
            dateString = date;
        } else {
            dateString = this.calculateNextDate(event);
        }
        if(!dateString || dateString === "") {
            Logger.error("BotApi::setEventTimer() Invalid dateString: " + dateString);
            return false;
        }
        Logger.debug("BotApi::setEventTimer() Setting event timer: eventId: " + eventId + " date: " + dateString);
        var date = DateTools.getUTCMoment(dateString);
        var ms = date - Date.now();
        if(ms <= 0) {
            Logger.debug("BotApi::setEventTimer() Event past due by " + (-ms) + " milliseconds, executing now: eventId: " + eventId);
            this.executeEvent(eventId);
            return false;
        }
        Logger.debug("BotApi::setEventTimer() Event timer set: eventId: " + eventId + " ms: " + ms);
        this.timers[eventId] = setTimeout(() => {
            this.executeEvent(eventId);
        }, ms);
        return true;
    }

    removeEventTimer(eventId) {
        Logger.debug("BotApi::removeEventTimer() eventId: " + eventId);
        var timer = this.timers[eventId];
        if(!timer) {
            Logger.error("BotApi::removeEventTimer() No timer set for event: " + eventId);
            return;
        }
        delete this.timers[eventId];
        clearTimeout(timer);
    }

    addToSchedule(event) {
        var eventId = event["id"];
        if(!eventId || eventId === "") {
            Logger.error("BotApi::addToSchedule() Invalid event id: " + eventId);
            return false;
        }
        if(this.schedule[eventId]) {
            Logger.error("BotApi::addToSchedule() Event already added to schedule: eventId: " + eventId + " event: ", event);
            return false;
        }
        Logger.debug("BotApi::addToSchedule() eventId: " + eventId + " event: ", event);
        this.schedule[eventId] = event;
        if(!this.setEventTimer(event)) {
            return true;
        }
        FileSystem.writeFileSync(this.scheduleFilePath, JSON.stringify(this.schedule), (error) => {
            if(error) {
                Logger.error("BotApi::addToSchedule() Unable to write schedule file", error);
            }
        });
        return true;
    }

    removeFromSchedule(eventId) {
        if(!this.schedule[eventId]) {
            Logger.error("BotApi::removeFromSchedule() Event not found in schedule: eventId: " + eventId);
            return false;
        }
        Logger.debug("BotApi::removeFromSchedule() eventId: " + eventId);
        this.removeEventTimer(eventId);
        delete this.schedule[eventId];
        FileSystem.writeFileSync(this.scheduleFilePath, JSON.stringify(this.schedule), (error) => {
            if(error) {
                Logger.error("Schedule:removeFromSchedule() Unable to write schedule file", error);
            }
        });
        return true;
    }

    setOverrideCallback(trigger, callback) {
        Logger.debug("BotApi::setOverrideCallback() trigger: " + trigger);
        this.overrideCallbacks[trigger.toUpperCase()] = callback;
    }
};

module.exports = BotApi;