Utils = {};

/**
 * Covert a string to camel case notation.
 *
 * @param {string} value
 */
Utils.toCamelCase = function toCamelCase (value) {
    "use strict";
    var words = value.replace(/-/g, ' ').replace(/_/g, ' ').split(' ');
    return _.map(words, function (word, index) {
        word = word.toLowerCase();
        if (index > 0) {
            word = word.charAt(0).toUpperCase() + word.substr(1);
        }
        return word;
    }).join('');
};

Utils.parseInt10 = function parseInt10 (x) {
    "use strict";
    return parseInt(x, 10);
};

Utils.yesOrNo = function yesOrNo (x) {
    "use strict";
    return x === 'yes';
};

Utils.propIsTruthy = function (name) {
    return function propIsTruthy(x) {
        return !!x[name];
    };
};

/**
 * Return maximal posible value of the given property among items provided.
 *
 * @param {string} propName
 * @param {array} amongItems
 * @param {*} defaultValue
 */
Utils.findMaxPropValue = function (propName, amongItems, defaultValue) {
    "use strict";
    var value = null;
    _.each(amongItems, function (item) {
        if (item[propName] === undefined) {
            return;
        }
        if (value === null || item[propName] > value) {
            value = item[propName];
        }
    });
    return value === null ? defaultValue : value;
}
