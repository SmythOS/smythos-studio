function initSmythFlowchartConnector(root) {
  'use strict';
  var _jp = root.jsPlumb,
    _ju = root.jsPlumbUtil;
  var STRAIGHT = 'Straight';
  var ARC = 'Arc';

  var SmythFlowchart = function (params) {
    this.type = 'SmythFlowchart';
    params = params || {};
    params.stub = params.stub == null ? 30 : params.stub;
    var segments,
      _super = _jp.Connectors.AbstractConnector.apply(this, arguments),
      midpoint = params.midpoint == null || isNaN(params.midpoint) ? 0.5 : params.midpoint,
      alwaysRespectStubs = params.alwaysRespectStubs === true,
      lastx = null,
      lasty = null,
      lastOrientation,
      cornerRadius = params.cornerRadius != null ? params.cornerRadius : 0,
      // TODO now common between this and AbstractBezierEditor; refactor into superclass?
      loopbackRadius = params.loopbackRadius || 25,
      isLoopbackCurrently = false,
      sgn = function (n) {
        return n < 0 ? -1 : n === 0 ? 0 : 1;
      },
      segmentDirections = function (segment) {
        return [sgn(segment[2] - segment[0]), sgn(segment[3] - segment[1])];
      },
      /**
       * helper method to add a segment.
       */
      addSegment = function (segments, x, y, paintInfo) {
        if (lastx === x && lasty === y) {
          return;
        }
        var lx = lastx == null ? paintInfo.sx : lastx,
          ly = lasty == null ? paintInfo.sy : lasty,
          o = lx === x ? 'v' : 'h';

        lastx = x;
        lasty = y;
        segments.push([lx, ly, x, y, o]);
      },
      segLength = function (s) {
        return Math.sqrt(Math.pow(s[0] - s[2], 2) + Math.pow(s[1] - s[3], 2));
      },
      _cloneArray = function (a) {
        var _a = [];
        _a.push.apply(_a, a);
        return _a;
      },
      writeSegments = function (conn, segments, paintInfo) {
        var current = null,
          next,
          currentDirection,
          nextDirection;
        for (var i = 0; i < segments.length - 1; i++) {
          current = current || _cloneArray(segments[i]);
          next = _cloneArray(segments[i + 1]);

          currentDirection = segmentDirections(current);
          nextDirection = segmentDirections(next);

          if (cornerRadius > 0 && current[4] !== next[4]) {
            var minSegLength = Math.min(segLength(current), segLength(next));
            //var radiusToUse = Math.min(cornerRadius, minSegLength / 2);
            var radiusToUse = Math.min(cornerRadius, minSegLength / 1.5);

            current[2] -= currentDirection[0] * radiusToUse;
            current[3] -= currentDirection[1] * radiusToUse;
            next[0] += nextDirection[0] * radiusToUse;
            next[1] += nextDirection[1] * radiusToUse;

            var ac =
                (currentDirection[1] === nextDirection[0] && nextDirection[0] === 1) ||
                (currentDirection[1] === nextDirection[0] &&
                  nextDirection[0] === 0 &&
                  currentDirection[0] !== nextDirection[1]) ||
                (currentDirection[1] === nextDirection[0] && nextDirection[0] === -1),
              sgny = next[1] > current[3] ? 1 : -1,
              sgnx = next[0] > current[2] ? 1 : -1,
              sgnEqual = sgny === sgnx,
              cx = (sgnEqual && ac) || (!sgnEqual && !ac) ? next[0] : current[2],
              cy = (sgnEqual && ac) || (!sgnEqual && !ac) ? current[3] : next[1];

            _super.addSegment(conn, STRAIGHT, {
              x1: current[0],
              y1: current[1],
              x2: current[2],
              y2: current[3],
            });

            _super.addSegment(conn, ARC, {
              r: radiusToUse,
              x1: current[2],
              y1: current[3],
              x2: next[0],
              y2: next[1],
              cx: cx,
              cy: cy,
              ac: ac,
            });
          } else {
            // dx + dy are used to adjust for line width.
            var dx =
                current[2] === current[0]
                  ? 0
                  : current[2] > current[0]
                  ? paintInfo.lw / 2
                  : -(paintInfo.lw / 2),
              dy =
                current[3] === current[1]
                  ? 0
                  : current[3] > current[1]
                  ? paintInfo.lw / 2
                  : -(paintInfo.lw / 2);

            _super.addSegment(conn, STRAIGHT, {
              x1: current[0] - dx,
              y1: current[1] - dy,
              x2: current[2] + dx,
              y2: current[3] + dy,
            });
          }
          current = next;
        }
        if (next != null) {
          // last segment
          _super.addSegment(conn, STRAIGHT, {
            x1: next[0],
            y1: next[1],
            x2: next[2],
            y2: next[3],
          });
        }
      };

    this.midpoint = midpoint;

    this._compute = function (paintInfo, params) {
      segments = [];
      lastx = null;
      lasty = null;
      lastOrientation = null;
      if (!paintInfo._meta) paintInfo._meta = {};
      var _source_dom = params.sourceEndpoint._domElement;
      var _target_dom = params.targetEndpoint._domElement;

      if (!_source_dom.classList.contains('output-endpoint')) {
        [_source_dom, _target_dom] = [_target_dom, _source_dom];
      }
      let stubXDelta = 0;

      const zoom = this._jsPlumb.instance.getZoom();
      if (_source_dom && _target_dom) {
        const sourceBR = _source_dom.getBoundingClientRect();
        const targetBR = _target_dom.getBoundingClientRect();
        const sourceComponentElement =
          paintInfo._meta.sourceComponentElement || _source_dom.closest('.component');
        paintInfo._meta.sourceComponentElement = sourceComponentElement;

        const sourceComponentBR = sourceComponentElement.getBoundingClientRect();

        const targetComponentElement =
          paintInfo._meta.targetComponentElement || _target_dom.closest('.component');
        paintInfo._meta.targetComponentElement = targetComponentElement;

        const targetComponentBR = targetComponentElement.getBoundingClientRect();

        const outputsElement =
          paintInfo._meta.outputsElement ||
          sourceComponentElement.querySelector('.ep-control.outputs');
        paintInfo._meta.outputsElement = outputsElement;

        const inputsElement =
          paintInfo._meta.inputsElement ||
          targetComponentElement.querySelector('.ep-control.inputs');
        paintInfo._meta.inputsElement = inputsElement;

        const outputsElementBR = outputsElement.getBoundingClientRect();
        const inputsElementBR = inputsElement.getBoundingClientRect();

        if (targetBR.left <= sourceBR.right) {
          const delta_distance = sourceComponentBR.bottom - sourceBR.top;
          const delta_midpoint =
            delta_distance / (sourceComponentBR.bottom - outputsElementBR.bottom);

          const distance = sourceComponentBR.bottom - 15 * zoom - sourceBR.top;
          midpoint = distance / (targetBR.bottom - sourceBR.bottom);
          midpoint +=
            targetComponentBR.bottom > sourceComponentBR.bottom
              ? delta_midpoint / 10
              : -delta_midpoint / 10;

          if (targetComponentBR.bottom < sourceComponentBR.top) {
            const distance = sourceBR.top - sourceComponentBR.top + 15 * zoom;
            midpoint = distance / (sourceBR.bottom - targetBR.bottom);
            midpoint +=
              targetComponentBR.bottom < sourceComponentBR.bottom
                ? delta_midpoint / 10
                : -delta_midpoint / 10;
          }

          stubXDelta = 26 * delta_midpoint;

          //midpoint *= zoom;
          //stubXDelta *= zoom;
        } else {
          const hdistance = targetBR.left - sourceBR.right;
          const distance = sourceComponentBR.bottom - sourceBR.top;
          midpoint = distance / (sourceComponentBR.bottom - outputsElementBR.bottom);

          if (inputsElementBR.bottom < outputsElementBR.top) {
            midpoint = 1 - midpoint;
          }

          if (hdistance > 110) {
            midpoint *= (1 / hdistance) * 100 * 0.6;
          }

          midpoint *= zoom;
          // if (hdistance > 300) {
          //     midpoint *= 0.1;
          // }
        }
      }

      var commonStubCalculator = function () {
          return [
            paintInfo.startStubX,
            paintInfo.startStubY,
            paintInfo.endStubX,
            paintInfo.endStubY,
          ];
        },
        stubCalculators = {
          perpendicular: commonStubCalculator,
          orthogonal: commonStubCalculator,
          opposite: function (axis) {
            var pi = paintInfo,
              idx = axis === 'x' ? 0 : 1,
              areInProximity = {
                x: function () {
                  return (
                    (pi.so[idx] === 1 &&
                      ((pi.startStubX > pi.endStubX && pi.tx > pi.startStubX) ||
                        (pi.sx > pi.endStubX && pi.tx > pi.sx))) ||
                    (pi.so[idx] === -1 &&
                      ((pi.startStubX < pi.endStubX && pi.tx < pi.startStubX) ||
                        (pi.sx < pi.endStubX && pi.tx < pi.sx)))
                  );
                },
                y: function () {
                  return (
                    (pi.so[idx] === 1 &&
                      ((pi.startStubY > pi.endStubY && pi.ty > pi.startStubY) ||
                        (pi.sy > pi.endStubY && pi.ty > pi.sy))) ||
                    (pi.so[idx] === -1 &&
                      ((pi.startStubY < pi.endStubY && pi.ty < pi.startStubY) ||
                        (pi.sy < pi.endStubY && pi.ty < pi.sy)))
                  );
                },
              };

            if (!alwaysRespectStubs && areInProximity[axis]()) {
              return {
                x: [
                  (paintInfo.sx + paintInfo.tx) / 2,
                  paintInfo.startStubY,
                  (paintInfo.sx + paintInfo.tx) / 2,
                  paintInfo.endStubY,
                ],
                y: [
                  paintInfo.startStubX,
                  (paintInfo.sy + paintInfo.ty) / 2,
                  paintInfo.endStubX,
                  (paintInfo.sy + paintInfo.ty) / 2,
                ],
              }[axis];
            } else {
              return [
                paintInfo.startStubX + stubXDelta,
                paintInfo.startStubY,
                paintInfo.endStubX + stubXDelta - 20,
                paintInfo.endStubY,
              ];
            }
          },
        };

      // calculate Stubs.
      var stubs = stubCalculators[paintInfo.anchorOrientation](paintInfo.sourceAxis),
        idx = paintInfo.sourceAxis === 'x' ? 0 : 1,
        oidx = paintInfo.sourceAxis === 'x' ? 1 : 0,
        ss = stubs[idx],
        oss = stubs[oidx],
        es = stubs[idx + 2],
        oes = stubs[oidx + 2];

      // add the start stub segment. use stubs for loopback as it will look better, with the loop spaced
      // away from the element.
      addSegment(segments, stubs[0], stubs[1], paintInfo);

      // if its a loopback and we should treat it differently.
      // if (false && params.sourcePos[0] === params.targetPos[0] && params.sourcePos[1] === params.targetPos[1]) {
      //
      //     // we use loopbackRadius here, as statemachine connectors do.
      //     // so we go radius to the left from stubs[0], then upwards by 2*radius, to the right by 2*radius,
      //     // down by 2*radius, left by radius.
      //     addSegment(segments, stubs[0] - loopbackRadius, stubs[1], paintInfo);
      //     addSegment(segments, stubs[0] - loopbackRadius, stubs[1] - (2 * loopbackRadius), paintInfo);
      //     addSegment(segments, stubs[0] + loopbackRadius, stubs[1] - (2 * loopbackRadius), paintInfo);
      //     addSegment(segments, stubs[0] + loopbackRadius, stubs[1], paintInfo);
      //     addSegment(segments, stubs[0], stubs[1], paintInfo);
      //
      // }
      // else {

      var midx = paintInfo.startStubX + (paintInfo.endStubX - paintInfo.startStubX) * midpoint,
        midy = paintInfo.startStubY + (paintInfo.endStubY - paintInfo.startStubY) * midpoint;

      var orientations = { x: [0, 1], y: [1, 0] },
        lineCalculators = {
          perpendicular: function (axis) {
            var pi = paintInfo,
              sis = {
                x: [[[1, 2, 3, 4], null, [2, 1, 4, 3]], null, [[4, 3, 2, 1], null, [3, 4, 1, 2]]],
                y: [[[3, 2, 1, 4], null, [2, 3, 4, 1]], null, [[4, 1, 2, 3], null, [1, 4, 3, 2]]],
              },
              stubs = {
                x: [[pi.startStubX, pi.endStubX], null, [pi.endStubX, pi.startStubX]],
                y: [[pi.startStubY, pi.endStubY], null, [pi.endStubY, pi.startStubY]],
              },
              midLines = {
                x: [
                  [midx, pi.startStubY],
                  [midx, pi.endStubY],
                ],
                y: [
                  [pi.startStubX, midy],
                  [pi.endStubX, midy],
                ],
              },
              linesToEnd = {
                x: [[pi.endStubX, pi.startStubY]],
                y: [[pi.startStubX, pi.endStubY]],
              },
              startToEnd = {
                x: [
                  [pi.startStubX, pi.endStubY],
                  [pi.endStubX, pi.endStubY],
                ],
                y: [
                  [pi.endStubX, pi.startStubY],
                  [pi.endStubX, pi.endStubY],
                ],
              },
              startToMidToEnd = {
                x: [
                  [pi.startStubX, midy],
                  [pi.endStubX, midy],
                  [pi.endStubX, pi.endStubY],
                ],
                y: [
                  [midx, pi.startStubY],
                  [midx, pi.endStubY],
                  [pi.endStubX, pi.endStubY],
                ],
              },
              otherStubs = {
                x: [pi.startStubY, pi.endStubY],
                y: [pi.startStubX, pi.endStubX],
              },
              soIdx = orientations[axis][0],
              toIdx = orientations[axis][1],
              _so = pi.so[soIdx] + 1,
              _to = pi.to[toIdx] + 1,
              otherFlipped =
                (pi.to[toIdx] === -1 && otherStubs[axis][1] < otherStubs[axis][0]) ||
                (pi.to[toIdx] === 1 && otherStubs[axis][1] > otherStubs[axis][0]),
              stub1 = stubs[axis][_so][0],
              stub2 = stubs[axis][_so][1],
              segmentIndexes = sis[axis][_so][_to];

            if (
              pi.segment === segmentIndexes[3] ||
              (pi.segment === segmentIndexes[2] && otherFlipped)
            ) {
              return midLines[axis];
            } else if (pi.segment === segmentIndexes[2] && stub2 < stub1) {
              return linesToEnd[axis];
            } else if (
              (pi.segment === segmentIndexes[2] && stub2 >= stub1) ||
              (pi.segment === segmentIndexes[1] && !otherFlipped)
            ) {
              return startToMidToEnd[axis];
            } else if (
              pi.segment === segmentIndexes[0] ||
              (pi.segment === segmentIndexes[1] && otherFlipped)
            ) {
              return startToEnd[axis];
            }
          },
          orthogonal: function (axis, startStub, otherStartStub, endStub, otherEndStub) {
            var pi = paintInfo,
              extent = {
                x: pi.so[0] === -1 ? Math.min(startStub, endStub) : Math.max(startStub, endStub),
                y: pi.so[1] === -1 ? Math.min(startStub, endStub) : Math.max(startStub, endStub),
              }[axis];

            return {
              x: [
                [extent, otherStartStub],
                [extent, otherEndStub],
                [endStub, otherEndStub],
              ],
              y: [
                [otherStartStub, extent],
                [otherEndStub, extent],
                [otherEndStub, endStub],
              ],
            }[axis];
          },
          opposite: function (axis, ss, oss, es) {
            var pi = paintInfo,
              otherAxis = { x: 'y', y: 'x' }[axis],
              dim = { x: 'height', y: 'width' }[axis],
              comparator = pi['is' + axis.toUpperCase() + 'GreaterThanStubTimes2'];

            if (params.sourceEndpoint.elementId === params.targetEndpoint.elementId) {
              var _val =
                oss +
                (1 - params.sourceEndpoint.anchor[otherAxis]) * params.sourceInfo[dim] +
                _super.maxStub;
              return {
                x: [
                  [ss, _val],
                  [es, _val],
                ],
                y: [
                  [_val, ss],
                  [_val, es],
                ],
              }[axis];
            } else if (
              !comparator ||
              (pi.so[idx] === 1 && ss > es) ||
              (pi.so[idx] === -1 && ss < es)
            ) {
              return {
                x: [
                  [ss, midy],
                  [es, midy],
                ],
                y: [
                  [midx, ss],
                  [midx, es],
                ],
              }[axis];
            } else if ((pi.so[idx] === 1 && ss < es) || (pi.so[idx] === -1 && ss > es)) {
              return {
                x: [
                  [midx, pi.sy],
                  [midx, pi.ty],
                ],
                y: [
                  [pi.sx, midy],
                  [pi.tx, midy],
                ],
              }[axis];
            }
          },
        };

      // compute the rest of the line
      var p = lineCalculators[paintInfo.anchorOrientation](paintInfo.sourceAxis, ss, oss, es, oes);
      if (p) {
        for (var i = 0; i < p.length; i++) {
          addSegment(segments, p[i][0], p[i][1], paintInfo);
        }
      }

      // line to end stub
      addSegment(segments, stubs[2], stubs[3], paintInfo);

      //}

      // end stub to end (common)
      addSegment(segments, paintInfo.tx, paintInfo.ty, paintInfo);

      // write out the segments.
      writeSegments(this, segments, paintInfo);
    };
  };

  _jp.Connectors.SmythFlowchart = SmythFlowchart;
  _ju.extend(_jp.Connectors.SmythFlowchart, _jp.Connectors.AbstractConnector);
  //console.log('jsPlumb SmythFlowchart connector registered');
}

