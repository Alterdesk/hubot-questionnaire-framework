class StringTools {

    static escapeHtml(string) {
        if(typeof string !== "string" || string.length === 0) {
            return string;
        }
        string = string.replace(/&/g, "&amp;");
        string = string.replace(/</g, "&lt;");
        string = string.replace(/>/g, "&gt;");
        string = string.replace(/"/g, "&quot;");
        string = string.replace(/'/g, "&#039;");
        return string;
    }

    static escapeRegex(string) {
        if(typeof string !== "string" || string == "") {
            return string;
        }
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    static replaceAll(string, search, replace) {
        if(typeof string !== "string" || string == "" || search == null || replace == null) {
            return string;
        }
        return string.replace(new RegExp(StringTools.escapeRegex(search), 'g'), replace);
    }

    static removeDiacritics(string) {
        if(typeof string !== "string" || string.length === 0) {
            return string;
        }
        string = string.replace(/[àáâãäåāăąÀÁÂÃÄÅĀĂĄ]/gi, "a");
        string = string.replace(/[çćĉċčÇĆĈĊČ]/gi, "c");
        string = string.replace(/[ďđĎĐ]/gi, "d");
        string = string.replace(/[èéëêēĕėęěÈÉËÊĒĔĖĘĚ]/gi, "e");
        string = string.replace(/[ĝğġģĜĞĠĢ]/gi, "g");
        string = string.replace(/[ĥħĤĦ]/gi, "h");
        string = string.replace(/[ìíîïĩīĭįıÌÍÎÏĨĪĬĮİ]/gi, "i");
        string = string.replace(/[ĵĴ]/gi, "j");
        string = string.replace(/[ķĶ]/gi, "k");
        string = string.replace(/[ĺļľŀłĹĻĽĿŁ]/gi, "l");
        string = string.replace(/[ñńņňŉŋÑŃŅŇŊ]/gi, "n");
        string = string.replace(/[òóôõöøōŏőÒÓÔÕÖØŌŎŐ]/gi, "o");
        string = string.replace(/[ŕŗřŔŖŘ]/gi, "r");
        string = string.replace(/[śŝşšŚŜŞŠ]/gi, "s");
        string = string.replace(/[ţťŧŢŤŦ]/gi, "t");
        string = string.replace(/[ùúûüũūŭůűųÙÚÛÜŨŪŬŮŰŲ]/gi, "u");
        string = string.replace(/[ŵŴ]/gi, "w");
        string = string.replace(/[ýÿŷÝŸŶ]/gi, "y");
        string = string.replace(/[źżžŹŻŽ]/gi, "z");

        return string;
    }

    static safeName(string, maxLength, lowerCase, collapseBlocked) {
        if(typeof string !== "string" || string.length === 0) {
            return string;
        }
        string = StringTools.removeDiacritics(string);

        string = string.replace(/★/gi, "1");
        string = string.replace(/☆/gi, "0");

        if(collapseBlocked) {
            string = string.replace(/[\W]+/gi, "");
        } else {
            string = string.replace(/[\W]+/gi, "_");
        }

        if(maxLength > 0 && string.length > maxLength) {
            string = string.substring(0, maxLength);
        }
        if(lowerCase) {
            string = string.toLowerCase();
        }

        return string;
    }

    static truncateEnd(string, maxLength) {
        if(typeof string !== "string" || string.length <= maxLength) {
            return string;
        }
        return string.substring(0, maxLength);
    }

    static truncateStart(string, maxLength) {
        if(typeof string !== "string" || string.length <= maxLength) {
            return string;
        }
        return string.substring(string.length - maxLength);
    }

    // String to lowercase
    static lowercase(string) {
        if(typeof string !== "string" || string == "") {
            return string;
        }
        return string.toLowerCase();
    }

    // String to uppercase
    static uppercase(string) {
        if(typeof string !== "string" || string == "") {
            return string;
        }
        return string.toUpperCase();
    }

    // Capitalize first letter in the string
    static capitalizeFirstLetter(string) {
        if(typeof string !== "string" || string == "") {
            return string;
        }
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Only capitalize last word in the name: "de Boer"
    static capitalizeLastName(string) {
        if(typeof string !== "string" || string == "") {
            return string;
        }
        var words = string.split(" ");
        var result = "";
        for(let index in words) {
            if(index > 0) {
                result += " ";
            }
            var word = words[index];
            var nextIndex = parseInt(index) + 1;
            if(nextIndex < words.length) {
                result += word;
            } else {
                result += StringTools.capitalizeFirstLetter(word);
            }
        }
        return result;
    }

    static mentionToUserString(mention, mentionedAllText) {
        if(mention["id"].toUpperCase() === "@ALL") {
            return mentionedAllText || "All members";
        }
        var firstName = mention["first_name"];
        var lastName = mention["last_name"];
        var companyName = mention["company_name"];
        var user = "";
        if(firstName && lastName) {
            user += firstName + " " + lastName;
        } else if(firstName) {
            user += firstName;
        } else if(lastName) {
            user += lastName;
        }
        if(user.length === 0) {
            user += mention["id"];
        }
        if(companyName && companyName.length > 0) {
            user += " (" + companyName + ")";
        }
        return user;
    }

}

module.exports = StringTools;