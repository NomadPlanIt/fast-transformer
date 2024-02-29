const _ = require('lodash');

/**
 *  Transforms src into dst using the schema to map the properties.
 *  If a schema is not given then the src will be merged into dst without mappings.
 *
 * @method transform
 * @param {Object} src The source object from where the values will be retrieved.
 * @param {Object} dst The destination object where the values will be set.
 * @param {Object} schema The schema definition that will be used to map src to dst.
 * @param {Object} [request] The request object of the current API request.
 * @return {Object}
 */
module.exports.transform = function (src, dst, schema, request) {
  let compiledSchema = module.exports.compile(schema);
  if (_.isUndefined(src)) {
    return null;
  }
  return compiledSchema(src, dst, request);
};

// This will be internal functions exposed for testing
module.exports.internal = {};


/**
 *  Returns a function that can be used to set a value depending on the complexity of the field name.
 *
 * @method getSetValue
 * @param {string} dstType Is the destination path 'complex', 'array', 'simple'?
 * @param {string} dstPath The destination path.
 * @return {function}
 */
function getSetValue(dstType, dstPath) {
  switch (dstType) {
    case 'array':
      return function setValue1(src, dst, newValue) {
        if (_.isUndefined(newValue)) {
          return;
        }
        // Don't push empty objects
        if (!(_.isObject(newValue) && _.isEmpty(newValue))) {
          if (!_.isArray(newValue)) {
            newValue = [newValue];
          }
          // Combine the old and new arrays
          let oldValue = _.get(dst, dstPath, []);
          newValue = [...newValue, ...oldValue];
          _.set(dst, dstPath, newValue);
        }
      };
    case 'complex':
      return function setValue2(src, dst, newValue) {
        if (_.isUndefined(newValue)) {
          return;
        }
        _.set(dst, dstPath, newValue);
      };
    default:
      return function setValue3(src, dst, newValue) {
        if (_.isUndefined(newValue)) {
          return;
        }
        dst[dstPath] = newValue;
      };
  }
}

module.exports.internal._getSetValue = getSetValue;


/**
 *  Returns a function that can be used to transform using a function.
 *
 * @method getFunctionTransform
 * @param {string} dstType Is the destination path 'complex', 'array', 'simple'?
 * @param {string} dstPath The destination path.
 * @param {function} func The function used to perform the transformation.
 * @return {function}
 */
function getFunctionTransform(dstType, dstPath, func) {
  let setValue = getSetValue(dstType, dstPath);
  // A function can be passed in for the value
  // Execute the function passing src and dst as the parameters
  return function (src, dst, data, parent, top) {
    let newValue = func(src, dst, data, parent, top);
    setValue(src, dst, newValue);
  };
}

module.exports.internal._getFunctionTransform = getFunctionTransform;


/**
 *  Returns a function that can be used to retrieve the source value.
 *
 * @method getGetSourceValue
 * @param {string} srcType Is the source type 'complex', 'simple', or 'function'?
 * @param {string|function} srcPath The source path or a function to use to retrieve the source value.
 * @param {string} dstValueType The type the value should be coerced into
 * @param {any} [defaultValue] The default value to use when the source field does not exist.
 * @return {function}
 */
function getGetSourceValue(srcType, srcPath, dstValueType, defaultValue) {
  let getValue;

  if (srcType === 'literal') {
    return function getLiteralValue() {
      return srcPath;
    };
  }

  if (_.isString(srcPath)) {
    let fixPaths = (paths) => {
      paths = paths.splice(1);
      return paths.join('.');
    };

    let srcPaths = srcPath.split('.');
    if (srcPaths[0] === '$parent') {
      srcType = 'function';
      if (srcPaths.length === 1) {
        srcPath = (src, dst, data, parent) => {
          return parent;
        };
      } else {
        let newPath = fixPaths(srcPaths);
        srcPath = (src, dst, data, parent) => {
          return _.get(parent, newPath, defaultValue);
        };
      }
    } else if (srcPaths[0] === '$self') {
      srcType = 'function';
      if (srcPaths.length === 1) {
        srcPath = (src) => {
          return src;
        };
      } else {
        let newPath = fixPaths(srcPaths);
        srcPath = (src) => {
          return _.get(src, newPath, defaultValue);
        };
      }
    } else if (srcPaths[0] === '$top') {
      srcType = 'function';
      if (srcPaths.length === 1) {
        srcPath = (src, dst, data, parent, top) => {
          return top;
        };
      } else {
        let newPath = fixPaths(srcPaths);
        srcPath = (src, dst, data, parent, top) => {
          return _.get(top, newPath, defaultValue);
        };
      }
    }
  }

  switch (srcType) {
    case 'function':
      getValue = function getGetSourceValue1(src, dst, data, parent, top) {
        let newValue = srcPath(src, dst, data, parent, top);
        newValue = coerceValue(newValue, dstValueType);
        return newValue;
      };
      break;

    case 'simple':
      getValue = function getGetSourceValue2(src) {
        let newValue = src[srcPath];
        newValue = coerceValue(newValue, dstValueType);
        return newValue;
      };
      break;

    default:
      getValue = function getGetSourceValue1(src) {
        let newValue = _.get(src, srcPath, defaultValue);
        newValue = coerceValue(newValue, dstValueType);
        return newValue;
      };
      break;
  }
  return getValue;
}

