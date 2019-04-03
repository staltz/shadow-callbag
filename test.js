const test = require('tape');
const makeShadow = require('./index').default;

test('makeShadow returns a function', t => {
  const shadow = makeShadow('example');
  t.equals(typeof shadow, 'function', 'shadow is a function');
  t.end();
});

test('shadow immediately delivers basic metadata', t => {
  const expectedFromShadow = [[0, 'function'], [1, 'object']];
  const expectedDelivery = {name: 'example'};

  const shadow = makeShadow('example');

  shadow(0, (type, data) => {
    const e = expectedFromShadow.shift();
    t.deepEquals([type, typeof data], e, 'expected call to be ' + e);
    if (type === 0) {
      const talkback = data;
      talkback(1); // ask for 1st metadata
    }
    if (type === 1) {
      t.deepEquals(data, expectedDelivery, 'delivery is expected');
      t.equals(expectedFromShadow.length, 0, 'no more calls expected');
      t.end();
    }
  });
});

test('shadow propagates metadata from source shadow', t => {
  const expectedFromShadow = [
    [0, 'function'],
    [1, 'object'],
    [1, 'object'],
    [1, 'object'],
  ];

  const once = (start, sink) => {
    if (start !== 0) return;
    const shadow = makeShadow('once');
    const id = setTimeout(() => {
      const data = 42;
      shadow && shadow(1, data);
      sink(1, data);
    }, 200);
    function talkback(t) {
      if (t === 2) clearTimeout(id);
    }
    sink(0, talkback, shadow);
  };

  const map = f => source => (start, sink) => {
    if (start !== 0) return;
    let shadow;
    source(0, (t, d, s) => {
      if (t === 0) {
        shadow = makeShadow('map', s);
        sink(0, d, shadow);
      } else if (t === 1) {
        const y = f(d);
        shadow && shadow(1, y);
        sink(1, y);
      } else {
        sink(t, d);
      }
    });
  };

  const source = map(x => x - 30)(once);

  let i = 0;
  source(0, (type1, _data1, shadow) => {
    if (type1 === 0) {
      shadow(0, (type2, data2) => {
        const e = expectedFromShadow.shift();
        t.deepEquals([type2, typeof data2], e, 'expected call to be ' + e);
        if (type2 === 0) {
          const talkback = data2;
          talkback(1); // ask for 1st metadata
        }
        if (type2 === 1) {
          const metadata = data2;
          const index = ++i;
          if (index === 1) {
            t.equals(metadata.name, 'map');
            t.equals(typeof metadata.data, 'undefined');
            t.equals(typeof metadata.timestamp, 'undefined');
            t.equals(typeof metadata.source, 'object');

            t.equals(metadata.source.name, 'once');
            t.equals(typeof metadata.source.data, 'undefined');
            t.equals(typeof metadata.source.timestamp, 'undefined');
            t.equals(typeof metadata.source.source, 'undefined');
            t.pass('1st metadata object looks correct');
          }
          if (index === 2) {
            t.equals(metadata.name, 'map');
            t.equals(typeof metadata.data, 'undefined');
            t.equals(typeof metadata.timestamp, 'undefined');
            t.equals(typeof metadata.source, 'object');

            t.equals(metadata.source.name, 'once');
            t.equals(metadata.source.data, 42);
            t.equals(typeof metadata.source.timestamp, 'number');
            t.equals(typeof metadata.source.source, 'undefined');
            t.pass('2nd metadata object looks correct');
          }
          if (index === 3) {
            t.equals(metadata.name, 'map');
            t.equals(metadata.data, 12);
            t.equals(typeof metadata.timestamp, 'number');
            t.equals(typeof metadata.source, 'object');

            t.equals(metadata.source.name, 'once');
            t.equals(metadata.source.data, 42);
            t.equals(typeof metadata.source.timestamp, 'number');
            t.equals(typeof metadata.source.source, 'undefined');

            t.true(metadata.timestamp > metadata.source.timestamp);
            t.pass('3rd metadata object looks correct');
            t.end();
          }
          if (index >= 4) {
            t.fail('should not get a 4th metadata object');
          }
        }
      });
    }
  });
});
