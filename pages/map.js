const local = false;
const url = local ? 'http://localhost:5000' : 'https://hnh-market.junespark.net';
const svgns = "http://www.w3.org/2000/svg";
let state = Object.freeze({
  stalls: null
});

update();

let scale = 3;
let nodeSeq = 0;

let marketData = [
  {
    name: 'Finloch Market',
    vcCoords: { x: 150, y: 87 },
    scale: 0.18,
    gfx: '/img/finloch.png',
    mapUrl: 'https://vatsul.com/HnHMap/map?markers=3e025001f3d8881739374ed96285647ab1c6d4879ed34fc5705a917d223d728f#x=73.96&y=320.68&zoom=9',
    selected: true,
    id: 0
  },
  {
    name: 'Linch Market',
    vcCoords: { x: 148, y: 150 },
    scale: 0.27,
    gfx: '/img/linchik.png',
    mapUrl: 'https://vatsul.com/HnHMap/map?markers=fa6a8b97e9a7835588671662d5648fef36598c082c41309ed43172494f09e425#x=175.06&y=155.21&zoom=9',
    selected: true,
    id: 1
  }
];

let walkPoints = [];
let path = [];
let selectedPoint = undefined;




async function sendRequest(endpoint) {
  try {
    const response = await fetch(url + '/api/' + endpoint, {
      method: 'GET'
    });
    return await response.json();
  } catch (error) {
    return { error: error.message || 'Unknown error' };
  }
}

function updateState(property, newData) {
  state = Object.freeze({
    ...state,
    [property]: newData
  });
}

async function update() {
  const stallData = await sendRequest('tmpStalls');
  let stalls = [];
  for (let i = 0; i < stallData.length; i++) {
    let s = stallData[i];
    stalls.push({ coord: s.coord, market: s.market, id: i });
  }
  updateState('stalls', stalls);
  initMap(marketData[1]);
}





function initMap(market) {
  const template = document.getElementById('map-template').content.cloneNode(true);
  const app = document.getElementById('app');
  const map = template.children[0];
  map.style.background = 'url(' + market.gfx + ')';
  map.style.backgroundRepeat = 'no-repeat';
  map.style.backgroundSize = '900px 900px';
  let svg = map.children[0];
  const pt = svg.createSVGPoint();
  let stalls = state.stalls.filter(s => s.market === market.name);
  stalls.forEach(s => {
    let rect = document.createElementNS(svgns, 'rect');
    let coords = interpolateCoordsToMap(s.coord, market);
    let size = 6;
    rect.classList = 'stall-rect';
    rect.setAttribute('width', size);
    rect.setAttribute('height', size);
    rect.setAttribute('x', coords.x - size / 2);
    rect.setAttribute('y', coords.y - size / 2);
    svg.append(rect);
    s.elem = rect;
    s.ownerDistance = 0;
    rect.addEventListener('click', (evt) => {
      evt.stopPropagation();
      attachStall(s, selectedPoint);
    });
    rect.addEventListener('mouseenter', (evt) => {
      console.log(`x:${s.coord.x}, y:${s.coord.y}`);
    });
  });
  map.addEventListener('click', (evt) => {
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    var cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());
    let coords = { x: cursorpt.x, y: cursorpt.y };
    let coordsG = interpolateCoordsToGame({ x: cursorpt.x, y: cursorpt.y }, market);
    let walkPoint = { coord: coordsG, stalls: [] };
    if (evt.shiftKey) {
      stalls.filter(s => !s.ownerDistance || s.ownerDistance > distance(s.coord, walkPoint.coord))
        .forEach(s => attachStall(s, walkPoint));
    }
    walkPoint.elem = createPoint(coords, svg, walkPoint);
    walkPoint.id = nodeSeq++;
    walkPoints.push(walkPoint);
    console.log("(" + coordsG.x + ", " + coordsG.y + ")");
  });
  app.append(map);
}

