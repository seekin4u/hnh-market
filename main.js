const fetch = require('node-fetch');
const express = require('express')
  , bodyParser = require('body-parser')
  , serveIndex = require('serve-index');
const fs = require('fs');
const sharp = require('sharp');

const app = express();
const port = 5000;
const stallDataPath = 'data.json';
const nodesDataPath = 'data/nodes.json';
const epsilon = 0.00001;

const paths = [];

const downloadFile = (async (url, path) => {
  if (fs.existsSync(path) || paths.filter(e => e === path).length > 0) {
    return;
  }
  paths.push(path);
  console.log('updating ' + path);
  fetch(url)
    .then(x => x.arrayBuffer())
    .then(x => {
      if (path.includes('/gems/')) {
        const image = sharp(Buffer.from(x));
        image.metadata()
          .then(function (metadata) {
            return image
              .extend({
                top: 16 - Math.floor(metadata.height / 2),
                bottom: 16 - Math.ceil(metadata.height / 2),
                left: 16 - Math.floor(metadata.width / 2),
                right: 16 - Math.ceil(metadata.width / 2),
                background: { r: 0, g: 0, b: 0, alpha: 0 }
              })
              .toBuffer()
              .then(x => fs.writeFileSync(path, x));
          })
      } else {
        fs.writeFileSync(path, Buffer.from(x));
      }
    });
});

const allFood = [];
let stalls = [];
let loadedStalls = [];

function readStalls() {
  if (!fs.existsSync(stallDataPath)) return [];
  let st = JSON.parse(fs.readFileSync(stallDataPath));
  st.forEach(s => updateStallGfxs(s.rows));
  return st;
}

function saveStalls() {
  return fs.writeFileSync(stallDataPath, JSON.stringify(stalls));
}

const statsOrder = {};
statsOrder['gfx/hud/chr/str'] = 0;
statsOrder['gfx/hud/chr/agi'] = 1;
statsOrder['gfx/hud/chr/int'] = 2;
statsOrder['gfx/hud/chr/con'] = 3;
statsOrder['gfx/hud/chr/per'] = 4;
statsOrder['gfx/hud/chr/cha'] = 5;
statsOrder['gfx/hud/chr/dex'] = 6;
statsOrder['gfx/hud/chr/wil'] = 7;
statsOrder['gfx/hud/chr/psy'] = 8;
statsOrder['gfx/hud/chr/unarmed'] = 100;
statsOrder['gfx/hud/chr/melee'] = 101;
statsOrder['gfx/hud/chr/marksmanship'] = 102;
statsOrder['gfx/hud/chr/exploration'] = 103;
statsOrder['gfx/hud/chr/stealth'] = 104;
statsOrder['gfx/hud/chr/sewing'] = 105;
statsOrder['gfx/hud/chr/smithing'] = 106;
statsOrder['gfx/hud/chr/masonry'] = 107;
statsOrder['gfx/hud/chr/carpentry'] = 108;
statsOrder['gfx/hud/chr/cooking'] = 109;
statsOrder['gfx/hud/chr/farming'] = 110;
statsOrder['gfx/hud/chr/survival'] = 111;
statsOrder['gfx/hud/chr/lore'] = 112;