function initSmythBezierConnector(root) {
  'use strict';
  var _jp = root.jsPlumb,
    _ju = root.jsPlumbUtil;
  var SmythBezier = function (params) {
    params = params || {};
    this.type = 'SmythBezier';

    var _super = _jp.Connectors.AbstractBezierConnector.apply(this, arguments),
      majorAnchor = params.curviness || 150,
      minorAnchor = 10;

    this.getCurviness = function () {
      return majorAnchor;
    };

    this._findControlPoint = function (
      point,
      sourceAnchorPosition,
      targetAnchorPosition,
      sourceEndpoint,
      targetEndpoint,
      soo,
      too,
    ) {
      let mjAnchor = majorAnchor;
      let _source_dom = sourceEndpoint._domElement;
      let _target_dom = targetEndpoint._domElement;

      try {
        if (_source_dom && _target_dom) {
          if (!_source_dom.classList.contains('output-endpoint')) {
            [_source_dom, _target_dom] = [_target_dom, _source_dom];
          }

          var sourceBR = _source_dom.closest('.component').getBoundingClientRect();
          var targetBR = _target_dom.closest('.component').getBoundingClientRect();

          const hdiff = targetBR.left - sourceBR.right;
          const stacked = sourceBR.bottom < targetBR.top || targetBR.bottom < sourceBR.top;
          const vdiff = Math.min(
            Math.abs(sourceBR.top - targetBR.bottom),
            Math.abs(sourceBR.bottom - targetBR.top),
          );
          mjAnchor = stacked || hdiff > 150 ? majorAnchor : 50;
        } else {
          mjAnchor = minorAnchor;
        }
      } catch (e) {
        console.log('Error in _findControlPoint', e);
      }
      // determine if the two anchors are perpendicular to each other in their orientation.  we swap the control
      // points around if so (code could be tightened up)
      var perpendicular = soo[0] !== too[0] || soo[1] === too[1],
        p = [];

      if (!perpendicular) {
        if (soo[0] === 0) {
          p.push(
            sourceAnchorPosition[0] < targetAnchorPosition[0]
              ? point[0] + minorAnchor
              : point[0] - minorAnchor,
          );
        } else {
          p.push(point[0] - mjAnchor * soo[0]);
        }

        if (soo[1] === 0) {
          p.push(
            sourceAnchorPosition[1] < targetAnchorPosition[1]
              ? point[1] + minorAnchor
              : point[1] - minorAnchor,
          );
        } else {
          p.push(point[1] + mjAnchor * too[1]);
        }
      } else {
        if (too[0] === 0) {
          p.push(
            targetAnchorPosition[0] < sourceAnchorPosition[0]
              ? point[0] + minorAnchor
              : point[0] - minorAnchor,
          );
        } else {
          p.push(point[0] + mjAnchor * too[0]);
        }

        if (too[1] === 0) {
          p.push(
            targetAnchorPosition[1] < sourceAnchorPosition[1]
              ? point[1] + minorAnchor
              : point[1] - minorAnchor,
          );
        } else {
          p.push(point[1] + mjAnchor * soo[1]);
        }
      }

      return p;
    };

    this._computeBezier = function (paintInfo, p, sp, tp, _w, _h) {
      var _CP,
        _CP2,
        _sx = sp[0] < tp[0] ? _w : 0,
        _sy = sp[1] < tp[1] ? _h : 0,
        _tx = sp[0] < tp[0] ? 0 : _w,
        _ty = sp[1] < tp[1] ? 0 : _h;

      _CP = this._findControlPoint(
        [_sx, _sy],
        sp,
        tp,
        p.sourceEndpoint,
        p.targetEndpoint,
        paintInfo.so,
        paintInfo.to,
      );
      _CP2 = this._findControlPoint(
        [_tx, _ty],
        tp,
        sp,
        p.targetEndpoint,
        p.sourceEndpoint,
        paintInfo.to,
        paintInfo.so,
      );

      _super.addSegment(this, 'Bezier', {
        x1: _sx,
        y1: _sy,
        x2: _tx,
        y2: _ty,
        cp1x: _CP[0],
        cp1y: _CP[1],
        cp2x: _CP2[0],
        cp2y: _CP2[1],
      });
    };
  };

  _jp.Connectors.SmythBezier = SmythBezier;
  _ju.extend(SmythBezier, _jp.Connectors.AbstractBezierConnector);
  //console.log('jsPlumb SmythBezier connector registered');
}

export function extendJsPlumb() {
  initSmythFlowchartConnector(window);
  initSmythBezierConnector(window);
}
