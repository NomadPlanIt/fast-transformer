const _ = require('lodash');

/**
 *  This will go through and remove all of the properties that match the predicate.
 *
 * @method setValue
 * @param {Object} collection The object.
 * @param {function} predicate The function to use to determine what properties to remove.
 * @param {Object} thisArg What to use for this when executing the predicate.
 * @return {Object}
 */
function omitDeep(collection, predicate, thisArg, ...remainingArgs) {
    if (_.isFunction(predicate)) {
        predicate = _.iteratee(predicate, thisArg);
    } else {
        let keys = _.flatten(_.tail(remainingArgs));
        predicate = function (key) {
            return _.includes(keys, key);
        };
    }

    return _.transform(collection, function (memo, val, key) {
        let include = !predicate(val);
        if (include && _.isObject(val)) {
            val = omitDeep(val, predicate, thisArg);
            include = !_.isEmpty(val);
        }
        if (include) {
            if (_.isArray(collection)) {
                memo.push(val);
            } else {
                memo[key] = val;
            }
        }
    });
}

module.exports.omitDeep = omitDeep;