const resources = {

  //categories
  'Sausages': { res: 'paginae/craft/sausages', group: true },



  //foods and materials
  'Wheat Flour': { res: 'gfx/invobjs/flour-wheatflour' },
  'Barley Flour': { res: 'gfx/invobjs/flour-barleyflour' },
  'Millet Flour': { res: 'gfx/invobjs/flour-milletflour' },
  'Laurel Leaves': { res: 'gfx/invobjs/leaf-laurel' },
  'Lettuce Leaf': { res: 'gfx/invobjs/lettuceleaf' },
  'Chives': { res: 'gfx/invobjs/herbs/chives' },
  'Yellow Onion': { res: 'gfx/invobjs/yellowonion' },
  'Kvann': { res: 'gfx/invobjs/herbs/kvann' },
  'Red Onion': { res: 'gfx/invobjs/redonion' },
  'Beetroot Leaves': { res: 'gfx/invobjs/beetleaves' },
  'Beetroot': { res: 'gfx/invobjs/beet' },
  'Carrot': { res: 'gfx/invobjs/carrot' },
  'Yellowfeet': { res: 'gfx/invobjs/herbs/yellowfoot' },
  'Turnip': { res: 'gfx/invobjs/turnip' },
  'Snowtop': { res: 'gfx/invobjs/herbs/snowtop' },
  'Green Kelp': { res: 'gfx/invobjs/herbs/greenkelp' },
  'Giant Puffball': { res: 'gfx/invobjs/herbs/giantpuffball' },
  'Bay Bolete': { res: 'gfx/invobjs/herbs/baybolete' },
  'Mulberry': { res: 'gfx/invobjs/mulberry' },
  'Blueberries': { res: 'gfx/invobjs/herbs/blueberry' },
  'Elderberries': { res: 'gfx/invobjs/seed-elderberrybush' },
  'Parboiled Morels': { res: 'gfx/invobjs/lorchelwet' },
  'Cavebulb': { res: 'gfx/invobjs/herbs/cavebulb' },
  'Raspberry': { res: 'gfx/invobjs/seed-raspberrybush' },
  'Blackcurrant': { res: 'gfx/invobjs/seed-blackcurrant' },
  'Cherries': { res: 'gfx/invobjs/cherry' },
  'Redcurrant': { res: 'gfx/invobjs/seed-redcurrant' },
  'Bloated Bolete': { res: 'gfx/invobjs/herbs/bloatedbolete' },
  'Blackberry': { res: 'gfx/invobjs/seed-blackberrybush' },
  'Lingonberries': { res: 'gfx/invobjs/herbs/lingon' },
  'Magpie (Pie)': { res: 'gfx/invobjs/magpiepie' },
  'Ruby Bolete': { res: 'gfx/invobjs/herbs/rubybolete' },
  'Seaberries': { res: 'gfx/invobjs/seed-sandthorn' },
  'Dried Morels': { res: 'gfx/invobjs/lorcheldried' },
  'Sloan Berries': { res: 'gfx/invobjs/seed-blackthorn' },
  'Dog Rose Hips': { res: 'gfx/invobjs/seed-dogrose' },
  'Gooseberry': { res: 'gfx/invobjs/seed-gooseberrybush' },
  'Grapes': { res: 'gfx/invobjs/grapes' },
  'Black Trumpets': { res: 'gfx/invobjs/herbs/blacktrumpet' },
  'Field Blewits': { res: 'gfx/invobjs/herbs/fieldblewit' },
  'Dusk Fern': { res: 'gfx/invobjs/herbs/duskfern' },
  'Red Apple': { res: 'gfx/invobjs/apple' },
  'Marsh-Mallow': { res: 'gfx/invobjs/herbs/marshmallow' },
  'Plum': { res: 'gfx/invobjs/plum' },
  'Strawberries': { res: 'gfx/invobjs/herbs/strawberry' },
  'Lemon': { res: 'gfx/invobjs/lemon' },
  'Pear': { res: 'gfx/invobjs/pear' },
  'Wood Strawberry': { res: 'gfx/invobjs/woodstrawberry' },
  'Persimmon': { res: 'gfx/invobjs/persimmon' },
  'Quince': { res: 'gfx/invobjs/quince' },
  'Sorb Apple': { res: 'gfx/invobjs/sorbapple' },
  'Medlar': { res: 'gfx/invobjs/medlar' },
  'Candleberry': { res: 'gfx/invobjs/herbs/candleberry' },
  'Indigo Cap': { res: 'gfx/invobjs/herbs/indigocap' },
  'Black Pepper': { res: 'gfx/invobjs/pepper' },
  'Dill': { res: 'gfx/invobjs/herbs/dill' },
  'Juniper Berries': { res: 'gfx/invobjs/seed-juniper' },
  'Leek': { res: 'gfx/invobjs/leek' },
  'Sage': { res: 'gfx/invobjs/herbs/salvia' },
  'Thyme': { res: 'gfx/invobjs/herbs/thyme' },
  'Stinging Nettle': { res: 'gfx/invobjs/herbs/stingingnettle' },
  'Cave Lantern': { res: 'gfx/invobjs/herbs/cavelantern' },
  'Driftkelp': { res: 'gfx/invobjs/driftkelp' },
  'Spring Water': { res: 'gfx/invobjs/water' },

  'Heartwood Leaves': { res: 'gfx/invobjs/leaf-heartwood' },

  'Birch Sap': { res: 'gfx/invobjs/birchsap' },
  'Domestic Honey': { res: 'gfx/invobjs/honey', mod: 'paginae/bld/beehive', resize: true },
  'Maple Sap': { res: 'gfx/invobjs/maplesap' },
  'Wild-bee Honey': { res: 'gfx/invobjs/honey', mod: 'gfx/terobjs/mm/wildbeehive', resize: true },

  'Black Truffles': { res: 'gfx/invobjs/herbs/truffle-black' },
  'Chantrelles': { res: 'gfx/invobjs/herbs/chantrelle' },
  'Fairy Mushroom': { res: 'gfx/invobjs/fairyshroom' },
  'Parasol Mushroom': { res: 'gfx/invobjs/herbs/parasolshroom' },
  'Troll Mushrooms': { res: 'gfx/invobjs/trollshrooms' },


  'Badger Botillo': { res: 'gfx/invobjs/wurst-badgerbotillo', cat: ['Sausages'] },
  'Bear Salami': { res: 'gfx/invobjs/wurst-bearsalami', cat: ['Sausages'] },
  'Beaver Dog': { res: 'gfx/invobjs/wurst-beaverdog', cat: ['Sausages'] },
  'Big Bear Banger': { res: 'gfx/invobjs/wurst-bigbearbanger', cat: ['Sausages'] },
  'Boar Baloney': { res: 'gfx/invobjs/wurst-boarbaloney', cat: ['Sausages'] },
  'Boar Boudin': { res: 'gfx/invobjs/wurst-boarboudin', cat: ['Sausages'] },
  "Butcher's Surprise": { res: 'gfx/invobjs/wurst-butcherssurprise', cat: ['Sausages'] },
  'Cave Dog': { res: 'gfx/invobjs/wurst-cavedog', cat: ['Sausages'] },
  'Chicken Chorizo': { res: 'gfx/invobjs/wurst-chickenchorizo', cat: ['Sausages'] },
  'Cow Chorizo': { res: 'gfx/invobjs/wurst-cowchorizo', cat: ['Sausages'] },
  'Delicious Deer Dog': { res: 'gfx/invobjs/wurst-deliciousdeer', cat: ['Sausages'] },
  'Elk Dog': { res: 'gfx/invobjs/wurst-elkdog', cat: ['Sausages'] },
  'Fox Fuet': { res: 'gfx/invobjs/wurst-foxfuet', cat: ['Sausages'] },
  'Fox Wurst': { res: 'gfx/invobjs/wurst-foxwurst', cat: ['Sausages'] },
  'Glazed Grazer Dog': { res: 'gfx/invobjs/wurst-glazedgrazer', cat: ['Sausages'] },
  'Hedgedog': { res: 'gfx/invobjs/wurst-hedgedog', cat: ['Sausages'] },
  'King of the Woods': { res: 'gfx/invobjs/wurst-woodking', cat: ['Sausages'] },
  'Lamb & Lynx': { res: 'gfx/invobjs/wurst-lamblynx', cat: ['Sausages'] },
  'Lamb Sausages': { res: 'gfx/invobjs/wurst-lambsausages', cat: ['Sausages'] },
  'Lynxalami': { res: 'gfx/invobjs/wurst-lynxalami', cat: ['Sausages'] },
  'Moodog': { res: 'gfx/invobjs/wurst-moodog', cat: ['Sausages'] },
  'Piglet Wursts': { res: 'gfx/invobjs/wurst-piglet', cat: ['Sausages'] },
  'Running Rabbit Sausage': { res: 'gfx/invobjs/wurst-runningrabbit', cat: ['Sausages'] },
  'Swan Neck': { res: 'gfx/invobjs/wurst-swanneck', cat: ['Sausages'] },
  'Tame Game Liverwurst': { res: 'gfx/invobjs/wurst-tamegame', cat: ['Sausages'] },
  'Walrus & Carpenter': { res: 'gfx/invobjs/wurst-carpwal', cat: ['Sausages'] },
  'Wonderful Wilderness Wurst': { res: 'gfx/invobjs/wurst-www', cat: ['Sausages'] },

  'Smoked Badger Botillo': { res: 'gfx/invobjs/wurst-s-badgerbotillo', cat: ['Sausages'] },
  'Smoked Bear Salami': { res: 'gfx/invobjs/wurst-s-bearsalami', cat: ['Sausages'] },
  'Smoked Beaver Dog': { res: 'gfx/invobjs/wurst-s-beaverdog', cat: ['Sausages'] },
  'Smoked Big Bear Banger': { res: 'gfx/invobjs/wurst-s-bigbearbanger', cat: ['Sausages'] },
  'Smoked Boar Baloney': { res: 'gfx/invobjs/wurst-s-boarbaloney', cat: ['Sausages'] },
  'Smoked Boar Boudin': { res: 'gfx/invobjs/wurst-s-boarboudin', cat: ['Sausages'] },
  "Smoked Butcher's Surprise": { res: 'gfx/invobjs/wurst-s-butcherssurprise', cat: ['Sausages'] },
  'Smoked Cave Dog': { res: 'gfx/invobjs/wurst-s-cavedog', cat: ['Sausages'] },
  'Smoked Chicken Chorizo': { res: 'gfx/invobjs/wurst-s-chickenchorizo', cat: ['Sausages'] },
  'Smoked Cow Chorizo': { res: 'gfx/invobjs/wurst-s-cowchorizo', cat: ['Sausages'] },
  'Smoked Delicious Deer Dog': { res: 'gfx/invobjs/wurst-s-deliciousdeer', cat: ['Sausages'] },
  'Smoked Elk Dog': { res: 'gfx/invobjs/wurst-s-elkdog', cat: ['Sausages'] },
  'Smoked Fox Fuet': { res: 'gfx/invobjs/wurst-s-foxfuet', cat: ['Sausages'] },
  'Smoked Fox Wurst': { res: 'gfx/invobjs/wurst-s-foxwurst', cat: ['Sausages'] },
  'Smoked Glazed Grazer Dog': { res: 'gfx/invobjs/wurst-s-glazedgrazer', cat: ['Sausages'] },
  'Smoked Hedgedog': { res: 'gfx/invobjs/wurst-s-hedgedog', cat: ['Sausages'] },
  'Smoked King of the Woods': { res: 'gfx/invobjs/wurst-s-woodking', cat: ['Sausages'] },
  'Smoked Lamb & Lynx': { res: 'gfx/invobjs/wurst-s-lamblynx', cat: ['Sausages'] },
  'Smoked Lamb Sausages': { res: 'gfx/invobjs/wurst-s-lambsausages', cat: ['Sausages'] },
  'Smoked Lynxalami': { res: 'gfx/invobjs/wurst-s-lynxalami', cat: ['Sausages'] },
  'Smoked Moodog': { res: 'gfx/invobjs/wurst-s-moodog', cat: ['Sausages'] },
  'Smoked Piglet Wursts': { res: 'gfx/invobjs/wurst-s-piglet', cat: ['Sausages'] },
  'Smoked Running Rabbit Sausage': { res: 'gfx/invobjs/wurst-s-runningrabbit', cat: ['Sausages'] },
  'Smoked Swan Neck': { res: 'gfx/invobjs/wurst-s-swanneck', cat: ['Sausages'] },
  'Smoked Tame Game Liverwurst': { res: 'gfx/invobjs/wurst-s-tamegame', cat: ['Sausages'] },
  'Smoked Walrus & Carpenter': { res: 'gfx/invobjs/wurst-s-carpwal', cat: ['Sausages'] },
  'Smoked Wonderful Wilderness Wurst': { res: 'gfx/invobjs/wurst-s-www', cat: ['Sausages'] },


  'Alder': { res: 'gfx/invobjs/wblock-alder' },
  'Almond tree': { res: 'gfx/invobjs/wblock-almondtree' },
  'Apple tree': { res: 'gfx/invobjs/wblock-appletree' },
  'Ash': { res: 'gfx/invobjs/wblock-ash' },
  'Aspen': { res: 'gfx/invobjs/wblock-aspen' },
  'Bay willow': { res: 'gfx/invobjs/wblock-baywillow' },
  'Birch': { res: 'gfx/invobjs/wblock-birch' },
  'Birdcherry tree': { res: 'gfx/invobjs/wblock-birdcherrytree' },
  'Beech': { res: 'gfx/invobjs/wblock-beech' },
  'Blackpine': { res: 'gfx/invobjs/wblock-blackpine' },
  'Blackthorn': { res: 'gfx/invobjs/wblock-blackthorn' },
  'Boxwood': { res: 'gfx/invobjs/wblock-boxwood' },
  'Buckthorn': { res: 'gfx/invobjs/wblock-buckthorn' },
  'Carob tree': { res: 'gfx/invobjs/wblock-carobtree' },
  'Chastetree': { res: 'gfx/invobjs/wblock-chastetree' },
  'Cherry': { res: 'gfx/invobjs/wblock-cherry' },
  'Chestnut tree': { res: 'gfx/invobjs/wblock-chestnuttree' },
  'Cedar': { res: 'gfx/invobjs/wblock-cedar' },
  'Conker': { res: 'gfx/invobjs/wblock-conkertree' },
  'Cork oak': { res: 'gfx/invobjs/wblock-corkoak' },
  'Crabapple tree': { res: 'gfx/invobjs/wblock-crabappletree' },
  'Crampbark': { res: 'gfx/invobjs/wblock-crampbark' },
  'Cypress': { res: 'gfx/invobjs/wblock-cypress' },
  'Dogwood': { res: 'gfx/invobjs/wblock-dogwood' },
  'Elderberry bush': { res: 'gfx/invobjs/wblock-elderberrybush' },
  'Elm': { res: 'gfx/invobjs/wblock-elm' },
  'Fir': { res: 'gfx/invobjs/wblock-fir' },
  'Gloomcap': { res: 'gfx/invobjs/wblock-gloomcap' },
  'Gnomeshat': { res: 'gfx/invobjs/wblock-gnomeshat' },
  'Golden chain': { res: 'gfx/invobjs/wblock-goldenchain' },
  'Hornbeam': { res: 'gfx/invobjs/wblock-hornbeam' },
  'Juniper': { res: 'gfx/invobjs/wblock-juniper' },
  'Hazel': { res: 'gfx/invobjs/wblock-hazel' },
  'Hawthorn': { res: 'gfx/invobjs/wblock-hawthorn' },
  "King's Oak": { res: 'gfx/invobjs/wblock-kingsoak' },
  'Larch': { res: 'gfx/invobjs/wblock-larch' },
  'Laurel': { res: 'gfx/invobjs/wblock-laurel' },
  'Lemon tree': { res: 'gfx/invobjs/wblock-lemontree' },
  'Linden': { res: 'gfx/invobjs/wblock-linden' },
  'Lotetree': { res: 'gfx/invobjs/wblock-lotetree' },
  'Maple': { res: 'gfx/invobjs/wblock-maple' },
  'Mastic bush': { res: 'gfx/invobjs/wblock-masticbush' },
  'Mayflower tree': { res: 'gfx/invobjs/wblock-mayflower' },
  'Medlar tree': { res: 'gfx/invobjs/wblock-medlartree' },
  'Oak': { res: 'gfx/invobjs/wblock-oak' },
  'Olive tree': { res: 'gfx/invobjs/wblock-olivetree' },
  'Pear tree': { res: 'gfx/invobjs/wblock-peartree' },
  'Persimmon tree': { res: 'gfx/invobjs/wblock-persimmontree' },
  'Pine': { res: 'gfx/invobjs/wblock-pine' },
  'Plane': { res: 'gfx/invobjs/wblock-planetree' },
  'Plum tree': { res: 'gfx/invobjs/wblock-plumtree' },
  'Poplar': { res: 'gfx/invobjs/wblock-poplar' },
  'Quince tree': { res: 'gfx/invobjs/wblock-quincetree' },
  'Rowan': { res: 'gfx/invobjs/wblock-rowan' },
  'Sallow': { res: 'gfx/invobjs/wblock-sallow' },
  'Silverfir': { res: 'gfx/invobjs/wblock-silverfir' },
  'Sorb tree': { res: 'gfx/invobjs/wblock-sorbtree' },
  'Spruce': { res: 'gfx/invobjs/wblock-spruce' },
  'Stonepine': { res: 'gfx/invobjs/wblock-stonepine' },
  'Strawberry tree': { res: 'gfx/invobjs/wblock-strawberrytree' },
  'Sweetgum': { res: 'gfx/invobjs/wblock-sweetgum' },
  'Sycamore': { res: 'gfx/invobjs/wblock-sycamore' },
  'Tea bush': { res: 'gfx/invobjs/wblock-teabush' },
  'Terebinth': { res: 'gfx/invobjs/wblock-terebinth' },
  'Tree Heath': { res: 'gfx/invobjs/wblock-treeheath' },
  'Towercap': { res: 'gfx/invobjs/wblock-towercap' },
  'Trombonechantrelle': { res: 'gfx/invobjs/wblock-trombonechantrelle' },
  'Walnut tree': { res: 'gfx/invobjs/wblock-walnuttree' },
  'Whitebeam': { res: 'gfx/invobjs/wblock-whitebeam' },
  'Witherstand': { res: 'gfx/invobjs/wblock-witherstand' },
  'Willow': { res: 'gfx/invobjs/wblock-willow' },
  'Woodbine': { res: 'gfx/invobjs/wblock-woodbine' },
  'Yew': { res: 'gfx/invobjs/wblock-yew' },

  'Chicken Egg': { res: 'gfx/invobjs/egg-chicken' },
  'Magpie Egg': { res: 'gfx/invobjs/egg-magpie' },
  'Rock Dove Egg': { res: 'gfx/invobjs/egg-rockdove' },
  'Woodgrouse Egg': { res: 'gfx/invobjs/egg-woodgrouse' },

  'Adder': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-adder' },
  'Badger': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-badger' },
  'Bat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-bat' },
  'Bear': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-bear' },
  'Beaver': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-beaver' },
  'Beef': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-cow' },
  'Boar': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-boar' },
  'Bog turtle': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-bogturtle' },
  'Cachalot': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-spermwhale' },
  'Caverat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-caverat' },
  'Fox': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-fox' },
  'Goat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-goat' },
  'Grey Seal': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-greyseal' },
  'Hedgehog': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-hedgehog' },
  'Horse': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-horse' },
  'Lynx': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-lynx' },
  'Mammoth': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-mammoth' },
  'Mole': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-mole' },
  'Moose': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-moose' },
  'Mutton': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-sheep' },
  'Orca': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-orca' },
  'Otter': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-otter' },
  'Pork': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-pig' },
  'Rabbit': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-rabbit' },
  'Reindeer Venison': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-reindeer' },
  'Squirrel': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-squirrel' },
  'Stoat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-stoat' },
  'Venison': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-reddeer' },
  'Walrus': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-walrus' },
  'Wild Beef': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-aurochs' },
  'Wild Horse': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-wildhorse' },
  'Wild Mutton': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-mouflon' },
  'Wildgoat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-wildgoat' },
  'Wolf': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-wolf' },
  'Wolverine': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-wolverine' },

  'Raw Adder': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-adder' },
  'Raw Badger': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-badger' },
  'Raw Bat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-bat' },
  'Raw Bear': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-bear' },
  'Raw Beaver': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-beaver' },
  'Raw Beef': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-cow' },
  'Raw Boar': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-boar' },
  'Raw Bog turtle': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-bogturtle' },
  'Raw Cachalot': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-spermwhale' },
  'Raw Caverat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-caverat' },
  'Raw Fox': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-fox' },
  'Raw Goat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-goat' },
  'Raw Grey Seal': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-greyseal' },
  'Raw Hedgehog': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-hedgehog' },
  'Raw Horse': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-horse' },
  'Raw Lynx': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-lynx' },
  'Raw Mammoth': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-mammoth' },
  'Raw Mole': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-mole' },
  'Raw Moose': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-moose' },
  'Raw Mutton': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-sheep' },
  'Raw Orca': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-orca' },
  'Raw Otter': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-otter' },
  'Raw Pork': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-pig' },
  'Raw Rabbit': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-rabbit' },
  'Raw Reindeer Venison': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-reindeer' },
  'Raw Squirrel': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-squirrel' },
  'Raw Stoat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-stoat' },
  'Raw Venison': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-reddeer' },
  'Raw Walrus': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-walrus' },
  'Raw Wild Beef': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-aurochs' },
  'Raw Wild Horse': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-wildhorse' },
  'Raw Wild Mutton': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-mouflon' },
  'Raw Wildgoat': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-wildgoat' },
  'Raw Wolf': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-wolf' },
  'Raw Wolverine': { res: 'gfx/invobjs/meat-raw', mod: 'gfx/invobjs/meat-wolverine' },

  'Smoked Adder': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-adder' },
  'Smoked Badger': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-badger' },
  'Smoked Bat': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-bat' },
  'Smoked Bear': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-bear' },
  'Smoked Beaver': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-beaver' },
  'Smoked Beef': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-cow' },
  'Smoked Boar': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-boar' },
  'Smoked Bog turtle': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-bogturtle' },
  'Smoked Cachalot': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-spermwhale' },
  'Smoked Caverat': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-caverat' },
  'Smoked Fox': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-fox' },
  'Smoked Goat': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-goat' },
  'Smoked Grey Seal': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-greyseal' },
  'Smoked Hedgehog': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-hedgehog' },
  'Smoked Horse': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-horse' },
  'Smoked Lynx': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-lynx' },
  'Smoked Mammoth': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-mammoth' },
  'Smoked Mole': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-mole' },
  'Smoked Moose': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-moose' },
  'Smoked Mutton': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-sheep' },
  'Smoked Orca': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-orca' },
  'Smoked Otter': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-otter' },
  'Smoked Pork': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-pig' },
  'Smoked Rabbit': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-rabbit' },
  'Smoked Reindeer Venison': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-reindeer' },
  'Smoked Squirrel': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-squirrel' },
  'Smoked Stoat': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-stoat' },
  'Smoked Venison': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-reddeer' },
  'Smoked Walrus': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-walrus' },
  'Smoked Wild Beef': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-aurochs' },
  'Smoked Wild Horse': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-wildhorse' },
  'Smoked Wild Mutton': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-wildgoat' },
  'Smoked Wildgoat': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-wildgoat' },// ????
  'Smoked Wolf': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-wolf' },
  'Smoked Wolverine': { res: 'gfx/invobjs/meat-smoked', mod: 'gfx/invobjs/meat-wolverine' },

  'Roast Adder': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-adder' },
  'Roast Badger': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-badger' },
  'Roast Bat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-bat' },
  'Roast Bear': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-bear' },
  'Roast Beaver': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-beaver' },
  'Roast Beef': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-cow' },
  'Roast Boar': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-boar' },
  'Roast Bog turtle': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-bogturtle' },
  'Roast Cachalot': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-spermwhale' },
  'Roast Caverat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-caverat' },
  'Roast Fox': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-fox' },
  'Roast Goat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-goat' },
  'Roast Grey Seal': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-greyseal' },
  'Roast Hedgehog': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-hedgehog' },
  'Roast Horse': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-horse' },
  'Roast Lynx': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-lynx' },
  'Roast Mammoth': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-mammoth' },
  'Roast Mole': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-mole' },
  'Roast Moose': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-moose' },
  'Roast Mutton': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-sheep' },
  'Roast Orca': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-orca' },
  'Roast Otter': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-otter' },
  'Roast Pork': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-pig' },
  'Roast Rabbit': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-rabbit' },
  'Roast Reindeer Venison': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-reindeer' },
  'Roast Squirrel': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-squirrel' },
  'Roast Stoat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-stoat' },
  'Roast Venison': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-reddeer' },
  'Roast Walrus': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-walrus' },
  'Roast Wild Beef': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-aurochs' },
  'Roast Wild Horse': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wildhorse' },
  'Roast Wild Mutton': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wildgoat' },
  'Roast Wildgoat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wildgoat' },// ????
  'Roast Wolf': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wolf' },
  'Roast Wolverine': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wolverine' },

  'Sizzling Roast Adder': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-adder' },
  'Sizzling Roast Badger': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-badger' },
  'Sizzling Roast Bat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-bat' },
  'Sizzling Roast Bear': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-bear' },
  'Sizzling Roast Beaver': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-beaver' },
  'Sizzling Roast Beef': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-cow' },
  'Sizzling Roast Boar': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-boar' },
  'Sizzling Roast Bog turtle': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-bogturtle' },
  'Sizzling Roast Cachalot': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-spermwhale' },
  'Sizzling Roast Caverat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-caverat' },
  'Sizzling Roast Fox': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-fox' },
  'Sizzling Roast Goat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-goat' },
  'Sizzling Roast Grey Seal': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-greyseal' },
  'Sizzling Roast Hedgehog': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-hedgehog' },
  'Sizzling Roast Horse': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-horse' },
  'Sizzling Roast Lynx': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-lynx' },
  'Sizzling Roast Mammoth': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-mammoth' },
  'Sizzling Roast Mole': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-mole' },
  'Sizzling Roast Moose': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-moose' },
  'Sizzling Roast Mutton': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-sheep' },
  'Sizzling Roast Orca': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-orca' },
  'Sizzling Roast Otter': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-otter' },
  'Sizzling Roast Pork': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-pig' },
  'Sizzling Roast Rabbit': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-rabbit' },
  'Sizzling Roast Reindeer Venison': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-reindeer' },
  'Sizzling Roast Squirrel': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-squirrel' },
  'Sizzling Roast Stoat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-stoat' },
  'Sizzling Roast Venison': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-reddeer' },
  'Sizzling Roast Walrus': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-walrus' },
  'Sizzling Roast Wild Beef': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-aurochs' },
  'Sizzling Roast Wild Horse': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wildhorse' },
  'Sizzling Roast Wild Mutton': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wildgoat' },
  'Sizzling Roast Wildgoat': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wildgoat' },// ????
  'Sizzling Roast Wolf': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wolf' },
  'Sizzling Roast Wolverine': { res: 'gfx/invobjs/meat-roast', mod: 'gfx/invobjs/meat-wolverine' },

  'Spitroast Adder': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-adder' },
  'Spitroast Badger': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-badger' },
  'Spitroast Bat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-bat' },
  'Spitroast Bear': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-bear' },
  'Spitroast Beaver': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-beaver' },
  'Spitroast Beef': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-cow' },
  'Spitroast Boar': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-boar' },
  'Spitroast Bog turtle': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-bogturtle' },
  'Spitroast Cachalot': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-spermwhale' },
  'Spitroast Caverat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-caverat' },
  'Spitroast Fox': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-fox' },
  'Spitroast Goat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-goat' },
  'Spitroast Grey Seal': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-greyseal' },
  'Spitroast Hedgehog': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-hedgehog' },
  'Spitroast Horse': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-horse' },
  'Spitroast Lynx': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-lynx' },
  'Spitroast Mammoth': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-mammoth' },
  'Spitroast Mole': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-mole' },
  'Spitroast Moose': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-moose' },
  'Spitroast Mutton': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-sheep' },
  'Spitroast Orca': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-orca' },
  'Spitroast Otter': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-otter' },
  'Spitroast Pork': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-pig' },
  'Spitroast Rabbit': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-rabbit' },
  'Spitroast Reindeer Venison': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-reindeer' },
  'Spitroast Squirrel': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-squirrel' },
  'Spitroast Stoat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-stoat' },
  'Spitroast Venison': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-reddeer' },
  'Spitroast Walrus': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-walrus' },
  'Spitroast Wild Beef': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-aurochs' },
  'Spitroast Wild Horse': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wildhorse' },
  'Spitroast Wild Mutton': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wildgoat' },
  'Spitroast Wildgoat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wildgoat' },// ????
  'Spitroast Wolf': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wolf' },
  'Spitroast Wolverine': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wolverine' },

  'Sizzling Spitroast Adder': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-adder' },
  'Sizzling Spitroast Badger': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-badger' },
  'Sizzling Spitroast Bat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-bat' },
  'Sizzling Spitroast Bear': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-bear' },
  'Sizzling Spitroast Beaver': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-beaver' },
  'Sizzling Spitroast Beef': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-cow' },
  'Sizzling Spitroast Boar': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-boar' },
  'Sizzling Spitroast Bog turtle': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-bogturtle' },
  'Sizzling Spitroast Cachalot': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-spermwhale' },
  'Sizzling Spitroast Caverat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-caverat' },
  'Sizzling Spitroast Fox': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-fox' },
  'Sizzling Spitroast Goat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-goat' },
  'Sizzling Spitroast Grey Seal': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-greyseal' },
  'Sizzling Spitroast Hedgehog': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-hedgehog' },
  'Sizzling Spitroast Horse': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-horse' },
  'Sizzling Spitroast Lynx': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-lynx' },
  'Sizzling Spitroast Mammoth': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-mammoth' },
  'Sizzling Spitroast Mole': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-mole' },
  'Sizzling Spitroast Moose': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-moose' },
  'Sizzling Spitroast Mutton': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-sheep' },
  'Sizzling Spitroast Orca': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-orca' },
  'Sizzling Spitroast Otter': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-otter' },
  'Sizzling Spitroast Pork': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-pig' },
  'Sizzling Spitroast Rabbit': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-rabbit' },
  'Sizzling Spitroast Reindeer Venison': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-reindeer' },
  'Sizzling Spitroast Squirrel': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-squirrel' },
  'Sizzling Spitroast Stoat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-stoat' },
  'Sizzling Spitroast Venison': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-reddeer' },
  'Sizzling Spitroast Walrus': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-walrus' },
  'Sizzling Spitroast Wild Beef': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-aurochs' },
  'Sizzling Spitroast Wild Horse': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wildhorse' },
  'Sizzling Spitroast Wild Mutton': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wildgoat' },
  'Sizzling Spitroast Wildgoat': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wildgoat' },// ????
  'Sizzling Spitroast Wolf': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wolf' },
  'Sizzling Spitroast Wolverine': { res: 'gfx/invobjs/meat-spitroast', mod: 'gfx/invobjs/meat-wolverine' },

  'Chicken': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-chicken' },
  'Eagle Owl': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-eagleowl' },
  'Golden Eagle': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-goldeneagle' },
  'Magpie': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-magpie' },
  'Mallard': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-mallard' },
  'Ptarmigan': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-ptarmigan' },
  'Quail': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-quail' },
  'Rock Dove': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-rockdove' },
  'Seagull': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-seagull' },
  'Swan': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-swan' },
  'Wood Grouse': { res: 'gfx/invobjs/meat-poultry', mod: 'gfx/invobjs/meat-woodgrouse' },

  'Roast Chicken': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-chicken' },
  'Roast Eagle Owl': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-eagleowl' },
  'Roast Golden Eagle': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-goldeneagle' },
  'Roast Magpie': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-magpie' },
  'Roast Mallard': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-mallard' },
  'Roast Ptarmigan': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-ptarmigan' },
  'Roast Quail': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-quail' },
  'Roast Rock Dove': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-rockdove' },
  'Roast Seagull': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-seagull' },
  'Roast Swan': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-swan' },
  'Roast Wood Grouse': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-woodgrouse' },

  'Sizzling Roast Chicken': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-chicken' },
  'Sizzling Roast Eagle Owl': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-eagleowl' },
  'Sizzling Roast Golden Eagle': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-goldeneagle' },
  'Sizzling Roast Magpie': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-magpie' },
  'Sizzling Roast Mallard': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-mallard' },
  'Sizzling Roast Ptarmigan': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-ptarmigan' },
  'Sizzling Roast Quail': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-quail' },
  'Sizzling Roast Rock Dove': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-rockdove' },
  'Sizzling Roast Seagull': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-seagull' },
  'Sizzling Roast Swan': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-swan' },
  'Sizzling Roast Wood Grouse': { res: 'gfx/invobjs/meat-rpoultry', mod: 'gfx/invobjs/meat-woodgrouse' },

  'Spitroast Chicken': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-chicken' },
  'Spitroast Eagle Owl': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-eagleowl' },
  'Spitroast Golden Eagle': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-goldeneagle' },
  'Spitroast Magpie': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-magpie' },
  'Spitroast Mallard': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-mallard' },
  'Spitroast Ptarmigan': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-ptarmigan' },
  'Spitroast Quail': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-quail' },
  'Spitroast Rock Dove': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-rockdove' },
  'Spitroast Seagull': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-seagull' },
  'Spitroast Swan': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-swan' },
  'Spitroast Wood Grouse': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-woodgrouse' },

  'Sizzling Spitroast Chicken': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-chicken' },
  'Sizzling Spitroast Eagle Owl': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-eagleowl' },
  'Sizzling Spitroast Golden Eagle': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-goldeneagle' },
  'Sizzling Spitroast Magpie': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-magpie' },
  'Sizzling Spitroast Mallard': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-mallard' },
  'Sizzling Spitroast Ptarmigan': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-ptarmigan' },
  'Sizzling Spitroast Quail': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-quail' },
  'Sizzling Spitroast Rock Dove': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-rockdove' },
  'Sizzling Spitroast Seagull': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-seagull' },
  'Sizzling Spitroast Swan': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-swan' },
  'Sizzling Spitroast Wood Grouse': { res: 'gfx/invobjs/meat-spoultry', mod: 'gfx/invobjs/meat-woodgrouse' },

  'Smoked Chicken': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-chicken' },
  'Smoked Eagle Owl': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-eagleowl' },
  'Smoked Golden Eagle': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-goldeneagle' },
  'Smoked Magpie': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-magpie' },
  'Smoked Mallard': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-mallard' },
  'Smoked Ptarmigan': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-ptarmigan' },
  'Smoked Quail': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-quail' },
  'Smoked Rock Dove': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-rockdove' },
  'Smoked Seagull': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-seagull' },
  'Smoked Swan': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-swan' },
  'Smoked Wood Grouse': { res: 'gfx/invobjs/meat-kpoultry', mod: 'gfx/invobjs/meat-woodgrouse' },

  'Ant': { res: 'gfx/invobjs/meat-weird', mod: 'gfx/invobjs/meat-ant' },
  'Boreworm': { res: 'gfx/invobjs/meat-weird', mod: 'gfx/invobjs/meat-boreworm' },
  'Cave louse': { res: 'gfx/invobjs/meat-weird', mod: 'gfx/invobjs/meat-cavelouse' },
  'Chasm conch': { res: 'gfx/invobjs/meat-weird', mod: 'gfx/invobjs/meat-chasmconch' },
  'Troll': { res: 'gfx/invobjs/meat-weird', mod: 'gfx/invobjs/meat-troll' },

  'Smoked Ant': { res: 'gfx/invobjs/meat-kweird', mod: 'gfx/invobjs/meat-ant' },
  'Smoked Boreworm': { res: 'gfx/invobjs/meat-kweird', mod: 'gfx/invobjs/meat-boreworm' },
  'Smoked Cave louse': { res: 'gfx/invobjs/meat-kweird', mod: 'gfx/invobjs/meat-cavelouse' },
  'Smoked Chasm conch': { res: 'gfx/invobjs/meat-kweird', mod: 'gfx/invobjs/meat-chasmconch' },
  'Smoked Troll': { res: 'gfx/invobjs/meat-kweird', mod: 'gfx/invobjs/meat-troll' },

  'Roast Ant': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-ant' },
  'Roast Boreworm': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-boreworm' },
  'Roast Cave louse': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-cavelouse' },
  'Roast Chasm conch': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-chasmconch' },
  'Roast Troll': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-troll' },

  'Sizzling Roast Ant': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-ant' },
  'Sizzling Roast Boreworm': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-boreworm' },
  'Sizzling Roast Cave louse': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-cavelouse' },
  'Sizzling Roast Chasm conch': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-chasmconch' },
  'Sizzling Roast Troll': { res: 'gfx/invobjs/meat-rweird', mod: 'gfx/invobjs/meat-troll' },

  'Spitroast Ant': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-ant' },
  'Spitroast Boreworm': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-boreworm' },
  'Spitroast Cave louse': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-cavelouse' },
  'Spitroast Chasm conch': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-chasmconch' },
  'Spitroast Troll': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-troll' },

  'Sizzling Spitroast Ant': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-ant' },
  'Sizzling Spitroast Boreworm': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-boreworm' },
  'Sizzling Spitroast Cave louse': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-cavelouse' },
  'Sizzling Spitroast Chasm conch': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-chasmconch' },
  'Sizzling Spitroast Troll': { res: 'gfx/invobjs/meat-sweird', mod: 'gfx/invobjs/meat-troll' },

  'Lobster': { res: 'gfx/invobjs/meat-crust', mod: 'gfx/invobjs/meat-lobster' },
  'Crab': { res: 'gfx/invobjs/meat-crust', mod: 'gfx/invobjs/meat-crab' },

  'Sizzling Lobster': { res: 'gfx/invobjs/meat-crustroast', mod: 'gfx/invobjs/meat-lobster' },
  'Sizzling Crab': { res: 'gfx/invobjs/meat-crustroast', mod: 'gfx/invobjs/meat-crab' },

  'Smoked Lobster': { res: 'gfx/invobjs/meat-crustsmoke', mod: 'gfx/invobjs/meat-lobster' },
  'Smoked Crab': { res: 'gfx/invobjs/meat-crustsmoke', mod: 'gfx/invobjs/meat-crab' },

  'Goat bollock': { res: 'gfx/invobjs/meat-testis', mod: 'gfx/invobjs/meat-goat' },
  'Beef bollock': { res: 'gfx/invobjs/meat-testis', mod: 'gfx/invobjs/meat-cow' },
  'Pork bollock': { res: 'gfx/invobjs/meat-testis', mod: 'gfx/invobjs/meat-pig' },
  'Horse bollock': { res: 'gfx/invobjs/meat-testis', mod: 'gfx/invobjs/meat-horse' },
  'Mutton bollock': { res: 'gfx/invobjs/meat-testis', mod: 'gfx/invobjs/meat-sheep' },


  'Aurochs Milk': { res: 'gfx/invobjs/milk', mod: 'gfx/invobjs/meat-aurochs' },
  'Goatsmilk': { res: 'gfx/invobjs/milk', mod: 'gfx/invobjs/meat-goat' },
  'Cowsmilk': { res: 'gfx/invobjs/milk', mod: 'gfx/invobjs/meat-cow' },
  'Sheepsmilk': { res: 'gfx/invobjs/milk', mod: 'gfx/invobjs/meat-sheep' },

  'Abyss Gazer': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-abyssgazer' },
  'Asp': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-asp' },
  'Bass': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-bass' },
  'Bream': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-bream' },
  'Brill': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-brill' },
  'Burbot': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-burbot' },
  'Carp': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-carp' },
  'Catfish': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-catfish' },
  'Cave angler': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-caveangler' },
  'Cave Sculpin': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-cavesculpin' },
  'Cavelacanth': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-cavelacanth' },
  'Chub': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-chub' },
  'Cod': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-cod' },
  'Eel': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-eel' },
  'Grayling': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-grayling' },
  'Haddock': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-haddock' },
  'Herring': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-herring' },
  'Ide': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-ide' },
  'Lavaret': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-lavaret' },
  'Mackerel': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-mackerel' },
  'Mullet': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-mullet' },
  'Pale Ghostfish': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-paleghostfish' },
  'Perch': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-perch' },
  'Pike': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-pike' },
  'Plaice': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-plaice' },
  'Pomfret': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-pomfret' },
  'Roach': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-roach' },
  'Rose fish': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-rosefish' },
  'Ruffe': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-ruffe' },
  'Saithe': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-saithe' },
  'Salmon': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-salmon' },
  'Silver Bream': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-silverbream' },
  'Smelt': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-smelt' },
  'Sturgeon': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-sturgeon' },
  'Tench': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-tench' },
  'Trout': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-trout' },
  'Whiting': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-whiting' },
  'Zander': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-zander' },
  'Zope': { res: 'gfx/invobjs/meat-filet', mod: 'gfx/invobjs/meat-zope' },

  'Dried Filet of Abyss Gazer': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-abyssgazer' },
  'Dried Filet of Asp': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-asp' },
  'Dried Filet of Bass': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-bass' },
  'Dried Filet of Bream': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-bream' },
  'Dried Filet of Brill': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-brill' },
  'Dried Filet of Burbot': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-burbot' },
  'Dried Filet of Carp': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-carp' },
  'Dried Filet of Catfish': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-catfish' },
  'Dried Filet of Cave Angler': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-caveangler' },
  'Dried Filet of Cave Sculpin': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-cavesculpin' },
  'Dried Filet of Cavelacanth': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-cavelacanth' },
  'Dried Filet of Chub': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-chub' },
  'Dried Filet of Cod': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-cod' },
  'Dried Filet of Eel': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-eel' },
  'Dried Filet of Grayling': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-grayling' },
  'Dried Filet of Haddock': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-haddock' },
  'Dried Filet of Herring': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-herring' },
  'Dried Filet of Ide': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-ide' },
  'Dried Filet of Lavaret': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-lavaret' },
  'Dried Filet of Mackerel': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-mackerel' },
  'Dried Filet of Mullet': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-mullet' },
  'Dried Filet of Pale Ghostfish': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-paleghostfish' },
  'Dried Filet of Perch': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-perch' },
  'Dried Filet of Pike': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-pike' },
  'Dried Filet of Plaice': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-plaice' },
  'Dried Filet of Pomfret': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-pomfret' },
  'Dried Filet of Roach': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-roach' },
  'Dried Filet of Rose fish': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-rosefish' },
  'Dried Filet of Ruffe': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-ruffe' },
  'Dried Filet of Saithe': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-saithe' },
  'Dried Filet of Salmon': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-salmon' },
  'Dried Filet of Silver Bream': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-silverbream' },
  'Dried Filet of Smelt': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-smelt' },
  'Dried Filet of Sturgeon': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-sturgeon' },
  'Dried Filet of Tench': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-tench' },
  'Dried Filet of Trout': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-trout' },
  'Dried Filet of Whiting': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-whiting' },
  'Dried Filet of Zander': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-zander' },
  'Dried Filet of Zope': { res: 'gfx/invobjs/meat-dfilet', mod: 'gfx/invobjs/meat-zope' },

  'Spitroast Abyss Gazer': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-abyssgazer' },
  'Spitroast Asp': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-asp' },
  'Spitroast Bass': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-bass' },
  'Spitroast Bream': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-bream' },
  'Spitroast Brill': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-brill' },
  'Spitroast Burbot': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-burbot' },
  'Spitroast Carp': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-carp' },
  'Spitroast Catfish': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-catfish' },
  'Spitroast Cave Angler': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-caveangler' },
  'Spitroast Cave Sculpin': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-cavesculpin' },
  'Spitroast Cavelacanth': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-cavelacanth' },
  'Spitroast Chub': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-chub' },
  'Spitroast Cod': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-cod' },
  'Spitroast Eel': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-eel' },
  'Spitroast Grayling': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-grayling' },
  'Spitroast Haddock': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-haddock' },
  'Spitroast Herring': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-herring' },
  'Spitroast Ide': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-ide' },
  'Spitroast Lavaret': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-lavaret' },
  'Spitroast Mackerel': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-mackerel' },
  'Spitroast Mullet': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-mullet' },
  'Spitroast Pale Ghostfish': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-paleghostfish' },
  'Spitroast Perch': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-perch' },
  'Spitroast Pike': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-pike' },
  'Spitroast Plaice': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-plaice' },
  'Spitroast Pomfret': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-pomfret' },
  'Spitroast Roach': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-roach' },
  'Spitroast Rose fish': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-rosefish' },
  'Spitroast Ruffe': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-ruffe' },
  'Spitroast Saithe': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-saithe' },
  'Spitroast Salmon': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-salmon' },
  'Spitroast Silver Bream': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-silverbream' },
  'Spitroast Smelt': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-smelt' },
  'Spitroast Sturgeon': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-sturgeon' },
  'Spitroast Tench': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-tench' },
  'Spitroast Trout': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-trout' },
  'Spitroast Whiting': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-whiting' },
  'Spitroast Zander': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-zander' },
  'Spitroast Zope': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-zope' },

  'Sizzling Spitroast Abyss Gazer': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-abyssgazer' },
  'Sizzling Spitroast Asp': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-asp' },
  'Sizzling Spitroast Bass': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-bass' },
  'Sizzling Spitroast Bream': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-bream' },
  'Sizzling Spitroast Brill': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-brill' },
  'Sizzling Spitroast Burbot': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-burbot' },
  'Sizzling Spitroast Carp': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-carp' },
  'Sizzling Spitroast Catfish': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-catfish' },
  'Sizzling Spitroast Cave Angler': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-caveangler' },
  'Sizzling Spitroast Cave Sculpin': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-cavesculpin' },
  'Sizzling Spitroast Cavelacanth': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-cavelacanth' },
  'Sizzling Spitroast Chub': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-chub' },
  'Sizzling Spitroast Cod': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-cod' },
  'Sizzling Spitroast Eel': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-eel' },
  'Sizzling Spitroast Grayling': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-grayling' },
  'Sizzling Spitroast Haddock': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-haddock' },
  'Sizzling Spitroast Herring': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-herring' },
  'Sizzling Spitroast Ide': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-ide' },
  'Sizzling Spitroast Lavaret': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-lavaret' },
  'Sizzling Spitroast Mackerel': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-mackerel' },
  'Sizzling Spitroast Mullet': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-mullet' },
  'Sizzling Spitroast Pale Ghostfish': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-paleghostfish' },
  'Sizzling Spitroast Perch': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-perch' },
  'Sizzling Spitroast Pike': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-pike' },
  'Sizzling Spitroast Plaice': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-plaice' },
  'Sizzling Spitroast Pomfret': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-pomfret' },
  'Sizzling Spitroast Roach': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-roach' },
  'Sizzling Spitroast Rose fish': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-rosefish' },
  'Sizzling Spitroast Ruffe': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-ruffe' },
  'Sizzling Spitroast Saithe': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-saithe' },
  'Sizzling Spitroast Salmon': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-salmon' },
  'Sizzling Spitroast Silver Bream': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-silverbream' },
  'Sizzling Spitroast Smelt': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-smelt' },
  'Sizzling Spitroast Sturgeon': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-sturgeon' },
  'Sizzling Spitroast Tench': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-tench' },
  'Sizzling Spitroast Trout': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-trout' },
  'Sizzling Spitroast Whiting': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-whiting' },
  'Sizzling Spitroast Zander': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-zander' },
  'Sizzling Spitroast Zope': { res: 'gfx/invobjs/meat-sfilet', mod: 'gfx/invobjs/meat-zope' },

  'Smoked Abyss Gazer': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-abyssgazer' },
  'Smoked Asp': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-asp' },
  'Smoked Bass': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-bass' },
  'Smoked Bream': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-bream' },
  'Smoked Brill': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-brill' },
  'Smoked Burbot': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-burbot' },
  'Smoked Carp': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-carp' },
  'Smoked Catfish': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-catfish' },
  'Smoked Cave Angler': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-caveangler' },
  'Smoked Cave Sculpin': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-cavesculpin' },
  'Smoked Cavelacanth': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-cavelacanth' },
  'Smoked Chub': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-chub' },
  'Smoked Cod': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-cod' },
  'Smoked Eel': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-eel' },
  'Smoked Grayling': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-grayling' },
  'Smoked Haddock': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-haddock' },
  'Smoked Herring': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-herring' },
  'Smoked Ide': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-ide' },
  'Smoked Lavaret': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-lavaret' },
  'Smoked Mackerel': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-mackerel' },
  'Smoked Mullet': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-mullet' },
  'Smoked Pale Ghostfish': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-paleghostfish' },
  'Smoked Perch': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-perch' },
  'Smoked Pike': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-pike' },
  'Smoked Plaice': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-plaice' },
  'Smoked Pomfret': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-pomfret' },
  'Smoked Roach': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-roach' },
  'Smoked Rose fish': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-rosefish' },
  'Smoked Ruffe': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-ruffe' },
  'Smoked Saithe': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-saithe' },
  'Smoked Salmon': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-salmon' },
  'Smoked Silver Bream': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-silverbream' },
  'Smoked Smelt': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-smelt' },
  'Smoked Sturgeon': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-sturgeon' },
  'Smoked Tench': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-tench' },
  'Smoked Trout': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-trout' },
  'Smoked Whiting': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-whiting' },
  'Smoked Zander': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-zander' },
  'Smoked Zope': { res: 'gfx/invobjs/meat-kfilet', mod: 'gfx/invobjs/meat-zope' },

  'Abyss Gazer Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-abyssgazer' },
  'Asp Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-asp' },
  'Bass Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-bass' },
  'Bream Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-bream' },
  'Brill Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-brill' },
  'Burbot Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-burbot' },
  'Carp Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-carp' },
  'Catfish Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-catfish' },
  'Cave Angler Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-caveangler' },
  'Cave Sculpin Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-cavesculpin' },
  'Cavelacanth Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-cavelacanth' },
  'Chub Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-chub' },
  'Cod Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-cod' },
  'Eel Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-eel' },
  'Grayling Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-grayling' },
  'Haddock Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-haddock' },
  'Herring Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-herring' },
  'Ide Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-ide' },
  'Lavaret Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-lavaret' },
  'Mackerel Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-mackerel' },
  'Mullet Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-mullet' },
  'Pale Ghostfish Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-paleghostfish' },
  'Perch Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-perch' },
  'Pike Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-pike' },
  'Plaice Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-plaice' },
  'Pomfret Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-pomfret' },
  'Roach Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-roach' },
  'Rose fish Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-rosefish' },
  'Ruffe Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-ruffe' },
  'Saithe Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-saithe' },
  'Salmon Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-salmon' },
  'Silver Bream Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-silverbream' },
  'Smelt Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-smelt' },
  'Caviar': { res: 'gfx/invobjs/caviar', mod: 'gfx/invobjs/meat-sturgeon' },
  'Tench Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-tench' },
  'Trout Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-trout' },
  'Whiting Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-whiting' },
  'Zander Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-zander' },
  'Zope Roe': { res: 'gfx/invobjs/roe', mod: 'gfx/invobjs/meat-zope' },

  '': { res: '' },
};


