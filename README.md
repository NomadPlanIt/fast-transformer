# fast-node-transform
This module will allow you to perform JSON transformations using a template driven approach.
To make the transformation fast, the template is compiled into a single function much like
HTML templating libraries.

## Installation

    npm install --save @u-dev/fast-node-transform
    
## Basic Usage
The template takes the form of shaping your resulting data structure by creating a JavaScript
object that contains the destination fields in the left hand side and the source fields on the
right hand side. A simple template would look something like this:

    {
      id: 'userId',
      name: 'firstName'
    }

This template is going to transform `userId` into `id` and `firstName` into `name`. So given a
structure like:

    {
      userId: '123',
      firstName: 'Jane',
      lastName: 'Doe',
      address: {
        street: '1 Main St',
        city: 'San Jose',
        state: 'California',
        zip: '95013'
      }
    }

you would get this result:

    {
      id: '123,
      name: 'Jane'
    }

You can also set the right side value as `null` if source and destination have the same field
name. So a template like this:

    {
      id: 'userId',
      name: 'firstName',
      address: null
    }

will result in a structure like this:

    {
      id: '123,
      name: 'Jane',
      address: {
        street: '1 Main St',
        city: 'San Jose',
        state: 'California',
        zip: '95013'
      }
    }

## Field Name Rules
The field names have the flexibility of indicating nesting inside the field name itself. So if the
source comes from a nested field, you can indicate this with object notation format. So for
example, if we wanted to put the street into the root object we could create a mapping like this:

    {
      street: 'address.street'
    }

The same rule applies to destination path as well. If you wanted to put name into an object with
field name `personal`, we could write a mapping like this:

    {
      'personal.name': 'name'
    }

