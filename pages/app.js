const limit = 100;

let state = Object.freeze({
  food: null
});

update();


let typingTimer;
let doneTypingInterval = 100;
const nameBox = document.getElementById('name');
let marketData = [
  {
    name: 'Linch Market',
    vcCoords: {x: 148, y: 150},
    scale: 0.27
  }
];

nameBox.addEventListener('keyup', function () {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(updateFilter, doneTypingInterval);
});

nameBox.addEventListener('keydown', function () {
  clearTimeout(typingTimer);
});

function updateFilter() {
  let value = nameBox.value.toLowerCase();
  let foodAll = state.foodAll;
  let res = state.resources;
  let filteredFood = foodAll.filter(f => f.name.toLowerCase().includes(value));
  if (includes.length) {
    filteredFood = filteredFood.filter(f => hasCommon((res[f.name] || {}).cat || [], includes));
  }
  console.log(includes);
  updateState('food', filteredFood);
  updateTable();
}

function hasCommon(list1, list2) {
  return list1.filter(a => list2.filter(b => a === b).length > 0).length > 0
}

//unknown ingredients
let ingredients = [];
let foods = [];

const categories = [
  'Sausage'
]

let includes = [];
let excludes = [];

const stats = [
  { code: 'str', name: 'Strength', sort: false },
  { code: 'agi', name: 'Agility', sort: false },
  { code: 'int', name: 'Intelligence', sort: false },
  { code: 'con', name: 'Constitution', sort: false },
  { code: 'per', name: 'Perception', sort: false },
  { code: 'cha', name: 'Charisma', sort: false },
  { code: 'dex', name: 'Dexterity', sort: false },
  { code: 'wil', name: 'Will', sort: false },
  { code: 'psy', name: 'Psyche', sort: false }
];

const extraColumns = [
  { code: 'fepHunger', sort: false },
  { code: 'fepSum', sort: false },
  { code: 'hunger', sort: false },
  { code: 'energy', sort: false },
  { code: 'energyHunger', sort: false }
];

stats.forEach(s => {
  document.getElementById(s.code).addEventListener('click', function (e) {
    state.food = state.food.sort(sortByStat(s.code, s.sort));
    s.sort = !s.sort;
    updateTable();
  });
});

extraColumns.forEach(c => {
  document.getElementById(c.code).addEventListener('click', function (e) {
    state.food = state.food.sort(sortBy(c.code, c.sort));
    c.sort = !c.sort;
    updateTable();
  });
})

const sum = (accumulator, currentValue) => accumulator + currentValue;
const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;


