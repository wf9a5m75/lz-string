"use strict";
var exports = {};exports.__esModule = true;
// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/testing.html
//
// LZ-based compression algorithm, version 1.4.4
var f = String.fromCharCode;
var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
var baseReverseDic = {};
var getBaseValue = function (alphabet, character) {
    if (!baseReverseDic[alphabet]) {
        baseReverseDic[alphabet] = {};
        for (var i = 0; i < alphabet.length; i++) {
            baseReverseDic[alphabet][alphabet.charAt(i)] = i;
        }
    }
    return baseReverseDic[alphabet][character];
};
exports.compressToBase64 = function (input) {
    if (input === null || input === undefined) {
        return "";
    }
    var res = _compress(input, 6, function (a) {
        return keyStrBase64.charAt(a);
    });
    switch (res.length % 4) { // To produce valid Base64
        default: // When could this happen ?
        case 0: return res;
        case 1: return res + "===";
        case 2: return res + "==";
        case 3: return res + "=";
    }
};
exports.decompressFromBase64 = function (input) {
    if (input === null || input === undefined) {
        return "";
    }
    if (input === "") {
        return null;
    }
    return _decompress(input.length, 32, function (index) {
        return getBaseValue(keyStrBase64, input.charAt(index));
    });
};
exports.compressToUTF16 = function (input) {
    if (input === null || input === undefined) {
        return "";
    }
    return _compress(input, 15, function (a) {
        return f(a + 32);
    }) + " ";
};
exports.decompressFromUTF16 = function (compressed) {
    if (compressed === null || compressed === undefined) {
        return "";
    }
    if (compressed === "") {
        return null;
    }
    return _decompress(compressed.length, 16384, function (index) {
        return compressed.charCodeAt(index) - 32;
    });
};
/**
 * compress into uint8array (UCS-2 big endian format)
 */
exports.compressToUint8Array = function (uncompressed) {
    var compressed = exports.compress(uncompressed);
    var buf = new Uint8Array(compressed.length * 2); // 2 bytes per character
    var current_value;
    var TotalLen = compressed.length;
    for (var i = 0; i < TotalLen; i++) {
        current_value = compressed.charCodeAt(i);
        buf[i * 2] = current_value >>> 8;
        buf[i * 2 + 1] = current_value % 256;
    }
    return buf;
};
/**
 * decompress from uint8array (UCS-2 big endian format)
 */
exports.decompressFromUint8Array = function (compressed) {
    if (compressed === null || compressed === undefined) {
        return exports.decompress(null);
    }
    else {
        var buf = new Array(compressed.length / 2); // 2 bytes per character
        var TotalLen = compressed.length;
        for (var i = 0; i < TotalLen; i++) {
            buf[i] = compressed[i * 2] * 256 + compressed[i * 2 + 1];
        }
        var result_1 = [];
        buf.forEach(function (c) {
            result_1.push(f(c));
        });
        return exports.decompress(result_1.join(""));
    }
};
/**
 * compress into a string that is already URI encoded
 */
exports.compressToEncodedURIComponent = function (input) {
    if (input === null || input === undefined) {
        return "";
    }
    return _compress(input, 6, function (a) {
        return keyStrUriSafe.charAt(a);
    });
};
/**
 * decompress from an output of compressToEncodedURIComponent
 */
exports.decompressFromEncodedURIComponent = function (input) {
    if (input === null || input === undefined) {
        return "";
    }
    if (input === "") {
        return null;
    }
    input = input.replace(/ /g, "+");
    return _decompress(input.length, 32, function (index) {
        return getBaseValue(keyStrUriSafe, input.charAt(index));
    });
};
exports.compress = function (uncompressed) {
    return _compress(uncompressed, 16, function (a) {
        return f(a);
    });
};
/**
 * Provide similar ES6-Map class
 * @hidden
 */
