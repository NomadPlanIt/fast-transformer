const _ = require('lodash');
const chai = require('chai');
const Lab = require('@hapi/lab');
const expect = chai.expect;
const lab = exports.lab = Lab.script();
const it = lab.it;
const describe = lab.describe;

const transform = require('../../lib/transform');

const schema = {
  'fieldUndefined': null,
  'objectUndefined.fieldUndefined': null,
  'field1': null,
  'simple': 'field2',
  'nested': 'field3.nestedValue',
  'object': 'field4',
  'embeddedObject': {
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
  'embeddedObjectToArray2[0]': {
    srcPath: 'object1',
    schema: {
      embeddedChild1: 'child1'
    }
  },
  'embeddedObjectToArray2[1]': {
    srcPath: 'object1',
    schema: {
      embeddedChild1: 'child1'
    }
  },
  'embeddedObjectToArray2[2]': 'object2',
  'embeddedObjectToArray2[3]': {
    srcPath: 'object2',
    schema: {
      embeddedChild1: 'child1'
    }
  },
  'embeddedObjectToArray2[4]': 'undefined',
  'embeddedArray': {
    srcPath: 'array1',
    schema: {
      embeddedChild1: 'child1',
      embeddedChildObject1: {
        srcPath: 'childObject1',
        schema: {
          embeddedChildObject1child1: 'child1'
        }
      }
    }
  },
  'filtered': {
    srcPath: 'field5',
    filter: function (value, src) {
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
  field4: {
    nested1: 'nested1',
    nested2: 'nested2'
  },
  field5: 'field5',
  object1: {
    child1: 'child1'
  },
  object2: {
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
  ]
};

describe('transform', () => {
  describe('compile', () => {
    it('should return a function', () => {
      let transFunc = transform.compile(schema);
      expect(transFunc).to.be.a('function');
    });

    it('should return a property transformation', () => {
      let transFunc = transform.compile(schema);
      let data = transFunc(sourceObject);
      expect(data).to.be.a('object');
      expect(data).not.to.have.property('fieldUndefined');
      expect(data).to.have.property('field1', 'field1');
      expect(data).to.have.property('simple', 'field2');
      expect(data).to.have.property('nested', 'field3.nestedValue');
      expect(data).to.have.deep.property('object', sourceObject.field4);
      expect(data).to.have.property('filtered', 'field5(6)');

      expect(data).to.have.property('embeddedObject');
      expect(data.embeddedObject).to.have.property('embeddedChild1', sourceObject.object1.child1);

      expect(data).to.have.property('embeddedObjectToArray1').and.to.have.lengthOf(1);
      expect(data.embeddedObjectToArray1[0]).to.have.property('embeddedChild1', sourceObject.object1.child1);
      expect(data).to.have.property('embeddedObjectToArray2').and.to.have.lengthOf(2);
      expect(data.embeddedObjectToArray2[0]).to.have.property('embeddedChild1', sourceObject.object1.child1);
      expect(data.embeddedObjectToArray2[1]).to.have.property('embeddedChild1', sourceObject.object1.child1);

      expect(data).to.have.property('embeddedArray').and.to.have.lengthOf(sourceObject.array1.length);
      // We want to remove all undefined for comparison since we don't care about those
      let comp = JSON.parse(JSON.stringify(data.embeddedArray));
      expect(comp).to.deep.include.members([
        {
          embeddedChild1: 'index1Child1',
          embeddedChildObject1: {
            embeddedChildObject1child1: 'index1ChildObject1Child1'
          }
        },
        {
          embeddedChild1: 'index1Child2',
          embeddedChildObject1: {
            embeddedChildObject1child1: 'index2ChildObject1Child1'
          }
        }
      ]);
    });
  });

  describe('transform', () => {
    it('should return null if src is undefined', () => {
      let result = transform.transform(undefined, {}, schema, {});
      expect(result).to.be.null;
    });

    it('should transform properly', () => {
      let data = transform.transform(sourceObject, {}, schema);
      expect(data).to.be.a('object');
      expect(data).not.to.have.property('fieldUndefined');
      expect(data).to.have.property('field1', 'field1');
      expect(data).to.have.property('simple', 'field2');
      expect(data).to.have.property('nested', 'field3.nestedValue');
      expect(data).to.have.deep.property('object', sourceObject.field4);
      expect(data).to.have.property('filtered', 'field5(6)');

      expect(data).to.have.property('embeddedObject');
      expect(data.embeddedObject).to.have.property('embeddedChild1', sourceObject.object1.child1);

      expect(data).to.have.property('embeddedObjectToArray1').and.to.have.lengthOf(1);
      expect(data.embeddedObjectToArray1[0]).to.have.property('embeddedChild1', sourceObject.object1.child1);
      expect(data).to.have.property('embeddedObjectToArray2').and.to.have.lengthOf(2);
      expect(data.embeddedObjectToArray2[0]).to.have.property('embeddedChild1', sourceObject.object1.child1);
      expect(data.embeddedObjectToArray2[1]).to.have.property('embeddedChild1', sourceObject.object1.child1);

      expect(data).to.have.property('embeddedArray').and.to.have.lengthOf(sourceObject.array1.length);
      // We want to remove all undefined for comparison since we don't care about those
      let comp = JSON.parse(JSON.stringify(data.embeddedArray));
      expect(comp).to.deep.include.members([
        {
          embeddedChild1: 'index1Child1',
          embeddedChildObject1: {
            embeddedChildObject1child1: 'index1ChildObject1Child1'
          }
        },
        {
          embeddedChild1: 'index1Child2',
          embeddedChildObject1: {
            embeddedChildObject1child1: 'index2ChildObject1Child1'
          }
        }
      ]);
    });
  });

  describe('internal', () => {
    describe('_coerceValue', () => {
      it('should cast to string properly', () => {
        let v = transform.internal._coerceValue(1, 'string');
        expect(v).to.eq('1');

      });

      it('should cast to number properly', () => {
        let v = transform.internal._coerceValue('1', 'number');
        expect(v).to.eq(1);

        v = transform.internal._coerceValue('1.1', 'number');
        expect(v).to.eq(1.1);
      });

      it('should handle null properly', () => {
        let v = transform.internal._coerceValue(null, 'number');
        expect(v).to.be.null
      });

      it('should handle undefined properly', () => {
        let v = transform.internal._coerceValue(undefined, 'number');
        expect(v).to.be.undefined
      });
    });

    describe('_getGetSourceValue', () => {
      describe('should handle special values such as', () => {
        it('$parent', () => {
          let parent = {
            foo: 'bar'
          };
          let top = {
            parent: parent
          };
          let data = 'data';
          let src = {};
          let dst = {};

          let func = transform.internal._getGetSourceValue('string', '$parent', null);
          let result = func(src, dst, data, parent, top);

          expect(result).to.deep.equal(parent);
        });

        it('$parent.path', () => {
          let parent = {
            foo: 'bar'
          };
          let top = {
            parent: parent
          };
          let data = 'data';
          let src = {};
          let dst = {};

          let func = transform.internal._getGetSourceValue('string', '$parent.foo', null);
          let result = func(src, dst, data, parent, top);

          expect(result).to.equal('bar');
        });

        it('$self', () => {
          let parent = {
            foo: 'bar'
          };
          let top = {
            parent: parent
          };
          let data = 'data';
          let src = {
            baz: 'bam'
          };
          let dst = {};

          let func = transform.internal._getGetSourceValue('string', '$self', null);
          let result = func(src, dst, data, parent, top);

          expect(result).to.deep.equal(src);
        });

        it('$self.path', () => {
          let parent = {
            foo: 'bar'
          };
          let top = {
            parent: parent
          };
          let data = 'data';
          let src = {
            baz: 'bam'
          };
          let dst = {};

          let func = transform.internal._getGetSourceValue('string', '$self.baz', null);
          let result = func(src, dst, data, parent, top);

          expect(result).to.equal('bam');
        });

        it('$top', () => {
          let parent = {
            foo: 'bar'
          };
          let top = {
            parent: parent
          };
          let data = 'data';
          let src = {
            baz: 'bam'
          };
          let dst = {};

          let func = transform.internal._getGetSourceValue('string', '$top', null);
          let result = func(src, dst, data, parent, top);

          expect(result).to.deep.equal(top);
        });

        it('$top.path', () => {
          let parent = {
            foo: 'bar'
          };
          let top = {
            parent: parent
          };
          let data = 'data';
          let src = {
            baz: 'bam'
          };
          let dst = {};

          let func = transform.internal._getGetSourceValue('string', '$top.parent', null);
          let result = func(src, dst, data, parent, top);

          expect(result).to.equal(parent);
        });
      });
    });

    describe('_getSetValue', () => {
      describe('should append to an array', () => {
        it('when the value is a single item and current value is empty', () => {
          let src = {};
          let dst = {};

          let func = transform.internal._getSetValue('array', 'foo');
          func(src, dst, 'bar');

          expect(dst).to.be.a('object');
          expect(dst).to.have.property('foo').and.to.have.lengthOf(1);
          expect(dst.foo[0]).to.eq('bar');
        });

        it('when the value is a single item and current value is not empty', () => {
          let src = {};
          let dst = {foo: ['baz']};

          let func = transform.internal._getSetValue('array', 'foo');
          func(src, dst, 'bar');

          expect(dst).to.be.a('object');
          expect(dst).to.have.property('foo').and.to.have.lengthOf(2);
          expect(dst.foo).to.deep.include.members([
            'baz',
            'bar'
          ]);
        });

        it('when the value is an array and current value is empty', () => {
          let src = {};
          let dst = {};

          let func = transform.internal._getSetValue('array', 'foo');
          func(src, dst, ['baz', 'bar']);

          expect(dst).to.be.a('object');
          expect(dst).to.have.property('foo').and.to.have.lengthOf(2);
          expect(dst.foo).to.deep.include.members([
            'baz',
            'bar'
          ]);
        });

        it('when the value is an array and current value is not empty', () => {
          let src = {};
          let dst = {foo: ['boo']};

          let func = transform.internal._getSetValue('array', 'foo');
          func(src, dst, ['baz', 'bar']);

          expect(dst).to.be.a('object');
          expect(dst).to.have.property('foo').and.to.have.lengthOf(3);
          expect(dst.foo).to.deep.include.members([
            'boo',
            'baz',
            'bar'
          ]);
        });
      });
    });

    describe('should set a complex value', () => {
      it('when destination path does not exist', () => {
        let src = {};
        let dst = {};

        let func = transform.internal._getSetValue('complex', 'foo.bar');
        func(src, dst, 'baz');

        expect(dst).to.be.a('object');
        expect(dst).to.have.nested.property('foo.bar', 'baz');
      });

      it('when destination path does exist', () => {
        let src = {};
        let dst = {foo: {}};

        let func = transform.internal._getSetValue('complex', 'foo.bar');
        func(src, dst, 'baz');

        expect(dst).to.be.a('object');
        expect(dst).to.have.nested.property('foo.bar', 'baz');
      });
    });

    describe('getGetSourceValue', () => {
      describe('should return a value when the source path is a function', () => {
        it('when the value is a single item and current value is empty', () => {
          let src = {foo: 'bar'};
          let dst = {};
          let data = 'data';
          let parent = 'parent';
          let top = 'top';
          let funcTest = {};
          let srcFunc = (src, dst, data, parent, top) => {
            funcTest.src = src;
            funcTest.dst = dst;
            funcTest.data = data;
            funcTest.parent = parent;
            funcTest.top = top;
            return 'bar';
          };

          let func = transform.internal._getGetSourceValue('function', srcFunc, null);
          let srcValue = func(src, dst, data, parent, top);

          expect(srcValue).to.be.eq('bar');
          expect(funcTest.src).to.be.eq(src);
          expect(funcTest.dst).to.be.eq(dst);
          expect(funcTest.data).to.be.eq(data);
          expect(funcTest.parent).to.be.eq(parent);
          expect(funcTest.top).to.be.eq(top);
        });
      });
    });

    describe('getRemovalTransform', () => {
      describe('should remove a field', () => {
        it('when the destination is simple and a value is not given', () => {
          let src = {foo: 'bar'};
          let dst = {foo: 'bar'};

          let func = transform.internal._getRemovalTransform('simple', 'foo');
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.not.have.property('foo');
        });

        it('when the destination is simple and a value is given', () => {
          let src = {foo: 'bar'};
          let dst = {foo: 'bar'};

          let func = transform.internal._getRemovalTransform('simple', 'foo', null);
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.have.property('foo', null);
        });

        it('when the destination is complex and a value is not given', () => {
          let src = {foo: 'bar'};
          let dst = {foo: {bar: 'baz'}};

          let func = transform.internal._getRemovalTransform('complex', 'foo.bar');
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.not.have.nested.property('foo.bar');
        });

        it('when the destination is complex and a value is given', () => {
          let src = {foo: 'bar'};
          let dst = {foo: {bar: 'baz'}};

          let func = transform.internal._getRemovalTransform('complex', 'foo.bar', null);
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.have.nested.property('foo.bar', null);
        });
      });

      it('should do nothing when a complex destination path does not exist', () => {
        let src = {foo: 'bar'};
        let dst = {foo: {baz: 'bar'}};

        let func = transform.internal._getRemovalTransform('complex', 'foo.bar', null);
        func(src, dst);

        dst = JSON.parse(JSON.stringify(dst));
        expect(dst).to.have.nested.property('foo.baz', 'bar');
      });
    });
  });

  describe('getSetValueTransform', () => {
    describe('set a value', () => {
      describe('to the default', () => {
        it('when the value is null', () => {
          let src = {foo: 'bar'};
          let dst = {foo: 'bar'};

          let func = transform.internal._getSetValueTransform('simple', 'bar', 'simple', 'bar', null, 'foo');
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.have.property('bar', 'foo');
        });

        it('when the value is an empty object', () => {
          let src = {foo: 'bar', bar: {}};
          let dst = {foo: 'bar'};

          let func = transform.internal._getSetValueTransform('simple', 'bar', 'simple', 'bar', null, 'foo');
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.have.property('bar', 'foo');
        });

        it('when the value is an empty array', () => {
          let src = {foo: 'bar', bar: []};
          let dst = {foo: 'bar'};

          let func = transform.internal._getSetValueTransform('simple', 'bar', 'simple', 'bar', null, 'foo');
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.have.property('bar', 'foo');
        });

        it('when the default is zero', () => {
          let src = {foo: 'bar'};
          let dst = {foo: 'bar'};

          let func = transform.internal._getSetValueTransform('simple', 'bar', 'simple', 'bar', null, 0);
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.have.property('bar', 0);
        });

        it('when the default is null', () => {
          let src = {foo: 'bar'};
          let dst = {foo: 'bar'};

          let func = transform.internal._getSetValueTransform('simple', 'bar', 'simple', 'bar', null, null);
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.have.property('bar', null);
        });

        it('except when the value is null', () => {
          let src = {foo: 'bar'};
          let dst = {foo: 'bar'};

          let func = transform.internal._getSetValueTransform('simple', 'bar', 'simple', 'bar', null);
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.not.have.property('bar');
        });

        it('except when the value is zero', () => {
          let src = {foo: 'bar', bar: 0};
          let dst = {foo: 'bar'};

          let func = transform.internal._getSetValueTransform('simple', 'bar', 'simple', 'bar', null, 'foo');
          func(src, dst);

          dst = JSON.parse(JSON.stringify(dst));
          expect(dst).to.have.property('bar', 0);
        });

        describe('except when the value is set', () => {
          it('to a value', () => {
            let src = {foo: 'bar', bar: 'baz'};
            let dst = {foo: 'bar'};

            let func = transform.internal._getSetValueTransform('simple', 'bar', 'simple', 'bar', null, 'foo');
            func(src, dst);

            dst = JSON.parse(JSON.stringify(dst));
            expect(dst).to.have.property('bar', 'baz');
          });

          it('to an object', () => {
            let src = {foo: 'bar', bar: {baz: 'foo'}};
            let dst = {foo: 'bar'};

            let func = transform.internal._getSetValueTransform('simple', 'bar', 'simple', 'bar', null, 'foo');
            func(src, dst);

            dst = JSON.parse(JSON.stringify(dst));
            expect(dst).to.have.deep.property('bar', {baz: 'foo'});
          });
        });
      });
    });

    it('should do nothing when a complex destination path does not exist', () => {
      let src = {foo: 'bar'};
      let dst = {foo: {baz: 'bar'}};

      let func = transform.internal._getRemovalTransform('complex', 'foo.bar', null);
      func(src, dst);

      dst = JSON.parse(JSON.stringify(dst));
      expect(dst).to.have.nested.property('foo.baz', 'bar');
    });
  });

  describe('compile', () => {
    it('should transform a literal value expression properly', () => {
      let src = {foo: '~bar'};

      let func = transform.compile(src);
      let result = func({});

      result = JSON.parse(JSON.stringify(result));
      expect(result).to.deep.equal({foo: 'bar'});
    });

    it('should return a simple merge transform when the schema is null', () => {
      let src = {foo: 'bar'};

      let func = transform.compile(null);
      let result = func(src);

      result = JSON.parse(JSON.stringify(result));
      expect(result).to.deep.equal(src);
      expect(result).to.not.equal(src);
    });

    it('should return undefined if src is undefined', () => {
      let schema = {foo: 'bar'};

      let func = transform.compile(schema);
      let result = func(undefined);

      expect(result).to.be.undefined;
    });

    it('should use an embedded schema function', () => {
      let schema1 = {
        bam: 'bar'
      };
      let schema1Func = transform.compile(schema1);

      let schema2 = {
        baz: 'bam',
        foo: {
          srcPath: 'boo',
          schema: schema1Func
        }
      };
      let schema2Func = transform.compile(schema2);

      let src = {
        bam: 'bar',
        boo: {
          bar: 'baz'
        }
      };

      let result = schema2Func(src);

      result = JSON.parse(JSON.stringify(result));
      expect(result).to.deep.equal({
        baz: 'bar',
        foo: {
          bam: 'baz'
        }
      });
      expect(result).to.not.equal(src);
    });

    it('should use an embedded schema by name', () => {
      let schema1 = {
        '_name': 'schema1',
        'bam': 'bar'
      };
      transform.compile(schema1);

      let schema2 = {
        baz: 'bam',
        foo: {
          srcPath: 'boo',
          schema: 'schema1'
        }
      };
      let schema2Func = transform.compile(schema2);

      let src = {
        bam: 'bar',
        boo: {
          bar: 'baz'
        }
      };

      let result = schema2Func(src);

      result = JSON.parse(JSON.stringify(result));
      expect(result).to.deep.equal({
        baz: 'bar',
        foo: {
          bam: 'baz'
        }
      });
      expect(result).to.not.equal(src);
    });

    it('should throw an error when an embedded schema by name does not exist', () => {
      let schema2 = {
        baz: 'bam',
        foo: {
          srcPath: 'boo',
          schema: 'schema does not exist'
        }
      };
      expect(() => {
        transform.compile(schema2);
      }).to.throw();
    });

    it('should return a simple merge transform when the schema is null and merge into the destination object', () => {
      let src = {foo: 'bar'};
      let dst = {foo: 'blah', baz: 'bam'};
      let expected = _.merge(dst, src);

      let func = transform.compile(null);
      let result = func(src, dst);

      result = JSON.parse(JSON.stringify(result));
      expect(result).to.not.equal(src);
      expect(result).to.deep.equal(expected);
    });

    it('should return a the same schema with the given key when compiled twice', () => {
      let schema = {
        foo: 'bar'
      };

      transform.compile(schema, 'foo');
      let func = transform.compile(schema, 'foo');

      expect(func).to.equal(func);
    });

    it('should return a the same schema with the given name when compiled twice', () => {
      let schema = {
        '_name': 'foo2',
        'foo': 'bar'
      };

      transform.compile(schema);
      let func = transform.compile(schema);

      expect(func).to.equal(func);
    });

    it('should handle complex destination paths properly', () => {
      let schema = {
        'foo.bar': 'bar'
      };

      let func = transform.compile(schema);
      let result = func({
        bar: 'foo'
      });
      expect(result).to.deep.equal({
        foo: {
          bar: 'foo'
        }
      });
    });
  });

  describe('function', () => {
    it('should handle removals properly', () => {
      let schema = {
        'foo.bar': 'bar',
        'baz': {
          remove: true
        }
      };

      let func = transform.compile(schema);
      let result = func({
        bar: 'foo',
        baz: 'bar'
      });
      result = JSON.parse(JSON.stringify(result));
      expect(result).to.deep.equal({
        foo: {
          bar: 'foo'
        }
      });
    });

    it('should default srcPath to destination path', () => {
      let schema = {
        'foo.bar': 'bar',
        'baz': {
          srcPath: null
        }
      };

      let func = transform.compile(schema);
      let result = func({
        bar: 'foo',
        baz: 'bar'
      });
      expect(result).to.deep.equal({
        baz: 'bar',
        foo: {
          bar: 'foo'
        }
      });
    });

    it('should default srcPath to destination path if srcPath is undefined', () => {
      let schema = {
        'foo.bar': 'bar',
        'baz': undefined
      };

      let func = transform.compile(schema);
      let result = func({
        bar: 'foo',
        baz: 'bar'
      });
      expect(result).to.deep.equal({
        baz: 'bar',
        foo: {
          bar: 'foo'
        }
      });
    });

    it('should accept items as an alias for srcPath', () => {
      let schema = {
        'foo.bar': 'bar',
        'baz': {
          items: 'bam',
          schema: {
            foo: 'bar'
          }
        }
      };

      let func = transform.compile(schema);
      let result = func({
        bar: 'foo',
        bam: {
          bar: 'baz'
        }
      });
      expect(result).to.deep.equal({
        baz: {
          foo: 'baz'
        },
        foo: {
          bar: 'foo'
        }
      });
    });

    it('should not process child schema if the source is null', () => {
      let schema = {
        'foo.bar': 'bar',
        'baz': {
          source: 'bam',
          schema: {
            foo: 'bar'
          }
        }
      };

      let func = transform.compile(schema);
      let result = func({
        bar: 'foo',
        bam: null
      });
      expect(result).to.deep.equal({
        foo: {
          bar: 'foo'
        }
      });
    });

    it('should not transform if the source is null', () => {
      let schema = {
        'foo.bar': 'bar',
        'baz': {
          source: 'bam',
          schema: {
            foo: 'bar'
          }
        }
      };

      let func = transform.compile(schema);
      let result = func(null);
      expect(result).to.be.undefined;
    });

    it('should accept $parent as a srcPath', () => {
      let schema = {
        foo: {
          srcPath: 'bar',
          schema: {
            foo: {
              srcPath: '$parent',
              schema: {
                baz: 'foo'
              }
            }
          }
        }
      };
      let src = {
        foo: 'bam',
        bar: {
          foo: 'bar'
        }
      };

      let func = transform.compile(schema);
      let result = func(src);
      expect(result).to.deep.equal({
        foo: {
          foo: {
            baz: 'bam'
          }
        }
      });
    });

    it('should accept $parent.node as a srcPath', () => {
      let schema = {
        foo: {
          srcPath: 'bar',
          schema: {
            foo: {
              srcPath: '$parent.node',
              schema: {
                baz: 'foo'
              }
            }
          }
        }
      };
      let src = {
        foo: 'bam',
        node: {
          foo: 'baz'
        },
        bar: {
          foo: 'bar'
        }
      };

      let func = transform.compile(schema);
      let result = func(src);
      expect(result).to.deep.equal({
        foo: {
          foo: {
            baz: 'baz'
          }
        }
      });
    });

    it('should accept $self as a srcPath', () => {
      let schema = {
        foo: {
          srcPath: 'bar',
          schema: {
            foo: {
              srcPath: '$self',
              schema: {
                baz: 'foo'
              }
            }
          }
        }
      };
      let src = {
        foo: 'bam',
        bar: {
          foo: 'bar'
        }
      };

      let func = transform.compile(schema);
      let result = func(src);
      expect(result).to.deep.equal({
        foo: {
          foo: {
            baz: 'bar'
          }
        }
      });
    });

    it('should accept $self.node as a srcPath', () => {
      let schema = {
        foo: {
          srcPath: 'bar',
          schema: {
            foo: {
              srcPath: '$self.node',
              schema: {
                baz: 'foo'
              }
            }
          }
        }
      };
      let src = {
        foo: 'bam',
        bar: {
          node: {
            foo: 'baz'
          },
          foo: 'bar'
        }
      };

      let func = transform.compile(schema);
      let result = func(src);
      expect(result).to.deep.equal({
        foo: {
          foo: {
            baz: 'baz'
          }
        }
      });
    });

    it('should accept $top as a srcPath', () => {
      let schema = {
        foo: {
          srcPath: 'bar',
          schema: {
            foo: {
              srcPath: '$top',
              schema: {
                baz: 'foo'
              }
            }
          }
        }
      };
      let src = {
        foo: 'bam',
        bar: {
          foo: 'bar'
        }
      };

      let func = transform.compile(schema);
      let result = func(src);
      expect(result).to.deep.equal({
        foo: {
          foo: {
            baz: 'bam'
          }
        }
      });
    });

    it('should accept $top.node as a srcPath', () => {
      let schema = {
        foo: {
          srcPath: 'bar',
          schema: {
            foo: {
              srcPath: '$top.node',
              schema: {
                baz: 'foo'
              }
            }
          }
        }
      };
      let src = {
        foo: 'bam',
        node: {
          foo: 'baz'
        },
        bar: {
          foo: 'bar'
        }
      };

      let func = transform.compile(schema);
      let result = func(src);
      expect(result).to.deep.equal({
        foo: {
          foo: {
            baz: 'baz'
          }
        }
      });
    });

    it('should execute srcPath to get will the source object if it is a function', () => {
      let callValues = {};
      let schema = {
        'foo.bar': {
          srcPath: (src, dst, data, parent, top) => {
            callValues.src = src;
            callValues.dst = dst;
            callValues.data = data;
            callValues.parent = parent;
            callValues.top = top;

            return {bar: 'bam'};
          },
          schema: {
            baz: 'bar'
          }
        }
      };
      let src = {
        bar: 'foo'
      };
      let data = 'data';
      let parent = 'parent';
      let top = 'top';

      let func = transform.compile(schema);
      let result = func(src, null, data, parent, top);
      expect(result).to.deep.equal({
        foo: {
          bar: {
            baz: 'bam'
          }
        }
      });
      expect(callValues).to.deep.equal({
        src: src,
        dst: result,
        data: data,
        parent: parent,
        top: top
      });
    });

    it('should set the default value properly', () => {
      let schema = {
        'foo.bar': 'bar',
        'baz': {
          srcPath: null,
          defaultValue: 'bam'
        }
      };

      let func = transform.compile(schema);
      let result = func({
        bar: 'foo'
      });
      expect(result).to.deep.equal({
        baz: 'bam',
        foo: {
          bar: 'foo'
        }
      });
    });

    it('should call _onFinished when done', () => {
      let callValues = {};
      let schema = {
        'foo.bar': 'bar',
        '_onFinished': (src, dst, data, parent, top) => {
          callValues.src = src;
          callValues.dst = dst;
          callValues.data = data;
          callValues.parent = parent;
          callValues.top = top;
        }
      };
      let src = {
        bar: 'foo'
      };
      let data = 'data';
      let parent = 'parent';
      let top = 'top';

      let func = transform.compile(schema);
      let result = func(src, null, data, parent, top);
      expect(result).to.deep.equal({
        foo: {
          bar: 'foo'
        }
      });
      expect(callValues).to.deep.equal({
        src: src,
        dst: result,
        data: data,
        parent: parent,
        top: top
      });
    });

    it('should ignore _onFinished if it is not a function', () => {
      let schema = {
        'foo.bar': 'bar',
        '_onFinished': 'foo'
      };
      let src = {
        bar: 'foo'
      };

      let func = transform.compile(schema);
      let result = func(src);
      expect(result).to.deep.equal({
        foo: {
          bar: 'foo'
        }
      });
    });

    it('should execute a function when provided as a value', () => {
      let callValues = {};
      let schema = {
        'foo.bar': (src, dst, data, parent, top) => {
          callValues.src = src;
          callValues.dst = dst;
          callValues.data = data;
          callValues.parent = parent;
          callValues.top = top;
          return 'foo'
        }
      };
      let src = {
        bar: 'foo'
      };
      let data = 'data';
      let parent = 'parent';
      let top = 'top';

      let func = transform.compile(schema);
      let result = func(src, null, data, parent, top);
      expect(result).to.deep.equal({
        foo: {
          bar: 'foo'
        }
      });
      expect(callValues).to.deep.equal({
        src: src,
        dst: result,
        data: data,
        parent: parent,
        top: top
      });
    });

    it('should execute a function when provided as a custom filter', () => {
      let callValues = {};
      let srcValue = {
        bar: 'foo'
      };
      let schema = {
        'foo': {
          srcPath: 'bar',
          customFilter: (value, src, dst, data, parent, top) => {
            callValues.value = srcValue.bar;
            callValues.src = src;
            callValues.dst = dst;
            callValues.data = data;
            callValues.parent = parent;
            callValues.top = top;
            return 'filtered';
          }
        }
      };
      let data = 'data';
      let parent = 'parent';
      let top = 'top';

      let func = transform.compile(schema);
      let result = func(srcValue, null, data, parent, top);
      expect(result).to.deep.equal({
        foo: 'filtered'
      });
      expect(callValues).to.deep.equal({
        value: srcValue.bar,
        src: srcValue,
        dst: result,
        data: data,
        parent: parent,
        top: top
      });
    });

    it('should throw an error if the source mapping is not valid', () => {
      let schema = {
        'foo.bar': 1
      };
      let src = {
        bar: 'foo'
      };

      expect(() => {
        transform.compile(schema);
      }).to.throw();
    });
  });
});
