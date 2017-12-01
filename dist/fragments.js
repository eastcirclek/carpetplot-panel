'use strict';

System.register(['moment'], function (_export, _context) {
  "use strict";

  var moment, _fragments, TWENTYFOUR, TWELVE, SIX, fragments, fragmentsMap, getFragment;

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  return {
    setters: [function (_moment) {
      moment = _moment.default;
    }],
    execute: function () {
      TWENTYFOUR = 'TWENTYFOUR';
      TWELVE = 'TWELVE';
      SIX = 'SIX';
      fragments = (_fragments = {}, _defineProperty(_fragments, TWENTYFOUR, {
        // getBucketIndex: (time) => time.hour() * 60 + time.minute(),
        // getTime: (time, bucketIndex) => moment(time).startOf('day').add(bucketIndex, 'minute'),
        getBucketIndex: function getBucketIndex(time, from) {
          return time.diff(from, 'hours') / 24;
        },
        getBucketTimestamp: function getBucketTimestamp(timestamp) {
          return moment.utc(timestamp).startOf('day').valueOf();
        },
        nextTime: function nextTime(time) {
          return moment.utc(time).add(24, 'hour');
        }
      }), _defineProperty(_fragments, TWELVE, {
        // getBucketIndex: (time) => time.hour() * 4 + Math.floor(time.minute() / 15),
        // getTime: (time, bucketIndex) => moment(time).startOf('day').add(15 * bucketIndex, 'minute'),
        getBucketIndex: function getBucketIndex(time, from) {
          return time.diff(from, 'hours') / 12;
        },
        getBucketTimestamp: function getBucketTimestamp(timestamp) {
          var timeUtc = moment.utc(timestamp);
          var hours = Math.floor(timeUtc.hour() / 12) * 12;
          return timeUtc.startOf('day').add(hours, 'hour').valueOf();
        },
        nextTime: function nextTime(time) {
          return moment.utc(time).add(12, 'hour');
        }
      }), _defineProperty(_fragments, SIX, {
        // getBucketIndex: (time) => time.hour(),
        // getTime: (time, bucketIndex) => moment(time).startOf('day').add(bucketIndex, 'hour'),
        getBucketIndex: function getBucketIndex(time, from) {
          return time.diff(from, 'hours') / 6;
        },
        getBucketTimestamp: function getBucketTimestamp(timestamp) {
          var timeUtc = moment.utc(timestamp);
          var hours = Math.floor(timeUtc.hour() / 6) * 6;
          return timeUtc.startOf('day').add(hours, 'hour').valueOf();
        },
        nextTime: function nextTime(time) {
          return moment.utc(time).add(6, 'hour');
        }
      }), _fragments);

      _export('fragmentsMap', fragmentsMap = [{ name: 'Day', value: TWENTYFOUR }, { name: '12 hours', value: TWELVE }, { name: '6 hours', value: SIX }]);

      _export('fragmentsMap', fragmentsMap);

      _export('getFragment', getFragment = function getFragment(fragmentType) {
        return fragments[fragmentType];
      });

      _export('getFragment', getFragment);

      _export('default', {
        TWENTYFOUR: TWENTYFOUR,
        TWELVE: TWELVE,
        SIX: SIX
      });
    }
  };
});
//# sourceMappingURL=fragments.js.map
