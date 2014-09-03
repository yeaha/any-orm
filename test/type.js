var assert = require("assert");
var Type = require(__dirname+'/../lib/type');

describe('Mixed type', function() {
    var Mixed = Type.get();

    it('should return null when the value is empty string', function() {
        assert.strictEqual(Mixed.normalize(''), null);
    });

    describe('Value normalize', function() {
        it('should return passed value back', function() {
            assert.strictEqual(Mixed.normalize(null), null);
            assert.strictEqual(Mixed.normalize(undefined), undefined);
            assert.strictEqual(Mixed.normalize('0'), '0');
            assert.strictEqual(Mixed.normalize(0), 0);
        });
    });
});

describe('Numeric type', function() {
    var Numeric = Type.get('numeric');

    it('should return Numberic type when get by [Number] class', function() {
        assert.strictEqual(Type.get(Number), Numeric);
    });

    describe('Value normalize', function() {
        it('should return null when the value is null or empty string', function() {
            assert.strictEqual(Numeric.normalize(null), null);
            assert.strictEqual(Numeric.normalize(''), null);
        });

        it('should always return numeric result', function() {
            assert.strictEqual(Numeric.normalize(1), 1);
            assert.strictEqual(Numeric.normalize(-1), -1);
            assert.strictEqual(Numeric.normalize('1'), 1);
            assert.strictEqual(Numeric.normalize('1.1'), 1.1);
            assert.strictEqual(Numeric.normalize('abc'), 0);
            assert.strictEqual(Numeric.normalize(undefined), 0);
        });

        it('should throw error when the value is Infinity', function() {
            assert.throws(function() {
                Numeric.normalize(1/0);
            });
        });
    });
});

describe('Integer type', function() {
    var Integer = Type.get('integer');

    describe('Value normalize', function() {
        it('should return null when the value is null or empty string', function() {
            assert.strictEqual(Integer.normalize(null), null);
            assert.strictEqual(Integer.normalize(''), null);
        });

        it('should always return integer result', function() {
            assert.strictEqual(Integer.normalize('1'), 1);
            assert.strictEqual(Integer.normalize('1.1'), 1);
            assert.strictEqual(Integer.normalize(1.9), 1);
            assert.strictEqual(Integer.normalize('abc'), 0);
        });

        it('should throw error when the value is Infinity', function() {
            assert.throws(function() {
                Integer.normalize(1/0);
            });
        });
    });
});

describe('Text type', function() {
    var Text = Type.get('text');

    it('should return Text type when get by [String] class', function() {
        assert.strictEqual(Type.get(String), Text);
    });

    describe('Value normalize', function() {
        it('should return null when the value is null or empty string', function() {
            assert.strictEqual(Text.normalize(null), null);
            assert.strictEqual(Text.normalize(''), null);
        });

        it('should always return string result', function() {
            assert.strictEqual(Text.normalize(0), '0');
            assert.strictEqual(Text.normalize(1.1), '1.1');
            assert.strictEqual(Text.normalize('abc'), 'abc');
        });
    });
});

describe('Datetime type', function() {
    var Datetime = Type.get('datetime');

    it('should return Datetime type when get by [Date] class', function() {
        assert.strictEqual(Type.get(Date), Datetime);
    });

    describe('Value normalize', function() {
        it('should return null when the value is null or empty string', function() {
            assert.strictEqual(Datetime.normalize(null), null);
            assert.strictEqual(Datetime.normalize(''), null);
        });

        it('should convert unix timestamp to Date value', function() {
            var ts = 1409564951;
            var value = Datetime.normalize(ts, {unix_timestamp: true});

            assert.ok(value instanceof Date);
        });

        it('should throw error when the value is invalid date', function() {
            assert.throws(function() {
                Datetime.normalize('2014-01-32 00:00:00');
            }, Error);
        });
    });

    describe('Value store', function() {
        it('should return ISO-8601 format by default', function() {
            var ts = 1409564951;
            var value = new Date(ts*1000);

            assert.ok(/^\d{4}\-\d{2}\-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}$/.test(Datetime.store(value)));
        });

        it('should return unix timestamp by config', function() {
            var data = Datetime.store(new Date, {unix_timestamp: true});
            assert.ok(/^\d+$/.test(data));
        });
    });
});

describe('Json type', function() {
    var Json = Type.get('json');

    describe('Config normalize', function() {
        it('should set "strict" by default', function() {
            var config = Json.normalizeConfig({});
            assert.ok(config.strict);
        });
    });

    describe('Value normalize', function() {
        it('should return null when the value is null or empty string', function() {
            assert.strictEqual(Json.normalize(null), null);
            assert.strictEqual(Json.normalize(''), null);
        });

        it('should always return object', function() {
            var value = Json.normalize({foo: 'bar'});
            assert.ok(typeof value === 'object');
            assert.equal(value.foo, 'bar');

            var value = Json.normalize('{"foo":"bar"}');
            assert.ok(typeof value === 'object');
            assert.equal(value.foo, 'bar');

            var value = Json.normalize([1, 2, 3]);
            assert.ok(value.length === 3);

            var value = Json.normalize('[1,2,3]');
            assert.ok(value.length === 3);
        });

        it('should throw error when the value is invalid', function() {
            assert.throws(function() {
                Json.normalize('abc');
            });

            assert.throws(function() {
                Json.normalize(123);
            });

            assert.throws(function() {
                Json.normalize(undefined);
            });
        });
    });

    describe('Value store', function() {
        it('should return null when the value is empty', function() {
            assert.strictEqual(Json.store(null), null);
            assert.strictEqual(Json.store({}), null);
            assert.strictEqual(Json.store([]), null);
        });

        it('should always return string result', function() {
            assert.strictEqual(Json.store([1, 2, 3]), '[1,2,3]');
            assert.strictEqual(Json.store({foo: 'bar'}), '{"foo":"bar"}');
        });
    });
});