stalls = readStalls();
loadedStalls = readStalls();


function mapIngredientName(ingredient) {
  if (listContains(['Trombone chantrelle', 'Block of Trombone Chantrelle'], ingredient.name)) {
    return 'Trombonechantrelle';
  }
  return ingredient.name;
}

function listContains(list, el) {
  return list.filter(e => e === el).length > 0;
}

function updateGfx(name) {
  downloadFile('http://www.havenandhearth.com/mt/r/' + name, './img/' + name + '.png');
}

app.use(express.static('pages'));
app.use(bodyParser.json());
app.use('/img/', express.static('img'));
app.use('/img/', serveIndex('img'));

app.get('/api/food', (req, res) => {
  res.json({ data: allFood });
});
app.get('/api/resources', (req, res) => {
  res.json({ data: resources });
});
app.get('/api/bot/pathing', (req, res) => {
  let market = req.query.market;
  res.json(JSON.parse(fs.readFileSync(nodesDataPath))
    .filter(e => e.market === market)[0]);
});
app.get('/api/stalls', (req, res) => {
  res.json(loadedStalls);
});
app.get('/api/tmpStalls', (req, res) => {
  res.json(stalls);
});
app.get('/api/stalls/clear', (req, res) => {
  stalls = loadedStalls ? loadedStalls : [];
  res.json({ data: 'ok' });
});
app.get('/api/stalls/publish', (req, res) => {
  loadedStalls = [...stalls];
  saveStalls();
  res.json({ data: 'ok' });
});
app.post('/api/stalls/add', (req, res) => {
  let stall = stalls.filter(e => compareCoords(req.body.coord, e.coord))[0];
  if (stall) {
    if (!stall.timestamp || req.body.timestamp > stall.timestamp) {
      console.log(`updating ${stall.market} x:${stall.coord.x}, y:${stall.coord.y};`);
      stall.rows = req.body.rows;
      stall.timestamp = req.body.timestamp;
    }
  } else {
    console.log(`adding ${req.body.market} x:${req.body.coord.x}, y:${req.body.coord.y};`);
    stalls.push(req.body);
  }
  if (req.body.rows) {
    updateStallGfxs(req.body.rows);
  }
  res.json({ data: 'ok' });
});
app.post('/api/stalls/init', (req, res) => {
  let reqStalls = req.body;
  let newStalls = reqStalls.filter(r => !stalls.some(e => compareCoords(e.coord, r.coord)));
  newStalls.forEach(e => console.log(`adding ${e.market} x:${e.coord.x}, y:${e.coord.y};`));
  stalls.push(...newStalls);
});

