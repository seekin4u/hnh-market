const limit = 100;

let state = Object.freeze({
  food: null
});

update();


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

const extraColumns = [
  { code:'fepHunger', sort: false },
  { code:'fepSum', sort: false },
  { code:'hunger', sort: false },
  { code:'energy', sort: false },
  { code:'energyHunger', sort: false }
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
    const response = await fetch('http://139.177.178.41:5000/api/' + endpoint, {
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
      let fepSum = round(r.feps.map(fe => fe.value).reduce(sum,0));
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
    let fepA = a.feps[stat + (asc ? '1' : '2')] || 0;
    let fepB = b.feps[stat + (asc ? '1' : '2')] || 0;
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
  fepList.forEach(f=> {
    let name = f.name.split(' ')[0];
    let mult = f.name.split(' ')[1];
    let stat = stats.filter(s=> s.name === name)[0];
    fepObj[stat.code + mult.replace('+', '')] = f.value;
  });
  return fepObj;
}
