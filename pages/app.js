const limit = 100;
const local = true;
const url = local ? 'http://localhost:5000' : 'https://hnh-market.junespark.net';

let state = Object.freeze({
  food: null
});

update();

let marketData = [
  {
    name: 'Linch Market',
    vcCoords: { x: 148, y: 150 },
    scale: 0.27
  }
];


let typingTimer;
let doneTypingInterval = 100;
const nameBox = document.getElementById('name');

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
  updateState('food', filteredFood);
  updateTable();
}

function hasCommon(list1, list2) {
  return list1.filter(a => list2.filter(b => a === b).length > 0).length > 0
}

const textFilters = document.getElementsByClassName('text-filter');
for (let tf of textFilters) {
  tf.addEventListener('keyup', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(updateItemFilter, doneTypingInterval);
  });

  tf.addEventListener('keydown', function () {
    clearTimeout(typingTimer);
  });
}
const checkFilters = document.getElementsByClassName('checkbox-filter');
for (let cf of checkFilters) {
  cf.addEventListener('change', function () {
    updateItemFilter();
  });
}

function updateItemFilter() {
  let itemsAll = state.itemsAll;
  let name = document.getElementById('filter-item-name').value;
  name = name ? name.toLowerCase() : '';
  let qMin = document.getElementById('filter-item-qmin').value;
  qMin = qMin ? parseFloat(qMin) : 0;
  let qMax = document.getElementById('filter-item-qmax').value;
  qMax = qMax ? parseFloat(qMax) : Infinity;
  let price = document.getElementById('filter-item-price').value;
  price = price ? price.toLowerCase() : '';
  let paMin = document.getElementById('filter-item-pamin').value;
  paMin = paMin ? parseFloat(paMin) : 0;
  let paMax = document.getElementById('filter-item-pamax').value;
  paMax = paMax ? parseFloat(paMax) : Infinity;
  let pqMin = document.getElementById('filter-item-pqmin').value;
  pqMin = pqMin ? parseFloat(pqMin) : 0;
  let pqMax = document.getElementById('filter-item-pqmax').value;
  pqMax = pqMax ? parseFloat(pqMax) : Infinity;
  let gilded = document.getElementById('filter-item-gilded').checked;
  let weapon = document.getElementById('filter-item-weapon').checked;
  let armor = document.getElementById('filter-item-armor').checked;
  let food = document.getElementById('filter-item-food').checked;
  let symbel = document.getElementById('filter-item-symbel').checked;
  let curio = document.getElementById('filter-item-curio').checked;
  let gilding = document.getElementById('filter-item-gilding').checked;

  let filteredItems = itemsAll
    .filter(i => i.item)
    .filter(i => i.item.name.toLowerCase().includes(name))
    .filter(i => i.price.name.toLowerCase().includes(price))
    .filter(i => i.item.quality >= qMin)
    .filter(i => i.item.quality <= qMax)
    .filter(i => i.price.quality >= pqMin)
    .filter(i => i.price.quality <= pqMax)
    .filter(i => i.price.amount >= paMin)
    .filter(i => i.price.amount <= paMax)
    .filter(i => !gilded || i.item.additionalInfo.gilded)
    .filter(i => !weapon || i.item.additionalInfo.damage)
    .filter(i => !armor || i.item.additionalInfo.armor)
    .filter(i => !food || i.item.additionalInfo.food)
    .filter(i => !symbel || i.item.additionalInfo.hungerReduction)
    .filter(i => !curio || i.item.additionalInfo.curio)
    .filter(i => !gilding || i.item.additionalInfo.gilding)
    ;

  updateState('items', filteredItems);
  updateStall();
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

const itemColumns = [
  { code: 'item.name', id: 'iName', sort: false },
  { code: 'item.quality', id: 'iQuality', sort: false },
  { code: 'price.name', id: 'price', sort: false },
  { code: 'price.amount', id: 'pAmount', sort: false },
  { code: 'price.quality', id: 'pQuality', sort: false },
  { code: 'leftNum', id: 'iLeft', sort: false }
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
});

itemColumns.forEach(c => {
  document.getElementById(c.id).addEventListener('click', function (e) {
    state.items = state.items.sort(sortBy(c.code, c.sort));
    c.sort = !c.sort;
    updateStall();
  });
});

const sum = (accumulator, currentValue) => accumulator + currentValue;
const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;


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
  const data = await sendRequest('food');
  const dataRes = await sendRequest('resources');
  const stallData = await sendRequest('stalls');
  let recipes = [];
  let stalls = [];
  let items = [];
  for (let i = 0; i < stallData.length; i++) {
    let s = stallData[i];
    stalls.push({ coord: s.coord, market: s.market, id: i });
    s.rows.forEach(e => items.push({ ...e, stallId: i }));
    items.forEach(e => e.leftNum = parseInt(e.left));
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
  updateState('food', recipes);
  updateState('foodAll', recipes);
  updateState('resources', dataRes.data);
  updateState('stalls', stalls);
  updateState('itemsAll', items);
  updateState('items', items.filter(e => e.item));
  updateTable();
  updateFilterButtons();
  updateStall();
}

