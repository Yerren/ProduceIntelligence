// Builds Hot or Cold's word list from the Quick, Draw! categories: things people could draw in 20
// seconds. Usage: node scripts/word-list/build.mjs  (writes words.csv next to this script for
// review, and worker/words.json for the worker to pick from)
//
// Source: Google Creative Lab's Quick, Draw! dataset, CC BY 4.0
// (https://github.com/googlecreativelab/quickdraw-dataset).
import { writeFile } from 'node:fs/promises'

const SOURCE = 'https://raw.githubusercontent.com/googlecreativelab/quickdraw-dataset/master/categories.txt'
const OUT = new URL('words.csv', import.meta.url)
const WORKER_OUT = new URL('../../worker/words.json', import.meta.url)

// The hint shown from the start of each game. Every Quick, Draw! word must be in exactly one.
const CATEGORIES = {
  'animal': [
    'ant', 'bat', 'bear', 'bee', 'bird', 'butterfly', 'camel', 'cat', 'cow', 'crab', 'crocodile', 'dog', 'dolphin',
    'duck', 'elephant', 'fish', 'flamingo', 'frog', 'giraffe', 'hedgehog', 'horse', 'kangaroo', 'lion', 'lobster',
    'monkey', 'mosquito', 'mouse', 'octopus', 'owl', 'panda', 'parrot', 'penguin', 'pig', 'rabbit', 'raccoon',
    'rhinoceros', 'scorpion', 'sea turtle', 'shark', 'sheep', 'snail', 'snake', 'spider', 'squirrel', 'swan', 'tiger',
    'whale', 'zebra',
  ],
  'mythical or made-up character': ['angel', 'dragon', 'mermaid', 'snowman'],
  'body part': [
    'arm', 'beard', 'brain', 'ear', 'elbow', 'eye', 'face', 'finger', 'foot', 'goatee', 'hand', 'knee', 'leg',
    'moustache', 'mouth', 'nose', 'skull', 'toe', 'tooth',
  ],
  'fruit or vegetable': [
    'apple', 'asparagus', 'banana', 'blackberry', 'blueberry', 'broccoli', 'carrot', 'grapes', 'mushroom', 'onion',
    'pear', 'peas', 'pineapple', 'potato', 'strawberry', 'string bean', 'watermelon',
  ],
  'food': [
    'birthday cake', 'bread', 'cake', 'cookie', 'donut', 'hamburger', 'hot dog', 'ice cream', 'lollipop', 'peanut',
    'pizza', 'popsicle', 'sandwich', 'steak',
  ],
  'plant': ['bush', 'cactus', 'flower', 'grass', 'house plant', 'leaf', 'palm tree', 'tree'],
  'weather': ['cloud', 'hurricane', 'lightning', 'rain', 'rainbow', 'snowflake', 'tornado'],
  'nature or sky': ['beach', 'feather', 'moon', 'mountain', 'ocean', 'pond', 'river', 'star', 'sun'],
  'vehicle': [
    'aircraft carrier', 'airplane', 'ambulance', 'bicycle', 'bulldozer', 'bus', 'canoe', 'car', 'cruise ship',
    'firetruck', 'flying saucer', 'helicopter', 'hot air balloon', 'motorbike', 'parachute', 'pickup truck',
    'police car', 'sailboat', 'school bus', 'speedboat', 'submarine', 'tractor', 'train', 'truck', 'van', 'wheel',
  ],
  'building or landmark': [
    'barn', 'bridge', 'castle', 'church', 'hospital', 'house', 'jail', 'lighthouse', 'skyscraper', 'tent',
    'windmill', 'The Eiffel Tower', 'The Great Wall of China',
  ],
  'outdoor thing': [
    'campfire', 'fence', 'fire hydrant', 'garden', 'mailbox', 'pool', 'stop sign', 'streetlight', 'traffic light',
  ],
  'furniture or fixture': [
    'bathtub', 'bed', 'bench', 'ceiling fan', 'chair', 'chandelier', 'couch', 'door', 'dresser', 'fireplace',
    'floor lamp', 'hot tub', 'picture frame', 'pillow', 'power outlet', 'sink', 'stairs', 'table', 'toilet', 'vase',
  ],
  'kitchen item': [
    'bottlecap', 'coffee cup', 'cup', 'fork', 'frying pan', 'knife', 'mug', 'spoon', 'teapot', 'wine bottle',
    'wine glass',
  ],
  'appliance or electronics': [
    'alarm clock', 'calculator', 'camera', 'cell phone', 'computer', 'dishwasher', 'fan', 'headphones', 'keyboard',
    'laptop', 'light bulb', 'megaphone', 'microphone', 'microwave', 'oven', 'radio', 'remote control', 'stereo',
    'stove', 'telephone', 'television', 'toaster', 'washing machine',
  ],
  'tool': [
    'anvil', 'axe', 'broom', 'bucket', 'drill', 'garden hose', 'hammer', 'ladder', 'nail', 'pliers', 'rake', 'saw',
    'screwdriver', 'shovel',
  ],
  'everyday object': [
    'basket', 'binoculars', 'candle', 'clock', 'compass', 'cooler', 'flashlight', 'hourglass', 'key', 'lantern',
    'lighter', 'matches', 'sleeping bag', 'snorkel', 'suitcase', 'toothbrush', 'toothpaste', 'umbrella',
  ],
  'medical item': ['bandage', 'stethoscope', 'stitches', 'syringe'],
  'clothing or accessory': [
    'backpack', 'belt', 'bowtie', 'bracelet', 'crown', 'eyeglasses', 'flip flops', 'hat', 'helmet', 'jacket',
    'lipstick', 'necklace', 'pants', 'purse', 'shoe', 'shorts', 'sock', 'sweater', 't-shirt', 'underwear',
    'wristwatch',
  ],
  'musical instrument': [
    'cello', 'clarinet', 'drums', 'guitar', 'harp', 'piano', 'saxophone', 'trombone', 'trumpet', 'violin',
  ],
  'sport or play': [
    'baseball', 'baseball bat', 'basketball', 'boomerang', 'diving board', 'dumbbell', 'golf club', 'hockey puck',
    'hockey stick', 'roller coaster', 'rollerskates', 'see saw', 'skateboard', 'soccer ball', 'swing set',
    'teddy-bear', 'tennis racquet', 'waterslide', 'yoga',
  ],
  'weapon': ['cannon', 'rifle', 'sword'],
  'stationery or paper': [
    'book', 'calendar', 'crayon', 'envelope', 'eraser', 'map', 'marker', 'paint can', 'paintbrush', 'paper clip',
    'passport', 'pencil', 'postcard', 'scissors', 'spreadsheet',
  ],
  'art': ['The Mona Lisa'],
  'shape or symbol': [
    'circle', 'diamond', 'hexagon', 'line', 'octagon', 'smiley face', 'square', 'squiggle', 'triangle', 'zigzag',
  ],
  'idea': ['animal migration', 'camouflage'],
}

const categoryOf = new Map()
for (const [category, words] of Object.entries(CATEGORIES)) {
  for (const word of words) {
    if (categoryOf.has(word)) throw new Error(`"${word}" is in both "${categoryOf.get(word)}" and "${category}"`)
    categoryOf.set(word, category)
  }
}

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`Download of ${SOURCE} failed: ${res.status}`)
const source = (await res.text()).split(/\r?\n/).filter(Boolean)

const missing = source.filter(word => !categoryOf.has(word))
const unknown = [...categoryOf.keys()].filter(word => !source.includes(word))
if (missing.length > 0) throw new Error(`No category for: ${missing.join(', ')}`)
if (unknown.length > 0) throw new Error(`Not in Quick, Draw!: ${unknown.join(', ')}`)

const words = source.map(word => ({ word, category: categoryOf.get(word) }))
await writeFile(OUT, `word,category\n${words.map(w => `${w.word},${w.category}`).join('\n')}\n`)
await writeFile(WORKER_OUT, `[\n${words.map(w => `  ${JSON.stringify(w)}`).join(',\n')}\n]\n`)
console.log(`Wrote ${words.length} words to ${OUT.pathname} and ${WORKER_OUT.pathname}`)