>The field level source and destination code is using [lodash](http://lodash.com/docs)
>`get` and `set`. So the same rules that apply to [lodash](http://lodash.com/docs), apply to
>field mappings.

In the case of indicating nesting in the destination, if the source object already exists, the field
in that object will simply be set to the transformed value. If the object does not exist, one will
be created before setting the field's value.

### Literal String Values
String literals can be used in place of the mapping value. To use a literal value prefix
the mapping value (RHS) with a tilde (~).

    {
      literal: '~value'
    }
    
This will result in the `literal` field just having `value` as its value.
 
### Destination Arrays
You can transform values and push them into an array by adding opening and closing brackets
onto the end of the destination field mapping name. This will create an array and push
the transformed value into the array. For example:

    {
      `colors[]`: 'car.color`,
      `colors[]`: 'bike.color`,
      `colors[]`: 'house.color`
    }

given:

    {
      car: {
        color: 'red'
      },
      bike: {
        color: 'blue'
      },
      house: {
        color: 'white'
      }
    }

would result in:

    {
      colors: [
        'red',
        'blue',
        'white'
      ]
    }

## Embedded Documents
You can also created embedded document schemas to create nested objects. This has a special
format that requires an object on the right hand side to describe the source object
to transform as well as the schema to use for the transformation. For example, maybe we need
our address structure to look different than the one being provided. To do this we could
create a transformation template that looks like this:

    {
      id: 'userId',
      name: 'firstName',
      address: {
        srcPath: 'address',
        schema: {
          deliveryLine: 'street',
          city: null,
          state: null,
          postalCode: 'zip
        }
      }
    }

Given the example for Jane Doe above as input we would get a result like this:

    {
      id: '123,
      name: 'Jane',
      address: {
        deliveryLine: '1 Main St',
        city: 'San Jose',
        state: 'California',
        postalCode: '95013'
      }
    }

There can be any number of embedded documents. The embedded schemas are treated as separate
transformation templates and just follow the same rules as a top level transformation template.
The only thing to keep in mind is whatever object resolves into the provided `srcPath` will be
the object that is used in the transformation. So the right hand side fields need to be part
of the source object provided.

## Custom Filter Functions
You can also provide a function to use in the transformation for a field. This lets you do
special formatting or more complex transformation that might not be able to be done using
a standard field mapping. For example, what if we also wanted to store the state abbreviation
as the `stateCode` field. Given a map of the state name to abbreviation we could write a
custom filter like this:

    {
      id: 'userId',
      name: 'firstName',
      address: {
        srcPath: 'address',
        schema: {
          deliveryLine: 'street',
          city: null,
          state: null,
          stateCode: {
            srcPath: 'state',
            filter: (value) => {
              return _stateLookup.get(value.toLowerCase();
            }
          }
          postalCode: 'zip
        }
      }
    }
    
and we would end up with an object like this:

    {
      id: '123,
      name: 'Jane',
      address: {
        deliveryLine: '1 Main St',
        city: 'San Jose',
        state: 'California',
        stateCode: 'CA',
        postalCode: '95013'
      }
    }

The function signature for custom filters like done in the example above are as follows:

    function (value, src, dst, data, parent, top) {}

Parameter | Type | Description
--- | --- | ---
value | * | The is the value that resolves to the `srcPath` in the field mapping that contains the custom filter.
src | object | This is the source object in the scope of the current transformation template. Remember embedded templates will be scoped to the source indicated in the `srcPath` of the embedded template.
dst | object | This is the destination object being built. In the case of embedded template, this will be the nested object.
data | * | When executing transformations it is possible to pass custom data into the transformation. This field will contain that data.
parent | object | When transforming an embedded template, this field will contain the direct parent to the nested object being transformed.
top | object | When transforming nested object, this will be the top most or original object being transformed.

The return value from this function should be the value you wish to set in the destination object.

### Alternative Custom Filter
An alternative way to provide a custom filter is by setting the right hand side to a function.
This will result in executing the function with a little different signature. Since a `srcPath`
isn't being provided, there will be no value. The signature looks the same as previous described
without the `value` parameter. As an example we could use a function like this to transform first
and last name into a full name:

    {
      id: 'userId',
      name: (src) => {
        return `${src.firstName} ${src.lastName}`,
      },
      address: {
        srcPath: 'address',
        schema: {
          deliveryLine: 'street',
          city: null,
          state: null,
          stateCode: {
            srcPath: 'state',
            filter: (value) => {
              return _stateLookup.get(value.toLowerCase();
            }
          }
          postalCode: 'zip
        }
      }
    }

will net this object:

    {
      id: '123,
      name: 'Jane Doe',
      address: {
        deliveryLine: '1 Main St',
        city: 'San Jose',
        state: 'California',
        stateCode: 'CA',
        postalCode: '95013'
      }
    }

## Special `srcPath` Values
To make transformation of nested objects easier there are some special values that can be used
in the `srcPath` for embedded documents.

value | description
--- | ---
$self | This will cause the transformation source object to remain the same as what is currently being processed. So the destination object will nest but the source object will not.
$parent | This will result in the transformation source object to be set as the parent of the currently nested source object. So in the example above if you were creating a nested object in address but the values come from the root object, you could set the `srcPath` to `$parent` to achieve this.
$top | This will set the transformation source object as the root or top level object being transformed.

As an example, maybe the coordinates for Jane Doe's address is in the top level but we want to put
this into the address. Our template could look like this:


    {
      id: 'userId',
      name: (src) => {
        return `${src.firstName} ${src.lastName}`,
      },
      address: {
        srcPath: 'address',
        schema: {
          deliveryLine: 'street',
          city: null,
          state: null,
          stateCode: {
            srcPath: 'state',
            filter: (value) => {
              return _stateLookup.get(value.toLowerCase();
            }
          }
          postalCode: 'zip,
          coordinates: {
            srcPath: '$parent',
            schema: {
              lat: 'location.latitude',
              lon: 'location.longitude'
            }
          }
        }
      }
    }

Given an object like this:

    {
      userId: '123',
      firstName: 'Jane',
      lastName: 'Doe',
      address: {
        street: '1 Main St',
        city: 'San Jose',
        state: 'California',
        zip: '95013'
      },
      location: {
        latitude: 123.12345,
        longitued: 85.89012
      }
    }
    
we would get an object like this:

    {
      id: '123,
      name: 'Jane Doe',
      address: {
        deliveryLine: '1 Main St',
        city: 'San Jose',
        state: 'California',
        stateCode: 'CA',
        postalCode: '95013',
        coordinates: {
          lat: 123.12345,
          lon: 85.89012
      }
    }

### Special Object Specifiers In Mapping Field Names
You can also use the special object specifiers above directly in the source field mapping names.
So the above example could also be written like this:

    {
      id: 'userId',
      name: (src) => {
        return `${src.firstName} ${src.lastName}`,
      },
      address: {
        srcPath: 'address',
        schema: {
          deliveryLine: 'street',
          city: null,
          state: null,
          stateCode: {
            srcPath: 'state',
            filter: (value) => {
              return _stateLookup.get(value.toLowerCase();
            }
          }
          postalCode: 'zip,
          'coordinates.lat': '$parent.location.latitude',
          'coordinates.lon': '$parent.location.longitude'
        }
      }
    }

The result is the same but the above template is not as efficient as the previous one due
to complexity in the field names. This is OK in small doses but for large object transformations
it is better to use the embedded schemas.

## Array of Objects In The Source
For embeded schemas you can also transform arrays of objects. If the `srcPath` resolves into and
array of objects, each object in the array will be transformed according to the provided `schema`
and the resulting array of transformed objects will be set into the destination field.

>One thing to keep in mind is if the destination field already contains an array, the value in
>will be replaced like any other transformation. Conversely, if you are transforming a single
>object into a field that contains an array, the object will be added to the end of the array.

## Order Matters
The schema is ultimately compiled into an array of functions that get executed in order. So the
order of the fields in the template make a difference as to when fields in the destination
structure will exist. It is possible to use this to your advantage. As an example we will change
the transformation above to use field level nesting and the knowledge that the address structure
will exist by the time the coordinates are transformed:

    {
      id: 'userId',
      name: (src) => {
        return `${src.firstName} ${src.lastName}`,
      },
      address: {
        srcPath: 'address',
        schema: {
          deliveryLine: 'street',
          city: null,
          state: null,
          stateCode: {
            srcPath: 'state',
            filter: (value) => {
              return _stateLookup.get(value.toLowerCase();
            }
          }
          postalCode: 'zip,
        }
      },
      'address.coordinates.lat': 'location.latitude',
      'address.coordinates.lon': 'location.longitude'
    }

This will result in the same structure but using a different mechanism for describing the
transformation:

    {
      id: '123,
      name: 'Jane Doe',
      address: {
        deliveryLine: '1 Main St',
        city: 'San Jose',
        state: 'California',
        stateCode: 'CA',
        postalCode: '95013',
        coordinates: {
          lat: 123.12345,
          lon: 85.89012
      }
    }

Again, this is not a very practical example and is still inefficient, but it gives you the idea
about how this could be achieved.