module.exports.internal._getGetSourceValue = getGetSourceValue;

/**
 *  Returns a function that can be used to transform using a function.
 *
 * @method getFilterTransform
 * @param {string} srcType Is the source type 'complex', 'simple', or 'function'?
 * @param {string|function} srcPath The source path or a function to use to retrieve the source value.
 * @param {string} dstType Is the destination type 'complex', 'simple', or 'array'?
 * @param {string} dstPath The destination path.
 * @param {function} func The function used to perform the transformation.
 * @param {string} dstValueType The type the value should be coerced into
 * @param {any} [defaultValue] The default value to use when the source field does not exist.
 * @return {function}
 */
function getFilterTransform(srcType, srcPath, dstType, dstPath, func, dstValueType, defaultValue) {
  let getValue = getGetSourceValue(srcType, srcPath, dstValueType, defaultValue);
  let setValue = getSetValue(dstType, dstPath);
  return function filterTransform(src, dst, data, parent, top) {
    let newValue = getValue.apply(src, [src, dst, data, parent, top]);
    setValue(src, dst, func.apply(src, [newValue, src, dst, data, parent, top]));
  };
}

module.exports.internal._getFilterTransform = getFilterTransform;


/**
 *  Returns a function that can be used to remove values during a transform.
 *
 * @method getRemovalTransform
 * @param {string} dstType Is the destination type 'complex', 'simple', or 'array'?
 * @param {string} dstPath The destination path.
 * @param {function} [value] The removal value.
 * @return {function}
 */
function getRemovalTransform(dstType, dstPath, value) {
  // A function can be passed in for the value
  // Execute the function passing src and dst as the parameters
  if (dstType === 'simple') {
    return function (src, dst) {
      dst[dstPath] = value;
    };
  }
  return function (src, dst) {
    if (_.has(dst, dstPath)) {
      _.set(dst, dstPath, value);
    }
  };
}

module.exports.internal._getRemovalTransform = getRemovalTransform;


/**
 *  Returns a function that can be used to simply map one value to another.
 *
 * @method getSetValueTransform
 * @param {string} srcType Is the source type 'complex', 'simple', 'literal', or 'function'?
 * @param {string|function} srcPath The source path, literal value, or a function to use to retrieve the source value.
 * @param {string} dstType Is the destination type 'complex', 'simple', or 'array'?
 * @param {string} dstPath The destination path.
 * @param {string} dstValueType The type the value should be coerced into
 * @param {*} [defaultValue] The default value to use when the source field does not exist.
 * @return {function}
 */
function getSetValueTransform(srcType, srcPath, dstType, dstPath, dstValueType, defaultValue) {
  let getDefaultValue = (val) => {
    // If the value is null or empty for objects or arrays then set to default value.
    if (!(val || val === 0) || (_.isObject(val) && _.isEmpty(val))) {
      return defaultValue;
    }
    return val;
  };
  let getSourceValue = getGetSourceValue(srcType, srcPath, dstValueType);
  let getValue;
  if (defaultValue !== undefined) {
    getValue = (src, dst, data, parent, top) => getDefaultValue(getSourceValue(src, dst, data, parent, top));
  } else {
    getValue = getSourceValue;
  }

  return getFunctionTransform(dstType, dstPath, getValue);
}

module.exports.internal._getSetValueTransform = getSetValueTransform;

function coerceValue(value, valueType) {
  if (value === null || value === undefined) {
    return value;
  }
  switch (valueType) {
    case 'number':
      return Number(value);

    case 'string':
      return String(value);
  }

  return value;
}

module.exports.internal._coerceValue = coerceValue;

const compiledSchemas = new Map();
/**
 *  Compiles the given schema into a transformation object.
 *  If the given schema has already been compiled then the transformation object for previously compiled schema will be returned.
 *
 * @method transform
 * @param {Object} schema The schema definition to compile.
 * @param {Object} [key] The key to use for storing the compiled schema.
 * @return {Function}
 */