var BaseMap = /** @class */ (function () {
    function BaseMap() {
        this.dict = {};
    }
    BaseMap.prototype["delete"] = function (key) {
        if (key in this.dict) {
            delete this.dict[key];
            return true;
        }
        else {
            return false;
        }
    };
    BaseMap.prototype.get = function (key) {
        return this.dict[key];
    };
    BaseMap.prototype.has = function (key) {
        return key in this.dict;
    };
    BaseMap.prototype.set = function (key, value) {
        this.dict[key] = value;
    };
    return BaseMap;
}());
var getMapOrObject = function () {
    return (typeof Map === "undefined") ? new BaseMap() : new Map();
};
var _compress = function (uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed === null || uncompressed === undefined) {
        return "";
    }
    var i;
    var value;
    var context_dictionary = getMapOrObject();
    var context_dictionaryToCreate = getMapOrObject();
    var context_c;
    var context_wc;
    var context_w = "";
    var context_enlargeIn = 2; // Compensate for the first entry which should not count
    var context_dictSize = 3;
    var context_numBits = 2;
    var context_data = [];
    var context_data_val = 0;
    var context_data_position = 0;
    var ii;
    for (ii = 0; ii < uncompressed.length; ii += 1) {
        context_c = uncompressed.charAt(ii);
        if (!(context_dictionary.has(context_c))) {
            context_dictionary.set(context_c, context_dictSize++);
            context_dictionaryToCreate.set(context_c, true);
        }
        context_wc = context_w + context_c;
        if (context_dictionary.has(context_wc)) {
            context_w = context_wc;
        }
        else {
            if (context_dictionaryToCreate.has(context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        }
                        else {
                            context_data_position++;
                        }
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 8; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        }
                        else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                }
                else {
                    value = 1;
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | value;
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        }
                        else {
                            context_data_position++;
                        }
                        value = 0;
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 16; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        }
                        else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn === 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                }
                context_dictionaryToCreate["delete"](context_w);
            }
            else {
                value = context_dictionary.get(context_w);
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    }
                    else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
            }
            context_enlargeIn--;
            if (context_enlargeIn === 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
            }
            // Add wc to the dictionary.
            context_dictionary.set(context_wc, context_dictSize++);
            context_w = String(context_c);
        }
    }
    // Output the code for w.
    if (context_w !== "") {
        if (context_dictionaryToCreate.has(context_w)) {
            if (context_w.charCodeAt(0) < 256) {
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    }
                    else {
                        context_data_position++;
                    }
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 8; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    }
                    else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
            }
            else {
                value = 1;
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | value;
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    }
                    else {
                        context_data_position++;
                    }
                    value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 16; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    }
                    else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
            }
            context_enlargeIn--;
            if (context_enlargeIn === 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
            }
            context_dictionaryToCreate["delete"](context_w);
        }
        else {
            value = context_dictionary.get(context_w);
            for (i = 0; i < context_numBits; i++) {
                context_data_val = (context_data_val << 1) | (value & 1);
                if (context_data_position === bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                }
                else {
                    context_data_position++;
                }
                value = value >> 1;
            }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
        }
    }
    // Mark the end of the stream
    value = 2;
    for (i = 0; i < context_numBits; i++) {
        context_data_val = (context_data_val << 1) | (value & 1);
        if (context_data_position === bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
        }
        else {
            context_data_position++;
        }
        value = value >> 1;
    }
    // Flush the last char
    while (true) {
        context_data_val = (context_data_val << 1);
        if (context_data_position === bitsPerChar - 1) {
            context_data.push(getCharFromInt(context_data_val));
            break;
        }
        else {
            context_data_position++;
        }
    }
    return context_data.join("");
};
exports.decompress = function (compressed) {
    if (compressed === null || compressed === undefined) {
        return "";
    }
    if (compressed === "") {
        return null;
    }
    return _decompress(compressed.length, 32768, function (index) {
        return compressed.charCodeAt(index);
    });
};
var _decompress = function (length, resetValue, getNextValue) {
    var dictionary = [];
    var next;
    var enlargeIn = 4;
    var dictSize = 4;
    var numBits = 3;
    var entry = "";
    var result = [];
    var i;
    var w;
    var bits;
    var resb;
    var maxpower;
    var power;
    var c;
    var cN;
    var data = {
        index: 1,
        position: resetValue,
        val: getNextValue(0)
    };
    for (i = 0; i < 3; i += 1) {
        dictionary[i] = i;
    }
    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
    }
    switch (next = bits) {
        case 0:
            bits = 0;
            maxpower = Math.pow(2, 8);
            power = 1;
            while (power !== maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position === 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = f(bits);
            break;
        case 1:
            bits = 0;
            maxpower = Math.pow(2, 16);
            power = 1;
            while (power !== maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position === 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = f(bits);
            break;
        case 2:
            return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
        if (data.index > length) {
            return "";
        }
        bits = 0;
        maxpower = Math.pow(2, numBits);
        power = 1;
        while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
        }
        switch (cN = bits) {
            case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                cN = dictSize - 1;
                enlargeIn--;
                break;
            case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                cN = dictSize - 1;
                enlargeIn--;
                break;
            case 2:
                return result.join("");
        }
        if (enlargeIn === 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }
        if (dictionary[cN]) {
            entry = dictionary[cN];
        }
        else {
            if (cN === dictSize) {
                entry = w + w.charAt(0);
            }
            else {
                return null;
            }
        }
        result.push(entry);
        // Add w + entry[0] to the dictionary.
        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;
        w = entry;
        if (enlargeIn === 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }
    }
};
var LZString = {
    compress: exports.compress,
    compressToBase64: exports.compressToBase64,
    compressToEncodedURIComponent: exports.compressToEncodedURIComponent,
    compressToUTF16: exports.compressToUTF16,
    compressToUint8Array: exports.compressToUint8Array,
    decompress: exports.decompress,
    decompressFromBase64: exports.decompressFromBase64,
    decompressFromEncodedURIComponent: exports.decompressFromEncodedURIComponent,
    decompressFromUTF16: exports.decompressFromUTF16,
    decompressFromUint8Array: exports.decompressFromUint8Array
};
exports.LZString = LZString;
if (typeof define === "function" && define.amd) {
    // AMD-js
    define(function () {
        return LZString;
    });
}
else if (typeof module !== "undefined" && module != null) {
    module.exports = LZString;
}
else if (typeof angular !== "undefined") {
    // Angular.js
    angular.module("LZString", [])
        .factory("LZString", function () {
        return LZString;
    });
}
