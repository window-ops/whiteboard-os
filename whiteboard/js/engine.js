'use strict';

/*
 * The whiteboard engine.
 *
 * This is written directly against the canvas, since the project has no build
 * step and the drawing libraries worth borrowing are React applications that
 * assume one. Drawing it here also keeps the toolbar in the same icon font and
 * theme variables as the rest of the system, and pointer events reach mouse,
 * pen and touch through one path.
 *
 * Shapes are kept in world coordinates and drawn through one transform, which
 * is what makes panning, zooming and exporting to SVG the same operation seen
 * three ways. Erasing removes whole shapes rather than pixels, so a snapshot
 * stays a list of objects and can be exported as vectors at any size.
 */

const WOSBoard = (() => {
  const VERSION = 1;
  const HIT_SLACK = 8;
  const MAX_HISTORY = 60;

  const create = (canvas, options) => {
    const settings = options || {};
    const context = canvas.getContext('2d');

    const state = {
      shapes: [],
      undone: [],
      view: { x: 0, y: 0, scale: 1 },
      tool: 'pen',
      colour: '#1b1b1b',
      width: 3,
      filled: false,
      background: '#ffffff'
    };

    let drawing = null;
    let panning = null;
    let onChange = settings.onChange || null;

    const changed = () => {
      if (typeof onChange === 'function') {
        onChange(state);
      }
    };

    // Geometry

    const toWorld = (clientX, clientY) => {
      const box = canvas.getBoundingClientRect();

      return {
        x: (clientX - box.left - state.view.x) / state.view.scale,
        y: (clientY - box.top - state.view.y) / state.view.scale
      };
    };

    const bounds = (shape) => {
      const points = shape.points;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });

      if (shape.kind === 'text') {
        maxX = minX + (shape.text || '').length * shape.size * 0.55;
        maxY = minY + shape.size;
      }

      return { minX, minY, maxX, maxY };
    };

    const distanceToSegment = (point, a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lengthSquared = dx * dx + dy * dy;

      if (lengthSquared === 0) {
        return Math.hypot(point.x - a.x, point.y - a.y);
      }

      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));

      return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
    };

    const hits = (shape, point) => {
      const slack = HIT_SLACK / state.view.scale + shape.width / 2;
      const box = bounds(shape);

      if (point.x < box.minX - slack || point.x > box.maxX + slack
        || point.y < box.minY - slack || point.y > box.maxY + slack) {
        return false;
      }

      if (shape.kind === 'text' || shape.filled) {
        return true;
      }

      if (shape.kind === 'pen' || shape.kind === 'line' || shape.kind === 'arrow') {
        for (let i = 1; i < shape.points.length; i++) {
          if (distanceToSegment(point, shape.points[i - 1], shape.points[i]) <= slack) {
            return true;
          }
        }

        return shape.points.length === 1
          && Math.hypot(point.x - shape.points[0].x, point.y - shape.points[0].y) <= slack;
      }

      /* An outline is a hit near its edge rather than anywhere inside. */
      const inner = slack;

      return point.x <= box.minX + inner || point.x >= box.maxX - inner
        || point.y <= box.minY + inner || point.y >= box.maxY - inner;
    };

    // History

    const remember = () => {
      state.undone = [];

      if (state.shapes.length > MAX_HISTORY * 4) {
        state.shapes = state.shapes.slice(-MAX_HISTORY * 4);
      }
    };

    // Drawing

    const strokePath = (target, shape) => {
      const points = shape.points;

      target.beginPath();

      if (points.length === 1) {
        target.arc(points[0].x, points[0].y, shape.width / 2, 0, Math.PI * 2);
        target.fillStyle = shape.colour;
        target.fill();
        return;
      }

      target.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const middleX = (points[i].x + points[i + 1].x) / 2;
        const middleY = (points[i].y + points[i + 1].y) / 2;

        target.quadraticCurveTo(points[i].x, points[i].y, middleX, middleY);
      }

      target.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      target.stroke();
    };

    const drawArrowHead = (target, from, to, size) => {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const length = Math.max(10, size * 3.2);

      target.beginPath();
      target.moveTo(to.x, to.y);
      target.lineTo(to.x - length * Math.cos(angle - 0.4), to.y - length * Math.sin(angle - 0.4));
      target.moveTo(to.x, to.y);
      target.lineTo(to.x - length * Math.cos(angle + 0.4), to.y - length * Math.sin(angle + 0.4));
      target.stroke();
    };

    const drawShape = (target, shape) => {
      target.save();
      target.strokeStyle = shape.colour;
      target.fillStyle = shape.colour;
      target.lineWidth = shape.width;
      target.lineCap = 'round';
      target.lineJoin = 'round';

      const box = bounds(shape);

      if (shape.kind === 'pen') {
        strokePath(target, shape);
      } else if (shape.kind === 'line') {
        target.beginPath();
        target.moveTo(shape.points[0].x, shape.points[0].y);
        target.lineTo(shape.points[1].x, shape.points[1].y);
        target.stroke();
      } else if (shape.kind === 'arrow') {
        target.beginPath();
        target.moveTo(shape.points[0].x, shape.points[0].y);
        target.lineTo(shape.points[1].x, shape.points[1].y);
        target.stroke();
        drawArrowHead(target, shape.points[0], shape.points[1], shape.width);
      } else if (shape.kind === 'rectangle') {
        target.beginPath();
        target.rect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);

        if (shape.filled) {
          target.fill();
        }

        target.stroke();
      } else if (shape.kind === 'ellipse') {
        target.beginPath();
        target.ellipse(
          (box.minX + box.maxX) / 2,
          (box.minY + box.maxY) / 2,
          Math.abs(box.maxX - box.minX) / 2,
          Math.abs(box.maxY - box.minY) / 2,
          0, 0, Math.PI * 2
        );

        if (shape.filled) {
          target.fill();
        }

        target.stroke();
      } else if (shape.kind === 'text') {
        target.font = `${shape.size}px Arial, sans-serif`;
        target.textBaseline = 'top';
        target.fillText(shape.text, shape.points[0].x, shape.points[0].y);
      }

      target.restore();
    };

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const box = canvas.getBoundingClientRect();

      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      render();
    };

    const render = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = state.background;
      context.fillRect(0, 0, box.width, box.height);

      context.translate(state.view.x, state.view.y);
      context.scale(state.view.scale, state.view.scale);

      state.shapes.forEach((shape) => {
        drawShape(context, shape);
      });

      if (drawing !== null) {
        drawShape(context, drawing);
      }
    };

    // Input

    const startShape = (point) => {
      const base = {
        kind: state.tool,
        colour: state.colour,
        width: state.width,
        filled: state.filled,
        points: [point]
      };

      if (state.tool === 'pen') {
        return base;
      }

      base.points = [point, { x: point.x, y: point.y }];

      return base;
    };

    const onPointerDown = (event) => {
      canvas.setPointerCapture(event.pointerId);

      const point = toWorld(event.clientX, event.clientY);

      if (state.tool === 'pan' || event.button === 1 || event.shiftKey) {
        panning = { x: event.clientX, y: event.clientY };
        return;
      }

      if (state.tool === 'eraser') {
        const before = state.shapes.length;

        state.shapes = state.shapes.filter((shape) => hits(shape, point) === false);

        if (state.shapes.length !== before) {
          remember();
          render();
          changed();
        }

        drawing = { kind: 'erasing' };
        return;
      }

      if (state.tool === 'text') {
        if (typeof settings.onTextRequest === 'function') {
          settings.onTextRequest(point, event);
        }

        return;
      }

      drawing = startShape(point);
      render();
    };

    const onPointerMove = (event) => {
      if (panning !== null) {
        state.view.x += event.clientX - panning.x;
        state.view.y += event.clientY - panning.y;
        panning = { x: event.clientX, y: event.clientY };
        render();
        return;
      }

      if (drawing === null) {
        return;
      }

      const point = toWorld(event.clientX, event.clientY);

      if (drawing.kind === 'erasing') {
        const before = state.shapes.length;

        state.shapes = state.shapes.filter((shape) => hits(shape, point) === false);

        if (state.shapes.length !== before) {
          render();
        }

        return;
      }

      if (drawing.kind === 'pen') {
        drawing.points.push(point);
      } else {
        drawing.points[1] = point;
      }

      render();
    };

    const onPointerUp = (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      panning = null;

      if (drawing === null) {
        return;
      }

      if (drawing.kind === 'erasing') {
        drawing = null;
        remember();
        changed();
        return;
      }

      const box = bounds(drawing);
      const empty = drawing.kind !== 'pen'
        && Math.abs(box.maxX - box.minX) < 2
        && Math.abs(box.maxY - box.minY) < 2;

      if (empty === false) {
        state.shapes.push(drawing);
        remember();
        changed();
      }

      drawing = null;
      render();
    };

    const onWheel = (event) => {
      event.preventDefault();

      const box = canvas.getBoundingClientRect();
      const factor = event.deltaY > 0 ? 1 / 1.12 : 1.12;
      const next = Math.min(8, Math.max(0.15, state.view.scale * factor));
      const ratio = next / state.view.scale;
      const originX = event.clientX - box.left;
      const originY = event.clientY - box.top;

      state.view.x = originX - (originX - state.view.x) * ratio;
      state.view.y = originY - (originY - state.view.y) * ratio;
      state.view.scale = next;
      render();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    window.addEventListener('resize', resize);

    // Interface

    const api = {
      state,

      setTool(tool) {
        state.tool = tool;
      },

      setColour(colour) {
        state.colour = colour;
      },

      setWidth(width) {
        state.width = width;
      },

      setFilled(filled) {
        state.filled = filled === true;
      },

      addText(point, text, size) {
        if (text.trim() === '') {
          return;
        }

        state.shapes.push({
          kind: 'text',
          colour: state.colour,
          width: state.width,
          filled: false,
          size: size || Math.max(14, state.width * 6),
          text,
          points: [point]
        });

        remember();
        render();
        changed();
      },

      undo() {
        const shape = state.shapes.pop();

        if (shape === undefined) {
          return;
        }

        state.undone.push(shape);
        render();
        changed();
      },

      redo() {
        const shape = state.undone.pop();

        if (shape === undefined) {
          return;
        }

        state.shapes.push(shape);
        render();
        changed();
      },

      clear() {
        state.undone = state.shapes.slice().reverse();
        state.shapes = [];
        render();
        changed();
      },

      zoom(factor) {
        const box = canvas.getBoundingClientRect();
        const next = Math.min(8, Math.max(0.15, state.view.scale * factor));
        const ratio = next / state.view.scale;

        state.view.x = box.width / 2 - (box.width / 2 - state.view.x) * ratio;
        state.view.y = box.height / 2 - (box.height / 2 - state.view.y) * ratio;
        state.view.scale = next;
        render();
      },

      resetView() {
        state.view = { x: 0, y: 0, scale: 1 };
        render();
      },

      isEmpty() {
        return state.shapes.length === 0;
      },

      snapshot() {
        return JSON.stringify({
          version: VERSION,
          view: state.view,
          shapes: state.shapes
        });
      },

      load(text) {
        const image = JSON.parse(text);

        if (image === null || Array.isArray(image.shapes) === false) {
          throw new Error('that document is not a board');
        }

        state.shapes = image.shapes;
        state.undone = [];

        if (image.view !== undefined) {
          state.view = image.view;
        }

        render();
        changed();
      },

      /* The bounding box of everything drawn, which is what an export covers. */
      extent() {
        if (state.shapes.length === 0) {
          return { minX: 0, minY: 0, maxX: 640, maxY: 480 };
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        state.shapes.forEach((shape) => {
          const box = bounds(shape);
          const pad = shape.width;

          minX = Math.min(minX, box.minX - pad);
          minY = Math.min(minY, box.minY - pad);
          maxX = Math.max(maxX, box.maxX + pad);
          maxY = Math.max(maxY, box.maxY + pad);
        });

        return { minX, minY, maxX, maxY };
      },

      toCanvas(scale) {
        const box = api.extent();
        const factor = scale || 2;
        const width = Math.max(1, Math.round((box.maxX - box.minX) * factor));
        const height = Math.max(1, Math.round((box.maxY - box.minY) * factor));
        const target = document.createElement('canvas');

        target.width = width;
        target.height = height;

        const paint = target.getContext('2d');

        paint.fillStyle = state.background;
        paint.fillRect(0, 0, width, height);
        paint.scale(factor, factor);
        paint.translate(-box.minX, -box.minY);

        state.shapes.forEach((shape) => {
          drawShape(paint, shape);
        });

        return target;
      },

      toSVG() {
        const box = api.extent();
        const width = Math.round(box.maxX - box.minX);
        const height = Math.round(box.maxY - box.minY);
        const escape = (text) => String(text)
          .split('&').join('&amp;')
          .split('<').join('&lt;')
          .split('>').join('&gt;');
        const parts = [
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${box.minX} ${box.minY} ${width} ${height}">`,
          `<rect x="${box.minX}" y="${box.minY}" width="${width}" height="${height}" fill="${state.background}"/>`
        ];

        state.shapes.forEach((shape) => {
          const common = `stroke="${shape.colour}" stroke-width="${shape.width}" stroke-linecap="round" stroke-linejoin="round"`;
          const fill = shape.filled ? shape.colour : 'none';
          const shapeBox = bounds(shape);

          if (shape.kind === 'pen') {
            const points = shape.points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');

            parts.push(`<polyline points="${points}" fill="none" ${common}/>`);
          } else if (shape.kind === 'line' || shape.kind === 'arrow') {
            const [from, to] = shape.points;

            parts.push(`<line x1="${from.x.toFixed(2)}" y1="${from.y.toFixed(2)}" x2="${to.x.toFixed(2)}" y2="${to.y.toFixed(2)}" ${common}/>`);

            if (shape.kind === 'arrow') {
              const angle = Math.atan2(to.y - from.y, to.x - from.x);
              const length = Math.max(10, shape.width * 3.2);
              const wing = (offset) => `${(to.x - length * Math.cos(angle + offset)).toFixed(2)},${(to.y - length * Math.sin(angle + offset)).toFixed(2)}`;

              parts.push(`<polyline points="${wing(-0.4)} ${to.x.toFixed(2)},${to.y.toFixed(2)} ${wing(0.4)}" fill="none" ${common}/>`);
            }
          } else if (shape.kind === 'rectangle') {
            parts.push(`<rect x="${shapeBox.minX.toFixed(2)}" y="${shapeBox.minY.toFixed(2)}" width="${(shapeBox.maxX - shapeBox.minX).toFixed(2)}" height="${(shapeBox.maxY - shapeBox.minY).toFixed(2)}" fill="${fill}" ${common}/>`);
          } else if (shape.kind === 'ellipse') {
            parts.push(`<ellipse cx="${((shapeBox.minX + shapeBox.maxX) / 2).toFixed(2)}" cy="${((shapeBox.minY + shapeBox.maxY) / 2).toFixed(2)}" rx="${(Math.abs(shapeBox.maxX - shapeBox.minX) / 2).toFixed(2)}" ry="${(Math.abs(shapeBox.maxY - shapeBox.minY) / 2).toFixed(2)}" fill="${fill}" ${common}/>`);
          } else if (shape.kind === 'text') {
            parts.push(`<text x="${shape.points[0].x.toFixed(2)}" y="${(shape.points[0].y + shape.size * 0.85).toFixed(2)}" font-family="Arial, sans-serif" font-size="${shape.size}" fill="${shape.colour}">${escape(shape.text)}</text>`);
          }
        });

        parts.push('</svg>');

        return parts.join('\n');
      },

      resize,
      render,
      toWorld,

      onChange(handler) {
        onChange = handler;
      }
    };

    resize();

    return api;
  };

  return { create, VERSION };
})();
