function cache(fn) {
  var cache = {};
  return function () {

    var args = JSON.stringify(Array.prototype.slice.call(arguments));

    return (args in cache) ? cache[args] : cache[args] = fn.apply(null, arguments);
  };
}

var cachedInvertFunc = cache(function (item) {
  return 255 - Math.floor(item);
});

var cachedGrayScaleFunc = cache(function (a, b, c) {
  return (a + b + c) / 3;
});
var cachedCustomFunc;
try {
  cachedCustomFunc = cache(new Function('item', 'return item;'));
} catch (e) {
  cachedCustomFunc = function () {
  };
}


var customAlg;

var changeAlgorithm = function (type) {
  customAlg = null;
  localStorage.setItem('alg_type', type);

  tile.redraw();
};
var applyCustomAlg = function () {

  var funcText = document.getElementById('alg').value;

  customAlg = new Function('data', funcText);
  tile.redraw();

  localStorage.setItem('custom_alg', funcText);
};

var CanvasLayer = L.TileLayer.extend({
  getAlgorithm: function (type) {
    type = type || localStorage.getItem('alg_type');
    switch (type) {
      case 'grayscale':
        return 'grayscalePixels';
      case 'invert':
      default:
        return 'invertPixels';
    }
  },
  invertPixels: function (data) {
    for (var i = 0; i < data.data.length; i += 4) {
      data.data[i] = cachedInvertFunc(data.data[i]);
      data.data[i + 1] = cachedInvertFunc(data.data[i + 1]);
      data.data[i + 2] = cachedInvertFunc(data.data[i + 2]);
    }
  },
  grayscalePixels: function (data) {
    for (var i = 0; i < data.data.length; i += 4) {
      var avg = cachedGrayScaleFunc(data.data[i], data.data[i + 1], data.data[i + 2]);
      data.data[i] = avg;
      data.data[i + 1] = avg;
      data.data[i + 2] = avg;
    }
  },
  createTile: function (coords, done) {
    var tile = document.createElement('canvas');

    tile.className = 'leaflet-tile leaflet-tile-loaded';

    L.DomEvent.on(tile, 'load', L.bind(this._tileOnLoad, this, done, tile));
    L.DomEvent.on(tile, 'error', L.bind(this._tileOnError, this, done, tile));

    if (this.options.crossOrigin) {
      tile.crossOrigin = '';
    }

    /*
     Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
     http://www.w3.org/TR/WCAG20-TECHS/H67
     */
    tile.alt = '';

    var size = this.getTileSize();

    tile.width = size.x;
    tile.height = size.y;

    var img = new Image(10, 10);

    var ctx = tile.getContext('2d');

    var self = this;

    img.crossOrigin = "anonymous";
    img.onload = function () {
      ctx.drawImage(img, 0, 0);
      tiles.appendChild(img);

      var data = ctx.getImageData(0, 0, size.x, size.y);

      if (customAlg) {
        customAlg(data);
      } else {
        self[self.getAlgorithm()](data);
      }

      ctx.putImageData(data, 0, 0);
    };
    img.src = this.getTileUrl(coords);


    tile.addEventListener('mousemove', function (event) {
      var x = event.layerX;
      var y = event.layerY;
      zoomctx.drawImage(tile,
        Math.abs(x - 5),
        Math.abs(y - 5),
        10, 10,
        0, 0,
        200, 200);
    });
    return tile;
  }
});

var changeMapPosition = function (lat, lng) {
  map.panTo(new L.LatLng(lat, lng));
};

var changeMapZoom = function (zoom) {
  map.setZoom(zoom);
};

var map = L.map('map', {
  renderer: L.canvas()
}).setView([0, 0], 2);

var zoomctx = document.getElementById('zoom_canvas');
var tiles = document.getElementById('tiles');
var latGlobal = localStorage.getItem('lat') || 25.0890215;
var lngGlobal = localStorage.getItem('lng') || 55.1059787;
var zoom = localStorage.getItem('zoom') || 13;
var strToken = "pk.eyJ1IjoiYXN0cm9kaWdpdGFsIiwiYSI6ImNVb1B0ZkEifQ.IrJoULY2VMSBNFqHLrFYew";
var mapid = "astrodigital.4qshs4zt", pix;

map.setView([latGlobal, lngGlobal], zoom);
map.on('zoomend', function () {
  var zoom = this.getZoom();

  localStorage.setItem('zoom', zoom);

  document.getElementById('zoom').value = zoom;
});
document.getElementById('zoom').value = zoom;

map.on('moveend', function (e) {

  var lat = parseFloat(this.getCenter().lat.toFixed(4));
  var lng = parseFloat(this.getCenter().lng.toFixed(4));

  localStorage.setItem('lat', lat);
  localStorage.setItem('lng', lng);

  document.getElementById('lat').value = lat;
  document.getElementById('lng').value = lng;
});
document.getElementById('lat').value = latGlobal;
document.getElementById('lng').value = lngGlobal;

var tile = new CanvasLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


document.getElementById('alg').innerHTML = localStorage.getItem('custom_alg') || 'for (var i = 0; i < data.data.length; i += 4) {' +
  '\n\tdata.data[i] = 50 + data.data[i];' +
  '\n\tdata.data[i + 1] = 0 + data.data[i + 1];' +
  '\n\tdata.data[i + 2] = -50 + data.data[i + 2];' +
  '\n}';

applyCustomAlg();