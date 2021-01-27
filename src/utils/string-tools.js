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
        if(typeof string !== "string" || string === "") {
            return string;
        }
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    static replaceAll(string, search, replace) {
        if(typeof string !== "string" || string === "" || search == null || replace == null) {
            return string;
        }
        return string.replace(new RegExp(StringTools.escapeRegex(search), 'g'), replace);
    }

    static removeDiacritics(string) {
        if(typeof string !== "string" || string.length === 0) {
            return string;
        }
        string = string.replace(/[àáâãäåāăą]/g, "a");
        string = string.replace(/[ÀÁÂÃÄÅĀĂĄ]/g, "A");
        string = string.replace(/[çćĉċč]/g, "c");
        string = string.replace(/[ÇĆĈĊČ]/g, "C");
        string = string.replace(/[ďđ]/g, "d");
        string = string.replace(/[ĎĐ]/g, "D");
        string = string.replace(/[èéëêēĕėęě]/g, "e");
        string = string.replace(/[ÈÉËÊĒĔĖĘĚ]/g, "E");
        string = string.replace(/[ĝğġģ]/g, "g");
        string = string.replace(/[ĜĞĠĢ]/g, "G");
        string = string.replace(/[ĥħ]/g, "h");
        string = string.replace(/[ĤĦ]/g, "H");
        string = string.replace(/[ìíîïĩīĭįı]/g, "i");
        string = string.replace(/[ÌÍÎÏĨĪĬĮİ]/g, "I");
        string = string.replace(/[ĵ]/g, "j");
        string = string.replace(/[Ĵ]/g, "J");
        string = string.replace(/[ķ]/g, "k");
        string = string.replace(/[Ķ]/g, "K");
        string = string.replace(/[ĺļľŀł]/g, "l");
        string = string.replace(/[ĹĻĽĿŁ]/g, "L");
        string = string.replace(/[ñńņňŉŋ]/g, "n");
        string = string.replace(/[ÑŃŅŇŊ]/g, "N");
        string = string.replace(/[òóôõöøōŏő]/g, "o");
        string = string.replace(/[ÒÓÔÕÖØŌŎŐ]/g, "O");
        string = string.replace(/[ŕŗř]/g, "r");
        string = string.replace(/[ŔŖŘ]/g, "R");
        string = string.replace(/[śŝşš]/g, "s");
        string = string.replace(/[ŚŜŞŠ]/g, "S");
        string = string.replace(/[ţťŧ]/g, "t");
        string = string.replace(/[ŢŤŦ]/g, "T");
        string = string.replace(/[ùúûüũūŭůűų]/g, "u");
        string = string.replace(/[ÙÚÛÜŨŪŬŮŰŲ]/g, "U");
        string = string.replace(/[ŵ]/g, "w");
        string = string.replace(/[Ŵ]/g, "W");
        string = string.replace(/[ýÿŷ]/g, "y");
        string = string.replace(/[ÝŸŶ]/g, "Y");
        string = string.replace(/[źżž]/g, "z");
        string = string.replace(/[ŹŻŽ]/g, "Z");

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
        if(typeof string !== "string" || maxLength < 1 || string.length <= maxLength) {
            return string;
        }
        return string.substring(0, maxLength);
    }

    static truncateStart(string, maxLength) {
        if(typeof string !== "string" || maxLength < 1 || string.length <= maxLength) {
            return string;
        }
        return string.substring(string.length - maxLength);
    }

    // String to lowercase
    static lowercase(string) {
        if(typeof string !== "string" || string === "") {
            return string;
        }
        return string.toLowerCase();
    }

    // String to uppercase
    static uppercase(string) {
        if(typeof string !== "string" || string === "") {
            return string;
        }
        return string.toUpperCase();
    }

    // Capitalize first letter in the string
    static capitalizeFirstLetter(string) {
        if(typeof string !== "string" || string === "") {
            return string;
        }
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Only capitalize last word in the name: "de Boer"
    static capitalizeLastName(string) {
        if(typeof string !== "string" || string === "") {
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

    static safeFilename(filename) {
        if(typeof filename !== "string" || filename.length === 0) {
            return filename;
        }
        var parts = filename.split(".");
        var maxLength = 255;
        var extension;
        if(parts.length > 1) {
            extension = "." + parts[(parts.length - 1)];
            maxLength = 255 - extension.length;
            filename = filename.substring(0, (filename.length - extension.length));
        }
        filename = StringTools.safeName(filename, maxLength, false, false);
        if(extension) {
            filename = filename + extension;
        }
        return filename;
    }

}

module.exports = StringTools;
