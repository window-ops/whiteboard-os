'use strict';

(() => {
  /*
   * The OpenStreetMap tile policy requires a valid Referer header. A page
   * opened from disk, or framed with a null origin, sends none and the tiles
   * come back 403, so Esri serves the defaults. Served over http(s) the
   * browser sends one and OpenStreetMap answers normally.
   */
  const referrerPolicy = 'strict-origin-when-cross-origin';
  const served = window.location.protocol === 'http:' || window.location.protocol === 'https:';

  const measureButton = document.getElementById('MEASURE');
  const resetButton = document.getElementById('RESET');
  const readout = document.getElementById('READOUT');

  const map = L.map('map', { center: [0, 0], zoom: 3 });

  const esri = (path, attribution) => L.tileLayer(
    `https://server.arcgisonline.com/ArcGIS/rest/services/${path}/MapServer/tile/{z}/{y}/{x}`,
    { maxZoom: 19, referrerPolicy, attribution }
  );

  const credit = 'Tiles &copy; Esri and the GIS User Community';

  const layers = {
    street: esri('World_Street_Map', credit),
    satellite: esri('World_Imagery', 'Tiles &copy; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'),
    topographic: esri('World_Topo_Map', credit),
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      referrerPolicy,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    })
  };

  const names = {
    'Street Map': 'street',
    'Satellite Map': 'satellite',
    'Topographic Map': 'topographic'
  };

  names[served ? 'OpenStreetMap' : 'OpenStreetMap (needs the app served over http)'] = 'osm';

  const choices = {};

  Object.keys(names).forEach((label) => {
    choices[label] = layers[names[label]];
  });

  let active = 'street';
  let measuring = false;
  let points = [];
  let line = null;

  const save = () => {
    const centre = map.getCenter();

    WOSState.write({
      c: `${centre.lat.toFixed(5)},${centre.lng.toFixed(5)}`,
      z: map.getZoom(),
      base: active
    });
  };

  const distance = () => {
    let total = 0;

    for (let i = 1; i < points.length; i++) {
      total += points[i - 1].distanceTo(points[i]);
    }

    return total;
  };

  const showDistance = () => {
    if (points.length < 2) {
      readout.textContent = measuring ? 'Click the map to drop points.' : '';
      return;
    }

    const metres = distance();

    readout.textContent = metres < 1000
      ? `${metres.toFixed(0)} m along ${points.length} points`
      : `${(metres / 1000).toFixed(2)} km along ${points.length} points`;
  };

  const clearMeasurement = () => {
    points = [];

    if (line !== null) {
      line.remove();
      line = null;
    }

    map.eachLayer((layer) => {
      if (layer.options && layer.options.className === 'map-measure-point') {
        layer.remove();
      }
    });

    showDistance();
  };

  map.on('click', (event) => {
    if (measuring === false) {
      return;
    }

    points.push(event.latlng);

    L.circleMarker(event.latlng, {
      className: 'map-measure-point',
      radius: 4,
      color: '#d6336c',
      fillOpacity: 1
    }).addTo(map);

    if (line === null) {
      line = L.polyline(points, { color: '#d6336c', weight: 3 }).addTo(map);
    } else {
      line.setLatLngs(points);
    }

    showDistance();
  });

  measureButton.addEventListener('click', () => {
    measuring = measuring === false;
    measureButton.setAttribute('aria-pressed', String(measuring));
    measureButton.textContent = measuring ? 'Stop measuring' : 'Measure distance';
    showDistance();
  });

  resetButton.addEventListener('click', clearMeasurement);

  map.on('moveend', save);
  map.on('baselayerchange', (event) => {
    Object.keys(names).forEach((label) => {
      if (choices[label] === event.layer) {
        active = names[label];
      }
    });

    save();
  });

  const restore = () => {
    const values = WOSState.read();
    const base = Object.prototype.hasOwnProperty.call(layers, values.base) ? values.base : 'street';

    active = base;
    layers[base].addTo(map);
    L.control.layers(choices).addTo(map);
    L.control.scale({ imperial: false }).addTo(map);

    const centre = typeof values.c === 'string' ? values.c.split(',').map((value) => Number.parseFloat(value)) : [];

    if (centre.length === 2 && centre.every((value) => Number.isFinite(value))) {
      map.setView(centre, WOSState.integer(values, 'z', 3));
    }
  };

  restore();
})();