module.exports.compile = function (schema, key) {
  let fieldTransformations = [];
  let onFinishedTransformation;
  if (schema === null) {
    // If we don't have a schema then just merge src into dst
    return function (src, dst) {
      dst = dst || {};
      _.merge(dst, src);
      return dst;
    };
  }

  // Check to see if we have already compiled the schema and return the transformation object if we have
  key = key || schema._name || schema;
  if (compiledSchemas.has(key)) {
    return compiledSchemas.get(key);
  }

  // iterate over each property mapping and build the transformation functions
  _.forOwn(schema,
    /**
     * @function processSchemaField
     * @param {Object | function} value The schema definition to compile.
     * @param {boolean} [value.remove] A flag indicating if the value should be removed or not.
     * @param {string|function} [value.srcPath] The path of the data in the source object. Can be a function that is executed to get the source value.
     * @param {string} [value.type] The type the value should be coerced into. Valid values are number or string.
     * @param {any} [value.defaultValue] The default value to use when the source path is not found.
     * @param {function} [value.filter] A filter function to run when transforming the object.
     * @param {function} [value.customFilter] DEPRECATED: A filter function to run when transforming the object, should use filter instead.
     * @param {Array} [value.items] A list of objects to process.
     * @param {string|Object} [value.schema] A schema that can be used to process an embedded object or an array of embedded objects.
     * @param {string} key The field name.
     */
    function processSchemaField(value, key) {
      // _name is a special key, don't process it
      if (key === '_name') {
        return;
      }

      // Check to see if we have a special function that should be run when the transformation has finished
      if (key === '_onFinished') {
        if (_.isFunction(value)) {
          onFinishedTransformation = function (src, dst, data, parent, top) {
            value(src, dst, data, parent, top);
          };
        }
        return;
      }

      // The type that the value should be coerced into
      let dstValueType;
      // value is the source mapping or a custom filter
      // key is the destination mapping
      let defaultValue;
      // Default the source path to the same as the destination
      let dstPath = key; // The destination path

      // Check to see if we should be inserting into an array
      let dstType;
      let isDstArray = !!dstPath.match(/\[\d*]$/);
      if (isDstArray) {
        dstPath = dstPath.substr(0, dstPath.indexOf('['));
        dstType = 'array';
      } else {
        dstType = !!dstPath.match(/[.\[]/) ? 'complex' : 'simple';
      }
      let srcPath = dstPath; // The source path
      // A complex field means we are accessing a nested object and the value can't be simply assigned
      let srcType = dstType; // We will default to this and check the source path later

      // Do we have a value? If we don't have a value then source and destination have the same path
      if (value !== null && value !== undefined) {
        if (_.isFunction(value)) {
          // A function can be passed in for the value
          fieldTransformations.push(getFunctionTransform(dstType, dstPath, value));
          return;
        } else if (_.isString(value)) {
          // Check for literal value
          if (value[0] === '~') {
            srcPath = value.substr(1);
            srcType = 'literal';
          } else {
            // This is a simple mapping from source to destination paths
            srcPath = value;
            srcType = srcPath.match(/[.\[]/) ? 'complex' : 'simple';
          }
        } else if (_.isObject(value)) {
          // An object can be passed in with various attributes
          // If we are removing the value then just set it to undefined and get out
          if (value.remove) {
            fieldTransformations.push(getRemovalTransform(dstType, dstPath));
            return;
          }
          if (value.srcPath) {
            // Set the source path if one is given
            srcPath = value.srcPath;
            if (_.isString(srcPath)) {
              srcType = srcPath.match(/[.\[]/);
            } else {
              srcType = 'function';
            }
          }
          dstValueType = value.type;
          if (value.defaultValue) {
            // Set a default value to use if the source value is null
            defaultValue = value.defaultValue;
          }
          // check to see if we have a custom filter
          let customFilter = value.customFilter || value.filter;
          if (_.isFunction(customFilter)) {
            fieldTransformations.push(getFilterTransform(srcType, srcPath, dstType, dstPath, customFilter, dstValueType, defaultValue));
            return;
          }
          // check to see if we are processing a list or embedded object
          if (value.schema) {
            // For backwards compatibility we will check the items field and use that as the srcPath
            if (value.items) {
              srcPath = value.items;
            }
            // do we have a schema for the individual items?
            let itemsSchema = value.schema;
            let compiledItemsSchema;
            if (_.isFunction(itemsSchema)) {
              compiledItemsSchema = itemsSchema;
            } else if (_.isString(itemsSchema)) {
              if (!compiledSchemas.has(itemsSchema)) {
                throw new Error('The child schema was not found.')
              }
              compiledItemsSchema = compiledSchemas.get(itemsSchema);
            } else {
              compiledItemsSchema = module.exports.compile(itemsSchema);
            }
            fieldTransformations.push(function (src, dst, data, parent, top) {
              let pathRE = /^(\$parent|\$top|\$self)\.?(.*)$/g;
              // Get the item(s) from the src
              let items;
              if (_.isFunction(srcPath)) {
                items = srcPath(src, dst, data, parent, top);
              } else {
                let srcObject = src;
                let pathParts = pathRE.exec(srcPath);
                if (pathParts) {
                  switch (pathParts[1]) {
                    case '$parent':
                      srcObject = parent;
                      break;
                    case '$top':
                      srcObject = top;
                      break;
                    case '$self':
                      srcObject = src;
                      break;
                  }
                  srcPath = pathParts[2];
                }
                if (srcPath) {
                  items = _.get(srcObject, srcPath, null);
                } else {
                  items = srcObject;
                }
              }
              // only process if the item(s) is not null
              if (items) {
                // Array or single object?
                if (_.isArray(items)) {
                  let results = _.map(items, function (item) {
                    let newValue = compiledItemsSchema(item, null, data, src, top);
                    newValue = coerceValue(newValue, dstValueType);
                    return newValue;
                  });
                  _.set(dst, dstPath, results);
                } else {
                  let newValue = compiledItemsSchema(items, null, data, src, top);
                  newValue = coerceValue(newValue, dstValueType);
                  if (dstType === 'array') {
                    let oldValue = _.get(dst, dstPath, []);
                    // Don't push empty objects
                    if (!_.isEmpty(newValue)) {
                      oldValue.push(newValue);
                    }
                    newValue = oldValue;
                  }
                  _.set(dst, dstPath, newValue);
                }
              }
            });
            return;
          }
        } else {
          throw new Error('The source must be a string, null, object, or function.');
        }
      }

      // Map the value from src to dst
      fieldTransformations.push(getSetValueTransform(srcType, srcPath, dstType, dstPath, dstValueType, defaultValue));
    });

  // Create the transformation function
  /**
   * @function transformFunc
   * @param {Object} src The source object.
   * @param {Object} dst The destination object.
   * @param {Object} [data] Custom data that you might need in your filter functions.
   * @param {Object} [parent] The parent of the source object.
   * @param {Object} [top] The top level source object.
   * @return {Object} The transformed object.
   */
  let transformFunc = function transformFunc(src, dst, data, parent, top) {
    if (src === null || src === undefined) {
      return undefined;
    }
    if (!top) {
      top = src;
    }

    dst = dst || {};
    _.each(fieldTransformations, function (transform) {
      transform(src, dst, data, parent, top);
    });
    if (onFinishedTransformation) {
      onFinishedTransformation(src, dst, data, parent, top);
    }
    return dst;
  };
  // Store the compiled schema for lookup
  compiledSchemas.set(key, transformFunc);
  return transformFunc;
};

/*
const schema = {
    field1: null, // This will simply map field1 from the source into field1 in the destination
    simple: 'field2', // Maps field2 into simple
    nested: 'field3.nestedValue', // Maps the nest field field3.nestedValue into nested
    object: 'field4', // Maps field4 into object
    embeddedObject: {
        srcPath: 'object1',
        schema: {
            embeddedChild1: 'child1'
        }
    },
    'embeddedObjectToArray1[]': {
        srcPath: 'object1',
        schema: {
            embeddedChild1: 'child1'
        }
    },
    embeddedArray: {
        srcPath: 'array1',
        schema: {
            embeddedChild1: 'child1',
            embeddedChildObject1: {
                srcPath: 'child1',
                schema: {
                    child1: 'child1'
                }
            }
        }
    },
    filtered: {
        srcPath: 'field5',
        filter: function(value, src, dst, request) {
            return `${src.field5}(${src.field5.length})`;
        }
    }
};

const sourceObject = {
    field1: 'field1',
    field2: 'field2',
    field3: {
        nestedValue: 'field3.nestedValue'
    },
    object1: {
        child1: 'child1'
    },
    array1: [
        {
            child1: 'index1Child1',
            childObject1: {
                child1: 'index1ChildObject1Child1'
            }
        },
        {
            child1: 'index1Child2',
            childObject1: {
                child1: 'index2ChildObject1Child1'
            }
        }
    ],
    field4: {
        nested1: 'nested1',
        nested2: 'nested2'
    },

    field5: 'field5'
};
*/
