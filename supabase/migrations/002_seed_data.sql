-- Seed data from sample-data.ts

-- Categories
INSERT INTO categories (id, name_en, name_fr, slug, sort_order) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Coffee & Lattes', 'Café et lattés', 'coffee', 1),
  ('a2222222-2222-2222-2222-222222222222', 'Tea & Matcha', 'Thé et matcha', 'tea', 2),
  ('a3333333-3333-3333-3333-333333333333', 'Breakfast', 'Petit-déjeuner', 'breakfast', 3),
  ('a4444444-4444-4444-4444-444444444444', 'Lunch', 'Déjeuner', 'lunch', 4),
  ('a5555555-5555-5555-5555-555555555555', 'Pastries', 'Pâtisseries', 'pastries', 5);

-- Menu items
INSERT INTO menu_items (id, category_id, name_en, name_fr, description_en, description_fr, price, available, sort_order) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Pistachio Latte', 'Latté pistache', 'Creamy pistachio-flavored latte with steamed milk', 'Latté crémeux à la pistache avec lait vapeur', 5.75, true, 1),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'Ube Matcha Latte', 'Latté matcha ube', 'Purple ube and green matcha — a beautiful and delicious combo', 'Ube violet et matcha vert — une combinaison belle et délicieuse', 6.25, true, 1),
  ('b3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'Peanut Latte', 'Latté cacahuète', 'Rich peanut butter latte — our most unique creation', 'Latté riche au beurre de cacahuète — notre création la plus unique', 5.75, true, 2),
  ('b4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', 'Strawberry Matcha Latte', 'Latté matcha fraise', 'Sweet strawberry meets earthy matcha in this refreshing drink', 'Fraise douce rencontre le matcha terreux dans cette boisson rafraîchissante', 6.25, true, 2),
  ('b5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', 'Classic Latte', 'Latté classique', 'Perfectly pulled espresso with silky steamed milk', 'Espresso parfaitement extrait avec du lait vapeur soyeux', 4.50, true, 3),
  ('b6666666-6666-6666-6666-666666666666', 'a3333333-3333-3333-3333-333333333333', 'Eggs Benedict', 'Oeufs bénédictine', 'Poached eggs on our homemade bread with hollandaise sauce', 'Oeufs pochés sur notre pain maison avec sauce hollandaise', 14.50, true, 1),
  ('b7777777-7777-7777-7777-777777777777', 'a3333333-3333-3333-3333-333333333333', 'Avocado Toast', 'Toast à l''avocat', 'Smashed avocado on our fresh homemade bread with cherry tomatoes', 'Avocat écrasé sur notre pain frais maison avec tomates cerises', 12.00, true, 2),
  ('b8888888-8888-8888-8888-888888888888', 'a4444444-4444-4444-4444-444444444444', 'Hot & Sour Soup', 'Soupe aigre-piquante', 'Our famous homemade hot and sour soup — a customer favorite', 'Notre célèbre soupe aigre-piquante maison — un favori des clients', 8.50, true, 1),
  ('b9999999-9999-9999-9999-999999999999', 'a4444444-4444-4444-4444-444444444444', 'Wonton Soup', 'Soupe wonton', 'Handmade wontons in a savory broth — comfort in a bowl', 'Wontons faits main dans un bouillon savoureux — réconfort dans un bol', 9.50, true, 2),
  ('ba111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'Grilled Chicken Sandwich', 'Sandwich poulet grillé', 'Grilled chicken on our freshly baked bread with mixed greens', 'Poulet grillé sur notre pain frais avec verdures mélangées', 13.50, true, 3),
  ('bb111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'Butter Croissant', 'Croissant au beurre', 'Flaky, golden butter croissant baked fresh daily', 'Croissant au beurre feuilleté et doré, cuit frais chaque jour', 3.75, true, 1),
  ('bc111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'Chocolate Brownie', 'Brownie au chocolat', 'Rich, fudgy homemade brownie', 'Brownie maison riche et fondant', 4.25, true, 2);

-- Modifiers
-- Pistachio Latte - Size
INSERT INTO modifiers (id, menu_item_id, name_en, name_fr, sort_order) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Size', 'Taille', 1);
INSERT INTO modifier_options (modifier_id, name_en, name_fr, price_adjustment, sort_order) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Regular', 'Régulier', 0, 1),
  ('c1111111-1111-1111-1111-111111111111', 'Large', 'Grand', 1.00, 2);

-- Pistachio Latte - Milk
INSERT INTO modifiers (id, menu_item_id, name_en, name_fr, sort_order) VALUES
  ('c2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'Milk', 'Lait', 2);
INSERT INTO modifier_options (modifier_id, name_en, name_fr, price_adjustment, sort_order) VALUES
  ('c2222222-2222-2222-2222-222222222222', 'Regular', 'Régulier', 0, 1),
  ('c2222222-2222-2222-2222-222222222222', 'Oat', 'Avoine', 0.75, 2),
  ('c2222222-2222-2222-2222-222222222222', 'Almond', 'Amande', 0.75, 3);

-- Ube Matcha Latte - Size
INSERT INTO modifiers (id, menu_item_id, name_en, name_fr, sort_order) VALUES
  ('c3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'Size', 'Taille', 1);
INSERT INTO modifier_options (modifier_id, name_en, name_fr, price_adjustment, sort_order) VALUES
  ('c3333333-3333-3333-3333-333333333333', 'Regular', 'Régulier', 0, 1),
  ('c3333333-3333-3333-3333-333333333333', 'Large', 'Grand', 1.00, 2);

-- Peanut Latte - Size
INSERT INTO modifiers (id, menu_item_id, name_en, name_fr, sort_order) VALUES
  ('c4444444-4444-4444-4444-444444444444', 'b3333333-3333-3333-3333-333333333333', 'Size', 'Taille', 1);
INSERT INTO modifier_options (modifier_id, name_en, name_fr, price_adjustment, sort_order) VALUES
  ('c4444444-4444-4444-4444-444444444444', 'Regular', 'Régulier', 0, 1),
  ('c4444444-4444-4444-4444-444444444444', 'Large', 'Grand', 1.00, 2);

-- Peanut Latte - Milk
INSERT INTO modifiers (id, menu_item_id, name_en, name_fr, sort_order) VALUES
  ('c5555555-5555-5555-5555-555555555555', 'b3333333-3333-3333-3333-333333333333', 'Milk', 'Lait', 2);
INSERT INTO modifier_options (modifier_id, name_en, name_fr, price_adjustment, sort_order) VALUES
  ('c5555555-5555-5555-5555-555555555555', 'Regular', 'Régulier', 0, 1),
  ('c5555555-5555-5555-5555-555555555555', 'Oat', 'Avoine', 0.75, 2);

-- Strawberry Matcha Latte - Size
INSERT INTO modifiers (id, menu_item_id, name_en, name_fr, sort_order) VALUES
  ('c6666666-6666-6666-6666-666666666666', 'b4444444-4444-4444-4444-444444444444', 'Size', 'Taille', 1);
INSERT INTO modifier_options (modifier_id, name_en, name_fr, price_adjustment, sort_order) VALUES
  ('c6666666-6666-6666-6666-666666666666', 'Regular', 'Régulier', 0, 1),
  ('c6666666-6666-6666-6666-666666666666', 'Large', 'Grand', 1.00, 2);

-- Classic Latte - Size
INSERT INTO modifiers (id, menu_item_id, name_en, name_fr, sort_order) VALUES
  ('c7777777-7777-7777-7777-777777777777', 'b5555555-5555-5555-5555-555555555555', 'Size', 'Taille', 1);
INSERT INTO modifier_options (modifier_id, name_en, name_fr, price_adjustment, sort_order) VALUES
  ('c7777777-7777-7777-7777-777777777777', 'Regular', 'Régulier', 0, 1),
  ('c7777777-7777-7777-7777-777777777777', 'Large', 'Grand', 1.00, 2);

-- Classic Latte - Milk
INSERT INTO modifiers (id, menu_item_id, name_en, name_fr, sort_order) VALUES
  ('c8888888-8888-8888-8888-888888888888', 'b5555555-5555-5555-5555-555555555555', 'Milk', 'Lait', 2);
INSERT INTO modifier_options (modifier_id, name_en, name_fr, price_adjustment, sort_order) VALUES
  ('c8888888-8888-8888-8888-888888888888', 'Regular', 'Régulier', 0, 1),
  ('c8888888-8888-8888-8888-888888888888', 'Oat', 'Avoine', 0.75, 2),
  ('c8888888-8888-8888-8888-888888888888', 'Almond', 'Amande', 0.75, 3),
  ('c8888888-8888-8888-8888-888888888888', 'Soy', 'Soja', 0.50, 4);

-- Avocado Toast - Add-on
INSERT INTO modifiers (id, menu_item_id, name_en, name_fr, sort_order) VALUES
  ('c9999999-9999-9999-9999-999999999999', 'b7777777-7777-7777-7777-777777777777', 'Add-on', 'Supplément', 1);
INSERT INTO modifier_options (modifier_id, name_en, name_fr, price_adjustment, sort_order) VALUES
  ('c9999999-9999-9999-9999-999999999999', 'Poached egg', 'Oeuf poché', 2.00, 1),
  ('c9999999-9999-9999-9999-999999999999', 'Smoked salmon', 'Saumon fumé', 4.00, 2);

-- Cafe info
INSERT INTO cafe_info (hours, address, phone, pickup_lead_time, max_advance_order_days) VALUES (
  '[
    {"day": "Monday", "open": "07:30", "close": "15:00", "closed": false},
    {"day": "Tuesday", "open": "07:30", "close": "15:00", "closed": false},
    {"day": "Wednesday", "open": "07:30", "close": "15:00", "closed": false},
    {"day": "Thursday", "open": "07:30", "close": "15:00", "closed": false},
    {"day": "Friday", "open": "07:30", "close": "15:00", "closed": false},
    {"day": "Saturday", "open": "08:00", "close": "15:00", "closed": false},
    {"day": "Sunday", "open": "08:00", "close": "15:00", "closed": false}
  ]'::jsonb,
  '121 Donegani, Pointe-Claire, QC',
  '(514) 000-0000',
  15,
  3
);