function sortBy(field, asc) {
  let order = asc ? -1 : 1;
  return (a, b) => extractField(a, field) > extractField(b, field) ? order : -order;
}

function extractField(value, field) {
  return field.split('.').reduce((acc, v) => acc[v], value);
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
  tr.children[2].textContent = item.item.quality ? item.item.quality.toFixed(2) : '';
  tr.children[3].append(pimg);
  tr.children[4].textContent = item.price.name;
  tr.children[5].textContent = item.price.amount;
  tr.children[6].textContent = item.price.quality ? Math.round(item.price.quality) : 'Any';
  tr.children[7].textContent = item.left;
  tr.setAttribute('id', item.stallId);
  tr.addEventListener('mouseenter', function (e) {
    let stall = state.stalls.filter(e => e.id === item.stallId)[0];
    let marker = document.getElementById('marker');
    if (stall && marker) {
      let coords = interpolateCoords(stall.coord, stall.market);
      marker.setAttribute('cx', coords.x);
      marker.setAttribute('cy', coords.y);
      marker.setAttribute('r', 5);
    }
    updateDetails(item);
  });
  return itemRow;
}

function updateDetails(item) {
  const template = document.getElementById('item-details');
  const itemDiv = template.content.cloneNode(true);
  itemDiv.children[0].textContent = item.item.name + (item.item.quality ? ' Q' + Math.round(item.item.quality) : '');
  let gfx = item.item.gfx;
  let img = imgFromRes(gfx);
  if (!img) {
    img = document.createElement('img');
    img.setAttribute('src', '/img/' + gfx + '.png');
  }
  img.setAttribute('height', '32px');
  img.classList = ['img-left'];
  itemDiv.children[0].append(img);
  itemDiv.children[0].setAttribute('style', 'background-color: rgba(255,155,0,0.2); font-weight:bold');
  itemDiv.children[1].textContent = item.left;
  prepareDetails(item.item.additionalInfo, itemDiv.children[2]);
  itemDiv.children[3].textContent = item.price.name + (item.price.quality ? (' Q' + item.price.quality) : '') + ' x' + item.price.amount;
  updateElement('details-container', itemDiv);

  function prepareDetails(info, div) {
    if (info.food) {
      let food = info.food;

      div.append(divWithText('Feps:'));
      food.evs
        .map(e => divWithText(e.attr + ': ' + e.value.toFixed(2), e.gfx))
        .forEach(e => { e.setAttribute('style', 'padding-left: 12px'); div.append(e); });
      div.append(divWithText('Energy:' + Math.round(food.energy * 100) +
        '%, Hunger:' + Math.round(food.hunger * 100) + '%'));
    }
    if (info.ingredients) {
      div.append(divWithText('Ingredients:'));
      info.ingredients
        .map(e => divWithImg(e.name + ': ' + Math.round(e.value * 100) + '%', e.name))
        .forEach(e => { e.setAttribute('style', 'padding-left: 12px'); div.append(e) });
    }
    if (info.curio) {
      div.append(divWithText('Curio:'));
      div.append(withAttribute(divWithText('Lp/h: ' + info.curio.lph), 'style', 'padding-left: 12px'));
      div.append(withAttribute(divWithText('LP: ' + info.curio.lp), 'style', 'padding-left: 12px'));
      div.append(withAttribute(divWithText('Time: ' + toTime(info.curio.time)), 'style', 'padding-left: 12px'));
      div.append(withAttribute(divWithText('Weight: ' + info.curio.weight), 'style', 'padding-left: 12px'));
    }
    if (info.damage || info.combat || info.grevious || info.armPen) {
      div.append(divWithText('Weapon:'));
    }
    if (info.damage) {
      div.append(withAttribute(divWithText('Damage:' + info.damage), 'style', 'padding-left: 12px'));
    }
    if (info.combat) {
      div.append(withAttribute(divWithText(info.combat.name, info.combat.gfx), 'style', 'padding-left: 12px'));
    }
    if (info.grevious) {
      div.append(withAttribute(divWithText('Grevious damage:' + info.grevious * 100 + '%'), 'style', 'padding-left: 12px'));
    }
    if (info.armPen) {
      div.append(withAttribute(divWithText('Armor penetration:' + info.armPen * 100 + '%'), 'style', 'padding-left: 12px'));
    }
    if (info.dur && info.maxDur) {
      div.append(divWithText('Wear:' + info.dur + '/' + info.maxDur));
    }
    if (info.hungerReduction && info.fepBonus) {
      div.append(divWithText('Symbel:'));
      div.append(withAttribute(divWithText('Hunger reduction:' + (info.hungerReduction * 100).toFixed(2) + '%'), 'style', 'padding-left: 12px'));
      div.append(withAttribute(divWithText('Fep bonus:' + (info.fepBonus * 100).toFixed(2) + '%'), 'style', 'padding-left: 12px'));
    }
    if (info.container) {
      div.append(divWithText('Inside ' + info.container.name + ' Q' + Math.round(info.container.quality)));
    }
    if (info.armor) {
      div.append(divWithText('Armor:' + info.armor.hard + '/' + info.armor.soft));
    }
    if (info.mods) {
      div.append(divWithText('Stats:'));
      info.mods.map(e =>
        withClass(
          divWithText(e.attr.name + ': ' + e.mod, e.attr.gfx),
          e.mod > 0 ? 'positive' : 'negative'))
        .map(e => withAttribute(e, 'style', 'padding-left: 12px;'))
        .forEach(e => div.append(e));
    }
    if (info.gilded) {
      let gild = info.gilded;
      div.append(divWithText('Gilded with:'));
      gild.gildings
        .map(e => divWithText(e.name, e.gfx))
        .map(e => withAttribute(e, 'style', 'padding-left: 12px'))
        .forEach(e => div.append(e));
      if (gild.slots) {
        div.append(withAttribute(divWithText(gild.slots + ' slots left'), 'style', 'padding-left: 12px; color: #49f; font-style:italic'));
      }
    }
    if (info.gilding) {
      let gild = info.gilding;
      div.append(divWithText('As gilding:'));
      gild.stats
        .map(e =>
          withClass(
            divWithText(e.attr.name + ': ' + e.mod, e.attr.gfx),
            e.mod > 0 ? 'positive' : 'negative'))
        .map(e => withAttribute(e, 'style', 'padding-left: 12px;'))
        .forEach(e => div.append(e));
    }
  }

  function divWithText(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div;
  }

  function withAttribute(el, att, val) {
    el.setAttribute(att, val);
    return el;
  }

  function withClass(el, cl) {
    el.classList = [...el.classList, cl];
    return el;
  }

  function divWithText(str, gfx) {
    const div = document.createElement('div');
    div.textContent = str;
    if (!gfx) return div;
    let img = imgFromRes(gfx);
    if (!img) {
      img = document.createElement('img');
      img.setAttribute('src', '/img/' + gfx + '.png');
    }
    img.setAttribute('height', '16px');
    img.classList = ['img-left'];
    div.append(img);
    return div;
  }

  function divWithImg(str, name) {
    const div = document.createElement('div');
    div.textContent = str;
    let img = imgFromRes(name, '16px');
    if (img) {
      img.setAttribute('height', '16px');
      img.classList = ['img-left'];
      div.append(img);
    }
    return div;
  }

  function toTime(val) {
    const minutesMod = 60;
    const hoursMod = 60 * minutesMod;
    const daysMod = 24 * hoursMod;
    const weeksMod = 7 * daysMod;

    let weeks = Math.floor(val / weeksMod);
    val -= weeks * weeksMod;
    let days = Math.floor(val / daysMod);
    val -= days * daysMod;
    let hours = Math.floor(val / hoursMod);
    val -= hours * hoursMod;
    let minutes = Math.floor(val / minutesMod);
    val -= minutes * minutesMod;
    return weeks ? (weeks + 'w ') : ''
      + days ? (days + 'd ') : ''
        + hours ? (hours + 'h ') : ''
          + minutes ? (minutes + 'm ') : ''
            + val ? (val + 's') : ''
  }
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

function imgFromRes(name, size) {
  size = size ? size : '32px';
  let imgRes = state.resources[name];
  if (imgRes) {
    const img = document.createElement('img');
    img.setAttribute('src', '/img/' + (imgRes.mod ? imgRes.mod : imgRes.res) + '.png');
    img.setAttribute('height', imgRes.resize ? '16px' : size);
    if (!imgRes.resize) {
      img.setAttribute('title', name);
    }
    if (imgRes.mod && !imgRes.resize) {
      img.setAttribute('style', 'background:url(/img/' + imgRes.res + '.png); background-size:' + size);
    }
    if (imgRes.resize) {
      const div = document.createElement('div');
      div.setAttribute('title', name);
      div.setAttribute('style', 'background:url(/img/' + imgRes.res + '.png); background-size:' + size + '; height:' + size + '; width:' + size + '; display:inline-block; text-align:left; vertical-align:top');
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
  if (!market) return { x: 0, y: 0 };
  return {
    x: market.vcCoords.x - coords.x * market.scale,
    y: market.vcCoords.y - coords.y * market.scale
  }
}