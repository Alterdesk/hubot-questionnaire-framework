class RegexTools {

    // Get the regular expression to detect non empty characters
    static getNonEmptyRegex() {
        return new RegExp(/\S+/, 'gi');
    }
    
    // Get the regular expression to detect text
    static getTextRegex() {
        return new RegExp(/\w+/, 'gi');
    }
    
    // Get the regular expression to detect a number
    static getNumberRegex() {
        return new RegExp(/\d+/, 'g');
    }

    // Get the regular expression to detect only numbers
    static getNumberOnlyRegex() {
        return new RegExp(/^\d+$/, 'g');
    }
    
    // Get the regular expression to detect a phone number
    static getPhoneRegex() {
    //    return new RegExp(/^\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d| 2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]| 4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/, 'g');
        return new RegExp(/^[ \n\r\t]*(0|\+[1-9]{2,3})[0-9]{9}[ \n\r\t]*$/, 'g');
    }
    
    // Get the regular expression to detect an email address
    static getEmailRegex() {
        return new RegExp(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/, 'gi');
    }
    
    // Get the regular expression to detect mentioned tags
    static getMentionedRegex() {
        return new RegExp(/\[mention=(([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})|(@all))\]/, 'gi');
    }
    
    // Get the regular expression to detect mentioned user tag
    static getMentionedUserRegex() {
        return new RegExp(/\[mention=[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}\]/, 'gi');
    }
    
    // Get the regular expression to detect the mentioned all tag
    static getMentionedAllRegex() {
        return new RegExp(/\[mention=@all\]/, 'g');
    }
    
    static getOptionRegex(option) {
        return new RegExp("^[ \\n\\r\\t]*" + option + "[ \\n\\r\\t]*$", "i");
    }
    
    static getStartCommandRegex(command) {
        return new RegExp("^[ \\n\\r\\t]*(\\[mention=(([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})|(@all))\\][ \\n\\r\\t]*){0,1}" + command + "[ \\n\\r\\t]*$", 'gi')
    }
    
    static getUuidRegex() {
        return new RegExp(/[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/, 'gi');
    }
    
    static getBase64Regex() {
        return new RegExp(/^(?:[a-z0-9+\/]{4})*(?:[a-z0-9+\/]{2}==|[a-z0-9+\/]{3}=)?$/, 'gi');
    }
    
    static getFilePathRegex() {
        return new RegExp(/^(\/tmp\/messenger-pdfs\/|\/tmp\/messenger-downloads\/|\/usr\/local\/share\/bots\/resources\/)[0-9a-zA-Z\W\_\-\/ ]{1,}(\.[0-9a-zA-Z]{1,}){0,}$/, 'g');
    }

}

module.exports = RegexTools;