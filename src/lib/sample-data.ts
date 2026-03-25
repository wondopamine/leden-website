import type { MenuItem, Category, CafeInfo } from "./sanity/types";

export const sampleCategories: Category[] = [
  { _id: "cat-1", name: { en: "Coffee & Lattes", fr: "Café et lattés" }, slug: "coffee", order: 1 },
  { _id: "cat-2", name: { en: "Tea & Matcha", fr: "Thé et matcha" }, slug: "tea", order: 2 },
  { _id: "cat-3", name: { en: "Breakfast", fr: "Petit-déjeuner" }, slug: "breakfast", order: 3 },
  { _id: "cat-4", name: { en: "Lunch", fr: "Déjeuner" }, slug: "lunch", order: 4 },
  { _id: "cat-5", name: { en: "Pastries", fr: "Pâtisseries" }, slug: "pastries", order: 5 },
];

export const sampleMenuItems: MenuItem[] = [
  {
    _id: "item-1",
    name: { en: "Pistachio Latte", fr: "Latté pistache" },
    description: {
      en: "Creamy pistachio-flavored latte with steamed milk",
      fr: "Latté crémeux à la pistache avec lait vapeur",
    },
    price: 5.75,
    category: { _id: "cat-1", name: { en: "Coffee & Lattes", fr: "Café et lattés" }, slug: "coffee" },
    available: true,
    modifiers: [
      {
        name: { en: "Size", fr: "Taille" },
        options: [
          { name: { en: "Regular", fr: "Régulier" }, priceAdjustment: 0 },
          { name: { en: "Large", fr: "Grand" }, priceAdjustment: 1.0 },
        ],
      },
      {
        name: { en: "Milk", fr: "Lait" },
        options: [
          { name: { en: "Regular", fr: "Régulier" }, priceAdjustment: 0 },
          { name: { en: "Oat", fr: "Avoine" }, priceAdjustment: 0.75 },
          { name: { en: "Almond", fr: "Amande" }, priceAdjustment: 0.75 },
        ],
      },
    ],
  },
  {
    _id: "item-2",
    name: { en: "Ube Matcha Latte", fr: "Latté matcha ube" },
    description: {
      en: "Purple ube and green matcha — a beautiful and delicious combo",
      fr: "Ube violet et matcha vert — une combinaison belle et délicieuse",
    },
    price: 6.25,
    category: { _id: "cat-2", name: { en: "Tea & Matcha", fr: "Thé et matcha" }, slug: "tea" },
    available: true,
    modifiers: [
      {
        name: { en: "Size", fr: "Taille" },
        options: [
          { name: { en: "Regular", fr: "Régulier" }, priceAdjustment: 0 },
          { name: { en: "Large", fr: "Grand" }, priceAdjustment: 1.0 },
        ],
      },
    ],
  },
  {
    _id: "item-3",
    name: { en: "Peanut Latte", fr: "Latté cacahuète" },
    description: {
      en: "Rich peanut butter latte — our most unique creation",
      fr: "Latté riche au beurre de cacahuète — notre création la plus unique",
    },
    price: 5.75,
    category: { _id: "cat-1", name: { en: "Coffee & Lattes", fr: "Café et lattés" }, slug: "coffee" },
    available: true,
    modifiers: [
      {
        name: { en: "Size", fr: "Taille" },
        options: [
          { name: { en: "Regular", fr: "Régulier" }, priceAdjustment: 0 },
          { name: { en: "Large", fr: "Grand" }, priceAdjustment: 1.0 },
        ],
      },
      {
        name: { en: "Milk", fr: "Lait" },
        options: [
          { name: { en: "Regular", fr: "Régulier" }, priceAdjustment: 0 },
          { name: { en: "Oat", fr: "Avoine" }, priceAdjustment: 0.75 },
        ],
      },
    ],
  },
  {
    _id: "item-4",
    name: { en: "Strawberry Matcha Latte", fr: "Latté matcha fraise" },
    description: {
      en: "Sweet strawberry meets earthy matcha in this refreshing drink",
      fr: "Fraise douce rencontre le matcha terreux dans cette boisson rafraîchissante",
    },
    price: 6.25,
    category: { _id: "cat-2", name: { en: "Tea & Matcha", fr: "Thé et matcha" }, slug: "tea" },
    available: true,
    modifiers: [
      {
        name: { en: "Size", fr: "Taille" },
        options: [
          { name: { en: "Regular", fr: "Régulier" }, priceAdjustment: 0 },
          { name: { en: "Large", fr: "Grand" }, priceAdjustment: 1.0 },
        ],
      },
    ],
  },
  {
    _id: "item-5",
    name: { en: "Classic Latte", fr: "Latté classique" },
    description: {
      en: "Perfectly pulled espresso with silky steamed milk",
      fr: "Espresso parfaitement extrait avec du lait vapeur soyeux",
    },
    price: 4.50,
    category: { _id: "cat-1", name: { en: "Coffee & Lattes", fr: "Café et lattés" }, slug: "coffee" },
    available: true,
    modifiers: [
      {
        name: { en: "Size", fr: "Taille" },
        options: [
          { name: { en: "Regular", fr: "Régulier" }, priceAdjustment: 0 },
          { name: { en: "Large", fr: "Grand" }, priceAdjustment: 1.0 },
        ],
      },
      {
        name: { en: "Milk", fr: "Lait" },
        options: [
          { name: { en: "Regular", fr: "Régulier" }, priceAdjustment: 0 },
          { name: { en: "Oat", fr: "Avoine" }, priceAdjustment: 0.75 },
          { name: { en: "Almond", fr: "Amande" }, priceAdjustment: 0.75 },
          { name: { en: "Soy", fr: "Soja" }, priceAdjustment: 0.50 },
        ],
      },
    ],
  },
  {
    _id: "item-6",
    name: { en: "Eggs Benedict", fr: "Oeufs bénédictine" },
    description: {
      en: "Poached eggs on our homemade bread with hollandaise sauce",
      fr: "Oeufs pochés sur notre pain maison avec sauce hollandaise",
    },
    price: 14.50,
    category: { _id: "cat-3", name: { en: "Breakfast", fr: "Petit-déjeuner" }, slug: "breakfast" },
    available: true,
    modifiers: [],
  },
  {
    _id: "item-7",
    name: { en: "Avocado Toast", fr: "Toast à l'avocat" },
    description: {
      en: "Smashed avocado on our fresh homemade bread with cherry tomatoes",
      fr: "Avocat écrasé sur notre pain frais maison avec tomates cerises",
    },
    price: 12.00,
    category: { _id: "cat-3", name: { en: "Breakfast", fr: "Petit-déjeuner" }, slug: "breakfast" },
    available: true,
    modifiers: [
      {
        name: { en: "Add-on", fr: "Supplément" },
        options: [
          { name: { en: "Poached egg", fr: "Oeuf poché" }, priceAdjustment: 2.0 },
          { name: { en: "Smoked salmon", fr: "Saumon fumé" }, priceAdjustment: 4.0 },
        ],
      },
    ],
  },
  {
    _id: "item-8",
    name: { en: "Hot & Sour Soup", fr: "Soupe aigre-piquante" },
    description: {
      en: "Our famous homemade hot and sour soup — a customer favorite",
      fr: "Notre célèbre soupe aigre-piquante maison — un favori des clients",
    },
    price: 8.50,
    category: { _id: "cat-4", name: { en: "Lunch", fr: "Déjeuner" }, slug: "lunch" },
    available: true,
    modifiers: [],
  },
  {
    _id: "item-9",
    name: { en: "Wonton Soup", fr: "Soupe wonton" },
    description: {
      en: "Handmade wontons in a savory broth — comfort in a bowl",
      fr: "Wontons faits main dans un bouillon savoureux — réconfort dans un bol",
    },
    price: 9.50,
    category: { _id: "cat-4", name: { en: "Lunch", fr: "Déjeuner" }, slug: "lunch" },
    available: true,
    modifiers: [],
  },
  {
    _id: "item-10",
    name: { en: "Grilled Chicken Sandwich", fr: "Sandwich poulet grillé" },
    description: {
      en: "Grilled chicken on our freshly baked bread with mixed greens",
      fr: "Poulet grillé sur notre pain frais avec verdures mélangées",
    },
    price: 13.50,
    category: { _id: "cat-4", name: { en: "Lunch", fr: "Déjeuner" }, slug: "lunch" },
    available: true,
    modifiers: [],
  },
  {
    _id: "item-11",
    name: { en: "Butter Croissant", fr: "Croissant au beurre" },
    description: {
      en: "Flaky, golden butter croissant baked fresh daily",
      fr: "Croissant au beurre feuilleté et doré, cuit frais chaque jour",
    },
    price: 3.75,
    category: { _id: "cat-5", name: { en: "Pastries", fr: "Pâtisseries" }, slug: "pastries" },
    available: true,
    modifiers: [],
  },
  {
    _id: "item-12",
    name: { en: "Chocolate Brownie", fr: "Brownie au chocolat" },
    description: {
      en: "Rich, fudgy homemade brownie",
      fr: "Brownie maison riche et fondant",
    },
    price: 4.25,
    category: { _id: "cat-5", name: { en: "Pastries", fr: "Pâtisseries" }, slug: "pastries" },
    available: true,
    modifiers: [],
  },
];

export const sampleCafeInfo: CafeInfo = {
  hours: [
    { day: "Monday", open: "07:30", close: "15:00", closed: false },
    { day: "Tuesday", open: "07:30", close: "15:00", closed: false },
    { day: "Wednesday", open: "07:30", close: "15:00", closed: false },
    { day: "Thursday", open: "07:30", close: "15:00", closed: false },
    { day: "Friday", open: "07:30", close: "15:00", closed: false },
    { day: "Saturday", open: "08:00", close: "15:00", closed: false },
    { day: "Sunday", open: "08:00", close: "15:00", closed: false },
  ],
  address: "121 Donegani, Pointe-Claire, QC",
  phone: "(514) 000-0000",
  pickupLeadTime: 15,
  maxAdvanceOrderDays: 3,
};