function updateStallGfxs(shopBoxes) {
  const resources = [];
  shopBoxes.forEach(s => {
    if (s && s.item && s.item.additionalInfo) {
      mapAdditionalInfo(s.item.additionalInfo, s.item);
    }
    let gfxO = [
      ...extractObjectsWithFields(s, ['gfx', 'name']),
      ...extractObjectsWithFields(s, ['gfx', 'attr'])
    ];
    gfxO.map(e => {
      e.gfx = mapGfx(e.gfx, e.name)
      return e;
    });
    resources.push(...gfxO.map(e => e.gfx));
  });
  resources.forEach(updateGfx);
}

function mapGfx(gfx, name) {
  if (gfx === 'gfx/invobjs/gems/gemstone') {
    let gemNames = name.split(' ');
    gfx = 'gfx/invobjs/gems/' + gemNames[0].toLowerCase()
      + (gemNames.length > 2 ? '-' + gemNames[1].toLowerCase() : '');
  }
  if (gfx.endsWith('/con')) {
    gfx = gfx.replace('/con', '/cons');
  }
  return gfx;
}

function mapAdditionalInfo(info, item) {
  if (info.gilded) {
    let gildStats = info.gilded.gildings.reduce((a, b) => {
      b.info.forEach(m => {
        let mod = a.filter(e => e.attr.gfx === m.attr.gfx)[0];
        if (!mod) {
          mod = { attr: m.attr, mod: 0 };
          a.push(mod);
        }
        mod.mod += m.mod;
      });
      return a;
    }, []);
    if (info.mods) {
      info.mods = [...gildStats, ...info.mods].reduce((a, v) => {
        let mod = a.filter(e => e.attr.gfx === v.attr.gfx)[0];
        if (!mod) {
          mod = { attr: v.attr, mod: 0 };
          a.push(mod);
        }
        mod.mod += v.mod;
        return a;
      }, [])
    } else {
      info.mods = gildStats
    };
  }
  if (info.mods) {
    info.mods = info.mods.sort((a, b) => getStartOrder(a.attr.gfx) - getStartOrder(b.attr.gfx));
  }
  if (info.contents) {
    let contents = info.contents;
    let containerName = item.name;
    let containerQuality = item.quality;
    item.name = contents.count + contents.unit + ' of ' + contents.name;
    item.quality = contents.quality;
    info.container = {
      name: containerName,
      quality: containerQuality
    }
  }
  if (info.coinage && !item.name.endsWith(info.coinage)) {
    item.name = item.name + ' ' + info.coinage;
  }
  return info;
}

function getStartOrder(gfx) {
  return statsOrder[gfx] ? statsOrder[gfx] : 1000;
}

function compareCoords(coord1, coord2) {
  return Math.abs(coord1.x - coord2.x) < epsilon && Math.abs(coord1.y - coord2.y) < epsilon;
}

function extractObjectsWithFields(o, f, acc) {
  if (!o || !(typeof o === 'object')) return [];
  acc = acc ? acc : [];
  let objects = Array.isArray(o) ? o : [o];
  objects.forEach(e => {
    if (containFields(e, f))
      acc.push(e);
    Object.keys(e)
      .filter(k => k != '0')
      .forEach(key => extractObjectsWithFields(e[key], f, acc));
  });
  return acc;
}

function containFields(o, f) {
  return f.filter(e => o[e]).length === f.length;
}

function extractFields(o, f, fields) {
  if (!o || !(typeof o === 'object')) return [];
  fields = fields ? fields : [];
  let objects = Array.isArray(o) ? o : [o];
  objects.forEach(e => {
    if (e[f])
      fields.push(e[f]);
    Object.keys(e)
      .filter(k => k != '0')
      .forEach(key => extractFields(e[key], f, fields));
  });
  return fields;
}

const server = app.listen(port);