async function sendRequest(endpoint) {
  try {
    const response = await fetch('https://hnh-market.junespark.net/api/' + endpoint, {
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
  const data = await sendRequest('food');
  const dataRes = await sendRequest('resources');
  const stallData = await sendRequest('stalls');
  let recipes = [];
  let stalls = [];
  let items = [];
  for(let i = 0; i < stallData.length; i++) {
    let s = stallData[i];
    stalls.push({coord: s.coord, market: s.market, id: i});
    s.rows.forEach(e => items.push({...e, stallId: i}));
  }
  stallData.forEach(s => {
  });
  data.data.forEach(f => {
    foods.push({ name: f.name, count: f.recipes.length });
    f.recipes.forEach(r => {
      let fepSum = round(r.feps.map(fe => fe.value).reduce(sum, 0));
      recipes.push({
        name: f.name,
        res: f.res,
        ingredients: r.ingredients,
        feps: fepListToObject(r.feps),
        fepHunger: round(fepSum / r.hunger),
        fepSum: fepSum,
        hunger: r.hunger,
        energy: r.energy,
        energyHunger: round(r.energy / r.hunger)
      });
      r.ingredients.forEach(i => {
        let ingredient = ingredients.filter(e => e.name === i)[0];
        if (!ingredient) {
          ingredients.push({ name: i, count: 1 });
        } else {
          ingredient.count += 1;
        }
      });
    })
  });
  ingredients = ingredients.sort(sortBy('count', true));
  foods = foods.sort(sortBy('count', true));
  console.log(ingredients.filter(e => !dataRes.data[e.name]));
  console.log(foods.filter(e => !dataRes.data[e.name]));
  updateState('food', recipes);
  updateState('foodAll', recipes);
  updateState('resources', dataRes.data);
  updateState('stalls', stalls);
  updateState('items', items);
  console.log(stalls);
  console.log(items);
  updateTable();
  updateFilterButtons();
  updateStall();
}

function sortBy(field, asc) {
  let order = asc ? -1 : 1;
  return (a, b) => a[field] > b[field] ? order : -order;
}

function sortByFn(fn, asc) {
  let order = asc ? -1 : 1;
  return (a, b) => fn(a) > fn(b) ? order : -order;
}

function sortByStat(stat, asc) {
  return (a, b) => {
    let fepA = a.feps[stat + (asc ? '1' : '2')] || 0;
    let fepB = b.feps[stat + (asc ? '1' : '2')] || 0;
    return fepA > fepB ? -1 : 1;
  }
}

function updateFilterButtons() {
  const groups = [];
  for (const prop in state.resources) {
    if (state.resources[prop].group) {
      groups.push(prop)
    }
  }
  const maxColumn = 4;
  const filterRows = document.createDocumentFragment();
  const allTr = document.createElement('tr');
  const allTd = document.createElement('td');
  allTd.setAttribute('colspan', maxColumn);
  allTd.textContent = 'All';
  allTd.addEventListener('click', function () {
    includes.length = 0;
    updateFilter();
  });
  allTr.append(allTd);
  filterRows.append(allTr);
  const template = document.getElementById('filterRow');
  let column = 0;
  let currentRow;
  let tr;
  groups.forEach(e => {
    if (column === 0) {
      currentRow = template.content.cloneNode(true);
      tr = currentRow.querySelector('tr');
      filterRows.append(currentRow);
    }
    tr.children[column].append(imgFromRes(e));
    tr.children[column].addEventListener('click', function () {
      let el = includes.filter(i => i === e)[0];
      if (el) {
        includes = includes.filter(i => i !== e);
      } else {
        includes.push(e);
      }
      updateFilter();
    });
    column = (column + 1) % maxColumn;
  });
  updateElement('filterIncludes', filterRows);
}





function updateStall() {
  const itemData = state.items;
  const itemRows = document.createDocumentFragment();
  for (const item of itemData) {
    if (item.item) {
      const itemRow = createItemRow(item);
      itemRows.appendChild(itemRow);
    }
  }
  updateElement('items', itemRows);
}

function createItemRow(item) {
  const template = document.getElementById('item');
  const itemRow = template.content.cloneNode(true);
  const tr = itemRow.querySelector('tr');
  console.log(item);
  let img = imgFromRes(item.item.name);
  if (!img) {
    img = document.createElement('img');
    img.setAttribute('src', '/img/' + item.item.gfx + '.png');
    img.setAttribute('height', '32px');
  }
  let pimg = imgFromRes(item.price.name);
  if (!pimg) {
    pimg = document.createElement('img');
    pimg.setAttribute('src', '/img/' + item.price.gfx + '.png');
    pimg.setAttribute('height', '32px');
  }
  tr.children[0].append(img);
  tr.children[1].textContent = item.item.name;
  tr.children[2].textContent = item.item.quality;
  tr.children[3].append(pimg);
  tr.children[4].textContent = item.price.name;
  tr.children[5].textContent = item.price.amount;
  tr.children[6].textContent = item.price.quality;
  tr.children[7].textContent = item.left;
  tr.setAttribute('id', item.stallId);
  tr.addEventListener('mouseenter', function (e) {
    let stall = state.stalls.filter(e=> e.id === item.stallId)[0];
    let marker = document.getElementById('marker');
    if (stall && marker) {
      let coords = interpolateCoords(stall.coord, stall.market);
      marker.setAttribute('cx', coords.x);
      marker.setAttribute('cy', coords.y);
      marker.setAttribute('r', 5);
    }
  });
  return itemRow;
}







function updateTable() {
  const foodData = state.food;
  const foodRows = document.createDocumentFragment();
  let rows = 0;
  for (const food of foodData) {
    const foodRow = createFoodRow(food);
    foodRows.appendChild(foodRow);
    rows++;
    if (rows === limit)
      break;
  }
  updateElement('foods', foodRows);
}

function createFoodRow(food) {
  const template = document.getElementById('food');
  const foodRow = template.content.cloneNode(true);
  const tr = foodRow.querySelector('tr');
  let img = imgFromRes(food.name);
  if (!img) {
    img = document.createElement('img');
    img.setAttribute('src', '/img/' + food.res + '.png');
    img.setAttribute('height', '32px');
  }
  tr.children[0].append(img);
  tr.children[1].textContent = food.name;
  tr.children[2].append(prepareIngredients(food.ingredients));
  let index = 3;
  stats.forEach((s, i) => {
    addFepToRow(tr.children[index + i], s.code, food);
  });
  index += stats.length;
  tr.children[index++].textContent = round(food.fepSum / food.hunger);
  tr.children[index++].textContent = food.fepSum;
  tr.children[index++].textContent = food.hunger;
  tr.children[index++].textContent = food.energy;
  tr.children[index++].textContent = round(food.energy / food.hunger);
  return foodRow;
}

function prepareIngredients(ingredients) {
  const div = document.createElement('div');
  ingredients.forEach(i => {
    let img = imgFromRes(i);
    if (img) {
      div.append(img);
    } else {
      const span = document.createElement('span');
      span.textContent = i;
      div.append(span);
    }
  });
  return div;
}

function imgFromRes(name) {
  let imgRes = state.resources[name];
  if (imgRes) {
    const img = document.createElement('img');
    img.setAttribute('src', '/img/' + (imgRes.mod ? imgRes.mod : imgRes.res) + '.png');
    img.setAttribute('height', imgRes.resize ? '16px' : '32px');
    if (!imgRes.resize) {
      img.setAttribute('title', name);
    }
    if (imgRes.mod && !imgRes.resize) {
      img.setAttribute('style', 'background:url(/img/' + imgRes.res + '.png); background-size:32px');
    }
    if (imgRes.resize) {
      const div = document.createElement('div');
      div.setAttribute('title', name);
      div.setAttribute('style', 'background:url(/img/' + imgRes.res + '.png); background-size:32px; height:32px; width:32px; display:inline-block; text-align:left; vertical-align:top');
      div.append(img);
      return div;
    }
    return img;
  }
}

function addFepToRow(cell, name, food) {
  const lineBreak = document.createElement('br');
  const fep = document.createElement('span');
  let fepV = food.feps[name + '1'];
  fep.textContent = fepV ? fepV : ' ';
  const fep2 = document.createElement('span');
  let fepV2 = food.feps[name + '2'];
  fep2.textContent = fepV2 ? fepV2 : ' ';
  fep2.classList = ['db'];
  cell.append(fep);
  cell.append(lineBreak);
  cell.append(fep2);
}

function updateElement(id, data) {
  const element = document.getElementById(id);
  element.textContent = '';
  element.append(data);
}

function fepListToObject(fepList) {
  let fepObj = {};
  fepList.forEach(f => {
    let name = f.name.split(' ')[0];
    let mult = f.name.split(' ')[1];
    let stat = stats.filter(s => s.name === name)[0];
    fepObj[stat.code + mult.replace('+', '')] = f.value;
  });
  return fepObj;
}

function interpolateCoords(coords, marketName) {
  let market = marketData.filter(e => e.name === marketName)[0];
  if (!market) return {x:0, y:0};
  return {
    x: market.vcCoords.x - coords.x * market.scale,
    y: market.vcCoords.y - coords.y * market.scale
  }
}