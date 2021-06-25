let item = {
  "item": {
    "name": "Meatpie",
    "gfx": "gfx/invobjs/meatpie",
    "quality": 23.426902770996094,
    "additionalInfo": {
      "ingredients": [
        {
          "value": 1,
          "name": "Bat"
        },
        {
          "value": 1,
          "name": "Laurel Leaves"
        },
        {
          "value": 1,
          "name": "Chicken Egg"
        },
        {
          "value": 1,
          "name": "Wheat Flour"
        }
      ],
      "food": {
        "evs": [
          {
            "value": 6.122339725494385,
            "color": "#7f2f29",
            "gfx": "gfx/hud/chr/fev/str",
            "attr": "Strength +1"
          },
          {
            "value": 5.014196395874023,
            "color": "#853568",
            "gfx": "gfx/hud/chr/fev/con",
            "attr": "Constitution +1"
          },
          {
            "value": 2.4489359855651855,
            "color": "#3b6e73",
            "gfx": "gfx/hud/chr/fev/int",
            "attr": "Intelligence +1"
          },
          {
            "value": 4.591754913330078,
            "color": "#322b71",
            "gfx": "gfx/hud/chr/fev/agi",
            "attr": "Agility +1"
          }
        ],
        "energy": 7,
        "hunger": 0.05000000074505806
      }
    }
  },
  "price": {
    "name": "Silver Coins - Linchik",
    "gfx": "gfx/invobjs/coins/silver-50",
    "amount": 1,
    "quality": 0
  },
  "left": "3 left"
}

const template = document.getElementById('item-details');
const itemDetails = template.content.cloneNode(true);
const itemDiv = itemDetails.querySelector('div');
itemDiv.children[0].textContent = item.item.name + ' Q' + Math.round(item.item.quality);
itemDiv.children[1].textContent = item.left;
prepareDetails(item.item.additionalInfo, itemDiv.children[2]);
itemDiv.children[3].textContent = item.price.name + (item.price.quality ? (' Q' + item.price.quality) : '') + ' x' + item.price.amount;
document.querySelector('body').append(itemDetails);

function prepareDetails(info, div) {
  if (info.food) {
    let food = info.food;

    div.append(divWithText('Feps:'));
    food.evs.map(e => {
      div.append(divWithText(e.attr + ': ' + e.value.toFixed(2)));
    });
    div.append(divWithText('Energy:' + Math.round(food.energy * 100) +
      '%, Hunger:' + Math.round(food.hunger * 100) + '%'));
  }
  if (info.ingredients) {
    div.append(divWithText('Ingredients: ' + info.ingredients
      .map(e => e.name + ': ' + Math.round(e.value * 100) + '%')
      .join(', ')));
  }

  function divWithText(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div;
  }
}