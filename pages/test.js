let marketData = [
  {
    name: 'Linch Market',
    vcCoords: {x: 148, y: 150},
    scale: 0.27
  }
]

function interpolateCoords(coords, marketName) {
  let market = marketData.filter(e => e.name === marketName)[0];
  if (!market) return {x:0, y:0};
  return {
    x: market.vcCoords.x - coords.x * market.scale,
    y: market.vcCoords.y - coords.y * market.scale
  }
}


let marker = document.getElementById('marker');
let coords = interpolateCoords({x:99, y:-495}, 'Linch Market');
marker.setAttribute('cx', coords.x);
marker.setAttribute('cy', coords.y);
marker.setAttribute('r', 8);
marker.r = 8;