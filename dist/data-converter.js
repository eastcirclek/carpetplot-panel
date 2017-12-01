'use strict';

System.register(['moment', './aggregates', './fragments'], function (_export, _context) {
  "use strict";

  var moment, aggregate, getFragment, _extends, _slicedToArray, createConverter;

  return {
    setters: [function (_moment) {
      moment = _moment.default;
    }, function (_aggregates) {
      aggregate = _aggregates.aggregate;
    }, function (_fragments) {
      getFragment = _fragments.getFragment;
    }],
    execute: function () {
      _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];

          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }

        return target;
      };

      _slicedToArray = function () {
        function sliceIterator(arr, i) {
          var _arr = [];
          var _n = true;
          var _d = false;
          var _e = undefined;

          try {
            for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
              _arr.push(_s.value);

              if (i && _arr.length === i) break;
            }
          } catch (err) {
            _d = true;
            _e = err;
          } finally {
            try {
              if (!_n && _i["return"]) _i["return"]();
            } finally {
              if (_d) throw _e;
            }
          }

          return _arr;
        }

        return function (arr, i) {
          if (Array.isArray(arr)) {
            return arr;
          } else if (Symbol.iterator in Object(arr)) {
            return sliceIterator(arr, i);
          } else {
            throw new TypeError("Invalid attempt to destructure non-iterable instance");
          }
        };
      }();

      createConverter = function createConverter(aggregateType, fragmentType) {

        var prepareData = function prepareData(from, to, fragment) {
          var data = {};
          var fromUtc = moment.utc(from).startOf('day');
          var toUtc = moment.utc(to).startOf('day').add(1, 'day');
          // timeUtc = timeUtc.add(1, 'day')
          for (var timeUtc = moment.utc(fromUtc); timeUtc.isBefore(toUtc); timeUtc = fragment.nextTime(timeUtc)) {
            data[timeUtc.valueOf()] = {
              // time: timeUtc.clone(),
              timestamp: timeUtc.valueOf(),
              values: {}
            };
          }
          return {
            data: data,
            from: fromUtc,
            to: toUtc
          };
        };

        var groupData = function groupData(from, to, fragment, dataList) {
          var container = prepareData(from, to, fragment);
          var targets = _.map(dataList, 'target');
          container.targets = targets;

          dataList.forEach(function (_ref) {
            var target = _ref.target,
                datapoints = _ref.datapoints;

            datapoints.filter(function (_ref2) {
              var _ref3 = _slicedToArray(_ref2, 1),
                  value = _ref3[0];

              return value !== null;
            }).forEach(function (_ref4) {
              var _ref5 = _slicedToArray(_ref4, 2),
                  value = _ref5[0],
                  timestamp = _ref5[1];

              var bucketTimestamp = fragment.getBucketTimestamp(timestamp);
              if (!(bucketTimestamp in container.data)) {
                return;
              }
              if (!(target in container.data[bucketTimestamp].values)) {
                container.data[bucketTimestamp].values[target] = [];
              }
              container.data[bucketTimestamp].values[target].push(value);
            });
          });

          return container;
        };

        var aggregateData = function aggregateData(from, to, fragment, container) {
          var data = container.data;
          var aggregateFunc = aggregate(aggregateType);
          var result = [];

          var createBucket = function createBucket(timestamp) {
            return {
              timestamp: timestamp,
              buckets: {}
            };
          };

          // let bucket = createBucket(moment(from).startOf('day'));
          var bucket = void 0;
          if (data && _.size(data) > 0) {
            var firstTimestamp = _.first(_.values(data))['timestamp'];
            bucket = createBucket(firstTimestamp);
          }

          Object.values(data).forEach(function (_ref6) {
            var timestamp = _ref6.timestamp,
                values = _ref6.values;

            if (timestamp < bucket.timestamp) {
              return;
            }

            var bucketTimestamp = fragment.getBucketTimestamp(timestamp);
            if (bucket.timestamp != bucketTimestamp) {
              result.push(_extends({}, bucket));
              bucket = createBucket(bucketTimestamp);
            }

            _.forOwn(values, function (arr, target) {
              var value = arr.length > 0 ? aggregateFunc(arr) : null;

              bucket.buckets[target] = value;
            });
          });

          result.push(_extends({}, bucket));

          return result;
        };

        var normalizeData = function normalizeData(data) {
          return _.map(data, function (obj) {
            var values = _.values(obj.buckets);
            var sum = _.sum(values);
            // const sortedValues = _.sortBy(values);

            obj.buckets = _.mapValues(obj.buckets, function (value) {
              return value / sum;
            }
            // function(value) {
            //   const rank = values.length - _.sortedIndexOf(sortedValues, value);
            //   if (rank < 5) {
            //     return value/sum;
            //   } else {
            //     return 0;
            //   }
            // }
            );

            return obj;
          });
        };

        var rankData = function rankData(data) {
          return _.map(data, function (obj) {

            var sortedValues = _.sortBy(_.values(obj.buckets));

            obj.buckets = _.mapValues(obj.buckets, function (value) {
              return _.indexOf(sortedValues, value);
            });

            return obj;
          });
        };

        var convertData = function convertData(from, to, dataList, processingMode) {
          var fragment = getFragment(fragmentType);
          var container = groupData(from, to, fragment, dataList);
          var agg = aggregateData(from, to, fragment, container);
          if (_.eq(processingMode, 'normalize')) {
            agg = normalizeData(agg);
          } else if (_.eq(processingMode, 'rank')) {
            agg = rankData(agg);
          }
          var allValues = _.flatten(_.map(agg, function (obj) {
            return _.values(obj.buckets);
          }));
          var data = {
            data: agg,
            stats: {
              min: _.min(allValues),
              max: _.max(allValues)
            }
          };

          return _extends({}, container, data);
        };

        return {
          convertData: convertData
        };
      };

      _export('default', createConverter);
    }
  };
});
//# sourceMappingURL=data-converter.js.map
