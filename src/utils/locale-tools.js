const USE_LOCALE = process.env.HUBOT_QUESTIONNAIRE_USE_LOCALE || process.env.USE_LOCALE || "en-US";

class LocaleTools {

    static getLocale() {
        return USE_LOCALE;
    }

    static getPhoneCountryCode() {
        if(USE_LOCALE === "nl-NL") {
            return "+31";
        }
    }

}

module.exports = LocaleTools;
