export interface StoryCard {
  order: number;
  emoji: string;
  text: string;
}

export interface Story {
  id: string;
  title: string;
  cards: StoryCard[];
}

export const STORIES: Story[] = [
  {
    id: 'make-sandwich',
    title: 'Making a Sandwich',
    cards: [
      { order: 1, emoji: '🍞', text: 'Get two slices of bread' },
      { order: 2, emoji: '🥜', text: 'Spread peanut butter' },
      { order: 3, emoji: '🍇', text: 'Add jelly on top' },
      { order: 4, emoji: '🥪', text: 'Put the bread together!' },
    ],
  },
  {
    id: 'morning-routine',
    title: 'Getting Ready for School',
    cards: [
      { order: 1, emoji: '⏰', text: 'Wake up in the morning' },
      { order: 2, emoji: '🪥', text: 'Brush your teeth' },
      { order: 3, emoji: '👗', text: 'Get dressed' },
      { order: 4, emoji: '🎒', text: 'Grab your backpack and go!' },
    ],
  },
  {
    id: 'plant-flower',
    title: 'Planting a Flower',
    cards: [
      { order: 1, emoji: '🕳️', text: 'Dig a hole in the dirt' },
      { order: 2, emoji: '🌱', text: 'Put the seed in the hole' },
      { order: 3, emoji: '💧', text: 'Water the seed' },
      { order: 4, emoji: '🌸', text: 'Watch the flower grow!' },
    ],
  },
  {
    id: 'build-snowman',
    title: 'Building a Snowman',
    cards: [
      { order: 1, emoji: '❄️', text: 'Roll a big snowball' },
      { order: 2, emoji: '☃️', text: 'Stack a smaller ball on top' },
      { order: 3, emoji: '🥕', text: 'Add a carrot nose and eyes' },
      { order: 4, emoji: '🧣', text: 'Put on a scarf and hat!' },
    ],
  },
  {
    id: 'bake-cookies',
    title: 'Baking Cookies',
    cards: [
      { order: 1, emoji: '🥣', text: 'Mix the cookie dough' },
      { order: 2, emoji: '🍪', text: 'Shape the cookies' },
      { order: 3, emoji: '🔥', text: 'Put them in the oven' },
      { order: 4, emoji: '😋', text: 'Let them cool and eat!' },
    ],
  },
  {
    id: 'wash-dog',
    title: 'Washing the Dog',
    cards: [
      { order: 1, emoji: '🛁', text: 'Fill the tub with water' },
      { order: 2, emoji: '🐕', text: 'Put the dog in the tub' },
      { order: 3, emoji: '🧼', text: 'Scrub with soap' },
      { order: 4, emoji: '✨', text: 'Dry off with a towel!' },
    ],
  },
  {
    id: 'catch-butterfly',
    title: 'Catching a Butterfly',
    cards: [
      { order: 1, emoji: '🦋', text: 'See a pretty butterfly' },
      { order: 2, emoji: '🏃', text: 'Tiptoe very quietly' },
      { order: 3, emoji: '🪺', text: 'Gently catch it in a net' },
      { order: 4, emoji: '👋', text: 'Look at it and let it go!' },
    ],
  },
  {
    id: 'go-fishing',
    title: 'Going Fishing',
    cards: [
      { order: 1, emoji: '🎣', text: 'Get your fishing rod' },
      { order: 2, emoji: '🪱', text: 'Put bait on the hook' },
      { order: 3, emoji: '💦', text: 'Cast the line into the water' },
      { order: 4, emoji: '🐟', text: 'Catch a fish!' },
    ],
  },
];