function attachStall(stall, walkPoint) {
  if (!walkPoint) walkPoint = stall.owner;
  let elem = stall.elem;
  walkPoint.stalls = walkPoint.stalls || [];
  const attached = walkPoint.stalls.some(s => compareCoords(stall.coord, s.coord));
  if (attached) {
    walkPoint.stalls = walkPoint.stalls.filter(s => !compareCoords(stall.coord, s.coord));
    elem.classList = 'stall-rect';
    stall.owner = null;
    stall.ownerDistance = 0;
  } else {
    if (stall.owner) {
      stall.owner.stalls = stall.owner.stalls.filter(s => !compareCoords(stall.coord, s.coord));
    }
    stall.ownerDistance = distance(stall.coord, walkPoint.coord);
    stall.owner = walkPoint;
    walkPoint.stalls.push(stall);
    elem.classList = 'stall-rect selected';
  }
}

function createPoint(coords, svg, walkPoint) {
  let point = document.createElementNS(svgns, 'circle');
  let size = 8;
  point.classList = ['marker'];
  point.setAttribute('r', size);
  point.setAttribute('cx', coords.x);
  point.setAttribute('cy', coords.y);
  point.addEventListener('click', (evt) => {
    evt.stopPropagation();
    if (evt.ctrlKey) {
      removePoint(walkPoint.coord);
    } else if (evt.altKey) {
      path.push(walkPoint.id);
      updatePathContainer();
    } else {
      let wasSelected = walkPoint.selected;
      walkPoints.filter(p => p.selected)
        .forEach(p => {
          p.selected = false;
          p.elem.classList = 'marker';
          p.stalls.forEach(s => s.elem.classList = 'stall-rect');
        });
      if (!wasSelected) {
        point.classList = 'marker selected';
        selectedPoint = walkPoint;
        walkPoint.selected = true;
        walkPoint.stalls.forEach(s => s.elem.classList = 'stall-rect selected');
      }
      console.log(walkPoints);
    }
  });
  point.addEventListener('mouseenter', (evt) => {
    walkPoint.stalls.forEach(s => s.elem.classList = 'stall-rect selected');
    console.log(`x:${walkPoint.coord.x}, y:${walkPoint.coord.y}`);
  });
  point.addEventListener('mouseleave', (evt) => {
    walkPoint.stalls.forEach(s => s.elem.classList = 'stall-rect');
  });
  svg.append(point);
  return point;
}

function removePoint(coords) {
  let walkPoint = walkPoints.filter(p => compareCoords(p.coord, coords))[0];
  walkPoints = walkPoints.filter(p => !compareCoords(p.coord, coords));
  if (walkPoint && walkPoint.elem) {
    walkPoint.stalls.forEach(s => {
      attachStall(s, closestPoint(s, walkPoints));
      s.elem.classList = 'stall-rect';
    });
    walkPoint.elem.remove();
  }
}

function interpolateCoordsToMap(coords, market) {
  if (!market) return { x: 0, y: 0 };
  return {
    x: scale * (market.vcCoords.x - coords.x * market.scale),
    y: scale * (market.vcCoords.y - coords.y * market.scale)
  }
}

function interpolateCoordsToGame(coords, market) {
  if (!market) return { x: 0, y: 0 };
  return {
    x: (market.vcCoords.x - coords.x / scale) / market.scale,
    y: (market.vcCoords.y - coords.y / scale) / market.scale
  }
}

function compareCoords(coord1, coord2) {
  return coord1.x === coord2.x && coord1.y === coord2.y;
}

function closestPoint(stall, points) {
  let point;
  let min = Infinity;
  points.forEach(p => {
    const dist = distance(p.coord, stall.coord);
    if (dist < min) {
      min = dist;
      point = p;
    }
  });
  return point;
}

function distance(coord1, coord2) {
  let distance = Math.sqrt(Math.pow(coord1.x - coord2.x, 2) + Math.pow(coord1.y - coord2.y, 2));
  console.log(`x1:${coord1.x}, y1:${coord1.y}, x2:${coord2.x}, y2:${coord2.y}, distance: ${distance}`)
  return distance;
}

function updatePathContainer() {
  let pathContainer = document.getElementById('path-container');
  pathContainer.textContent = '';
  const pathRows = document.createDocumentFragment();
  for (const node of path) {
    const nodeElem = document.createElement('div');
    const point = walkPoints.filter(p => p.id === node)[0];
    nodeElem.textContent = `${point.coord.x.toFixed(2)}, ${point.coord.y.toFixed(2)}`;
    nodeElem.classList = 'path-node';
    pathRows.append(nodeElem);
  }
  pathContainer.append(pathRows);
}