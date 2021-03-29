const limit = 100;

let state = Object.freeze({
  food: null
});

update();

document.getElementById('sort').addEventListener('click', function (e) {
  state.food = state.food.sort(sortBy('name'));
  updateTable();
});

document.getElementById('sort2').addEventListener('click', function (e) {
  state.food = state.food.sort(sortBy('name', true));
  updateTable();
});

let typingTimer;
let doneTypingInterval = 100;
const nameBox = document.getElementById('name');

nameBox.addEventListener('keyup', function () {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(doneTyping, doneTypingInterval);
});

nameBox.addEventListener('keydown', function () {
  clearTimeout(typingTimer);
});

function doneTyping() {
  let value = nameBox.value.toLowerCase();
  updateState('food', state.foodAll.filter(f => f.name.toLowerCase().includes(value)));
  updateTable();
}

let ingredients = [];

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

stats.forEach(s => {
  document.getElementById(s.code).addEventListener('click', function (e) {
    state.food = state.food.sort(sortByStat(s.name, s.sort));
    s.sort = !s.sort;
    updateTable();
  });
});

const sum = (accumulator, currentValue) => accumulator + currentValue;
const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;


async function sendRequest(endpoint) {
  try {
    const response = await fetch('http://localhost:5000/api/' + endpoint, {
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
  let recipes = [];
  data.data.forEach(f => {
    f.recipes.forEach(r => {
      recipes.push({
        name: f.name,
        res: f.res,
        ingredients: r.ingredients,
        feps: r.feps,
        hunger: r.hunger,
        energy: r.energy
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
  console.log(ingredients.filter(e => !dataRes.data[e.name]));
  updateState('food', recipes);
  updateState('foodAll', recipes);
  updateState('resources', dataRes.data);
  updateTable();
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
    let fepA = a.feps.filter(f => f.name === stat + (asc ? ' +1' : ' +2'))[0];
    fepA = fepA ? fepA.value : 0;
    let fepB = b.feps.filter(f => f.name === stat + (asc ? ' +1' : ' +2'))[0];
    fepB = fepB ? fepB.value : 0;
    return fepA > fepB ? -1 : 1;
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
  addFepToRow(tr.children[3], 'Strength', food);
  addFepToRow(tr.children[4], 'Agility', food);
  addFepToRow(tr.children[5], 'Intelligence', food);
  addFepToRow(tr.children[6], 'Constitution', food);
  addFepToRow(tr.children[7], 'Perception', food);
  addFepToRow(tr.children[8], 'Charisma', food);
  addFepToRow(tr.children[9], 'Dexterity', food);
  addFepToRow(tr.children[10], 'Will', food);
  addFepToRow(tr.children[11], 'Psyche', food);
  const fep = round(food.feps.map(f => f.value).reduce(sum));
  tr.children[12].textContent = round(fep / food.hunger);
  tr.children[13].textContent = fep;
  tr.children[14].textContent = food.hunger;
  tr.children[15].textContent = food.energy;
  tr.children[16].textContent = round(food.energy / food.hunger);
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
    img.setAttribute('height', '32px');
    img.setAttribute('title', name);
    if (imgRes.mod) {
      img.setAttribute('style', 'background:url(/img/' + imgRes.res + '.png); background-size:32px');
    }
    return img;
  }
}

function addFepToRow(cell, name, food) {
  const lineBreak = document.createElement('br');
  const fep = document.createElement('span');
  let fepV = food.feps.filter(f => f.name == name + ' +1')[0];
  fepV = fepV ? fepV.value : ' ';
  fep.textContent = fepV;
  const fep2 = document.createElement('span');
  let fepV2 = food.feps.filter(f => f.name == name + ' +2')[0];
  fepV2 = fepV2 ? fepV2.value : ' ';
  fep2.textContent = fepV2;
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
