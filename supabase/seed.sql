-- =============================================
-- SMASH47 — Product Seed Data + Hero Image
-- Run this in Supabase SQL Editor
-- =============================================

-- 1) Update hero_images in restaurant_settings
UPDATE restaurant_settings
SET hero_images = '["https://tb-static.uber.com/prod/image-proc/processed_images/7b980c9e7431ee27e55ac7e3614a36e2/5283d81c664b43c5f57a3a186d273063.jpeg"]'::jsonb;

-- 2) Clear existing products to avoid duplicates
DELETE FROM products;

-- 3) Insert all products using category slugs as reference
-- ─── BURGER ───────────────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_active, is_most_liked, is_vegetarian, is_vegan, is_halal, extra_groups, position) VALUES
((SELECT id FROM categories WHERE slug = 'burger'), 'Smash Burger', 'Rinderhack, Käse, Bratzwiebeln, Smash Sauce.', 7.50,
 'https://tb-static.uber.com/prod/image-proc/processed_images/3edca42bc4464f54c0cab458475a6691/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, true, false, false, true,
 '[{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-joppie","name":"Joppie Sauce","price":1.00,"is_active":true},{"id":"sauce-ezme","name":"Ezme Sauce","price":1.00,"is_active":true},{"id":"sauce-sessam","name":"Sessam Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 1),

((SELECT id FROM categories WHERE slug = 'burger'), 'Smash 47 Spezial Burger', 'Rinderhack, Käse, Jalapeños, Chili Cheese Sauce.', 8.50,
 'https://tb-static.uber.com/prod/image-proc/processed_images/e30aa0c934b173fc608579a6328566e4/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true,
 '[{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-joppie","name":"Joppie Sauce","price":1.00,"is_active":true},{"id":"sauce-ezme","name":"Ezme Sauce","price":1.00,"is_active":true},{"id":"sauce-sessam","name":"Sessam Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 2),

((SELECT id FROM categories WHERE slug = 'burger'), 'Smash Pastirma Burger', 'Rinderhack, Käse, Rinderschinken, Sauce.', 7.50,
 'https://tb-static.uber.com/prod/image-proc/processed_images/a8700f7230bd99698e3c7584fee8ce4d/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true,
 '[{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-joppie","name":"Joppie Sauce","price":1.00,"is_active":true},{"id":"sauce-ezme","name":"Ezme Sauce","price":1.00,"is_active":true},{"id":"sauce-sessam","name":"Sessam Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 3),

((SELECT id FROM categories WHERE slug = 'burger'), 'Triple Smash Burger', '3x Patty, doppelter Käse, Smash Sauce.', 9.50,
 'https://tb-static.uber.com/prod/image-proc/processed_images/549ebd11167dd35510ea806eb64d786e/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true,
 '[{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-joppie","name":"Joppie Sauce","price":1.00,"is_active":true},{"id":"sauce-ezme","name":"Ezme Sauce","price":1.00,"is_active":true},{"id":"sauce-sessam","name":"Sessam Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 4),

((SELECT id FROM categories WHERE slug = 'burger'), 'Triple Smash Burger 47', '3x Patty, Käse, Jalapeños, Chili Cheese Sauce.', 10.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/3806d0bda8ddd09502034adcbb853310/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true,
 '[{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-joppie","name":"Joppie Sauce","price":1.00,"is_active":true},{"id":"sauce-ezme","name":"Ezme Sauce","price":1.00,"is_active":true},{"id":"sauce-sessam","name":"Sessam Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 5),

((SELECT id FROM categories WHERE slug = 'burger'), 'Chicken Nugget Burger', 'Chicken Nugget, Käse, Eisbergsalat, Sauce.', 5.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/3544a467c1b9fdc1a4851279cd946e49/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true,
 '[{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-joppie","name":"Joppie Sauce","price":1.00,"is_active":true},{"id":"sauce-ezme","name":"Ezme Sauce","price":1.00,"is_active":true},{"id":"sauce-sessam","name":"Sessam Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 6),

((SELECT id FROM categories WHERE slug = 'burger'), 'Extra Long Chilli Cheese Burger', NULL, 7.90,
 'https://tb-static.uber.com/prod/image-proc/processed_images/e84dc34de0048154f9da0d6ef578b174/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true,
 '[{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-joppie","name":"Joppie Sauce","price":1.00,"is_active":true},{"id":"sauce-ezme","name":"Ezme Sauce","price":1.00,"is_active":true},{"id":"sauce-sessam","name":"Sessam Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 7),

((SELECT id FROM categories WHERE slug = 'burger'), 'Crispy Chicken Burger', 'Extra Crispy Burger, Eisbergsalat, Tomaten und Sauce.', 7.00,
 NULL, true, false, false, false, true,
 '[{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-joppie","name":"Joppie Sauce","price":1.00,"is_active":true},{"id":"sauce-ezme","name":"Ezme Sauce","price":1.00,"is_active":true},{"id":"sauce-sessam","name":"Sessam Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 8);

-- ─── BAGUETTE ─────────────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_active, is_most_liked, is_vegetarian, is_vegan, is_halal, extra_groups, position) VALUES
((SELECT id FROM categories WHERE slug = 'baguette'), 'Sucuk Baguette', 'Sucuk, Käse, Tomaten, Gurken, Jalapeños.', 8.50,
 'https://tb-static.uber.com/prod/image-proc/processed_images/9fee6e18eb7fe8316ddb910de7f93752/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true, '[]'::jsonb, 1),

((SELECT id FROM categories WHERE slug = 'baguette'), 'Köfte Baguette', 'Frikadellen (Köfte), Gurken, Ezme, Zwiebeln.', 7.50,
 'https://tb-static.uber.com/prod/image-proc/processed_images/16c9f6d00b6439f80b9a1dbc72e7183f/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true, '[]'::jsonb, 2);

-- ─── ROLLE ────────────────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_active, is_most_liked, is_vegetarian, is_vegan, is_halal, extra_groups, position) VALUES
((SELECT id FROM categories WHERE slug = 'rolle'), 'Falafel Rolle', 'Hausgemachte Falafel, Gemüse, Sesampaste.', 6.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/2972ecc1885033f90fefe87496f736cc/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 1);

-- ─── BEILAGE ──────────────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_active, is_most_liked, is_vegetarian, is_vegan, is_halal, extra_groups, position) VALUES
((SELECT id FROM categories WHERE slug = 'beilage'), 'Chili Cheese Pommes', 'Pommes mit Chili Cheese Sauce und Jalapeños.', 6.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/1c87040302d82e14242c34902903bf41/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, true, true, false, true, '[]'::jsonb, 1),

((SELECT id FROM categories WHERE slug = 'beilage'), 'Pommes (groß)', 'Frittierte Kartoffelstäbchen.', 4.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/3e977da66ded690601e71974f88117ea/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 2),

((SELECT id FROM categories WHERE slug = 'beilage'), 'Nuggets (6er)', 'Hähnchennuggets.', 4.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/f3f13cdfd310da3e5e36d65a85026a06/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true, '[]'::jsonb, 3),

((SELECT id FROM categories WHERE slug = 'beilage'), 'Nuggets (9er)', 'Hähnchennuggets.', 6.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/0572ec00d321a37e7ee6d71ddf0a80b2/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true, '[]'::jsonb, 4),

((SELECT id FROM categories WHERE slug = 'beilage'), 'Chili Cheese Nuggets', NULL, 5.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/5c1fb7c014387f653e54e2b660b6446d/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true, '[]'::jsonb, 5),

((SELECT id FROM categories WHERE slug = 'beilage'), 'Pommes (klein)', 'Frittierte Kartoffelstäbchen.', 4.00,
 NULL, true, false, true, true, true, '[]'::jsonb, 6);

-- ─── MENÜ ─────────────────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_active, is_most_liked, is_vegetarian, is_vegan, is_halal, extra_groups, position) VALUES
((SELECT id FROM categories WHERE slug = 'menue'), 'Menü 1', 'Smash Burger, Pommes, Getränk.', 11.90,
 'https://tb-static.uber.com/prod/image-proc/processed_images/04a9cfb152eb351b8bb0fa7c91f2140a/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, true, false, false, true,
 '[{"id":"eg-drink","name":"Wähle dein Getränk","required":true,"max_select":1,"extras":[{"id":"drink-durstl-multi","name":"Durstlöscher Multivitamin","price":2.00,"is_active":true},{"id":"drink-ayran","name":"Ayran","price":2.00,"is_active":true},{"id":"drink-fritz-kola","name":"Fritz Kola","price":1.00,"is_active":true},{"id":"drink-wasser","name":"Wasser Still","price":0,"is_active":true},{"id":"drink-fritz-zero","name":"Fritz Zero","price":1.00,"is_active":true},{"id":"drink-fritz-orange","name":"Fritz Orange","price":1.00,"is_active":true}]},{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-joppie","name":"Joppie Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 1),

((SELECT id FROM categories WHERE slug = 'menue'), 'Menü 2', 'Köfte Baguette, Pommes, Getränk.', 12.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/a9e11bb4d8596311395c7ec939a7d098/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true,
 '[{"id":"eg-drink","name":"Wähle dein Getränk","required":true,"max_select":1,"extras":[{"id":"drink-durstl-multi","name":"Durstlöscher Multivitamin","price":2.00,"is_active":true},{"id":"drink-ayran","name":"Ayran","price":2.00,"is_active":true},{"id":"drink-fritz-kola","name":"Fritz Kola","price":1.00,"is_active":true},{"id":"drink-wasser","name":"Wasser Still","price":0,"is_active":true}]},{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 2),

((SELECT id FROM categories WHERE slug = 'menue'), 'Menü 3', 'Sucuk Baguette, Pommes, Getränk.', 12.90,
 'https://tb-static.uber.com/prod/image-proc/processed_images/9289935b733b3c7524fbfe42b199f4be/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true,
 '[{"id":"eg-drink","name":"Wähle dein Getränk","required":true,"max_select":1,"extras":[{"id":"drink-durstl-multi","name":"Durstlöscher Multivitamin","price":2.00,"is_active":true},{"id":"drink-ayran","name":"Ayran","price":2.00,"is_active":true},{"id":"drink-fritz-kola","name":"Fritz Kola","price":1.00,"is_active":true},{"id":"drink-wasser","name":"Wasser Still","price":0,"is_active":true}]},{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 3),

((SELECT id FROM categories WHERE slug = 'menue'), 'Menü 4', 'Falafel Rolle, Pommes, Getränk.', 8.90,
 'https://tb-static.uber.com/prod/image-proc/processed_images/bf6f040a4ea7e670ea08715e1bd477a9/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, false, true,
 '[{"id":"eg-drink","name":"Wähle dein Getränk","required":true,"max_select":1,"extras":[{"id":"drink-durstl-multi","name":"Durstlöscher Multivitamin","price":2.00,"is_active":true},{"id":"drink-ayran","name":"Ayran","price":2.00,"is_active":true},{"id":"drink-fritz-kola","name":"Fritz Kola","price":1.00,"is_active":true},{"id":"drink-wasser","name":"Wasser Still","price":0,"is_active":true}]},{"id":"eg-sauce","name":"Wähle deine Saucen","required":false,"max_select":1,"extras":[{"id":"sauce-chili","name":"Chili Cheese Sauce","price":1.00,"is_active":true},{"id":"sauce-smash","name":"Smash Sauce","price":1.00,"is_active":true},{"id":"sauce-mayo","name":"Mayonnaise","price":0.50,"is_active":true},{"id":"sauce-ketchup","name":"Ketchup","price":0.50,"is_active":true}]}]'::jsonb, 4),

((SELECT id FROM categories WHERE slug = 'menue'), 'Extra Long Chilli Cheese Burger Menü 5', NULL, 11.90,
 'https://tb-static.uber.com/prod/image-proc/processed_images/65e6d6c17208f18e3bb1bfafb6a72f4d/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, false, false, true,
 '[{"id":"eg-drink","name":"Wähle dein Getränk","required":true,"max_select":1,"extras":[{"id":"drink-durstl-multi","name":"Durstlöscher Multivitamin","price":2.00,"is_active":true},{"id":"drink-fritz-kola","name":"Fritz Kola","price":1.00,"is_active":true},{"id":"drink-wasser","name":"Wasser Still","price":0,"is_active":true}]}]'::jsonb, 5),

((SELECT id FROM categories WHERE slug = 'menue'), 'Chicken Nuggets Menü 6', '6 Chicken Nuggets, 1 Pommes und Getränk nach Wahl', 9.00,
 NULL, true, false, false, false, true,
 '[{"id":"eg-drink","name":"Wähle dein Getränk","required":true,"max_select":1,"extras":[{"id":"drink-durstl-multi","name":"Durstlöscher Multivitamin","price":2.00,"is_active":true},{"id":"drink-fritz-kola","name":"Fritz Kola","price":1.00,"is_active":true},{"id":"drink-wasser","name":"Wasser Still","price":0,"is_active":true}]}]'::jsonb, 6),

((SELECT id FROM categories WHERE slug = 'menue'), 'Chicken Nuggets Burger Menü', 'Chicken Nuggets Burger, Pommes und Getränke nach Wahl.', 10.50,
 NULL, true, false, false, false, true,
 '[{"id":"eg-drink","name":"Wähle dein Getränk","required":true,"max_select":1,"extras":[{"id":"drink-durstl-multi","name":"Durstlöscher Multivitamin","price":2.00,"is_active":true},{"id":"drink-fritz-kola","name":"Fritz Kola","price":1.00,"is_active":true},{"id":"drink-wasser","name":"Wasser Still","price":0,"is_active":true}]}]'::jsonb, 7);

-- ─── ALKOHOLFREIE GETRÄNKE ────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_active, is_most_liked, is_vegetarian, is_vegan, is_halal, extra_groups, position) VALUES
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Wasser Still', NULL, 2.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/8afd2856d4531a02f66a4353dc3a2131/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 1),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Ayran', NULL, 2.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/3d1e699adfd44701624292f00eee48a5/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, false, true, '[]'::jsonb, 2),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Fritz Zero', NULL, 3.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/7186f5a957c80a846279e0bafa06f1bb/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 3),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Fritz Orange', NULL, 3.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/7baea3d178a12a135891860b41add90e/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 4),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Fritz Kola Orange', NULL, 3.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/abb44d501c3562080e6705688ac89be9/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 5),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Fritz Limo', NULL, 3.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/758cefa84401767d927e0ceea5c53d69/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 6),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Fritz Honigmelone', NULL, 3.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/35787e3a4d975510b5810bf546dd9193/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 7),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Durstlöscher Pfirsich', NULL, 2.50,
 'https://tb-static.uber.com/prod/image-proc/processed_images/6f786c2dd39ec228ca8f5080b1fc0820/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 8),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Durstlöscher Zitrone', NULL, 2.50,
 'https://tb-static.uber.com/prod/image-proc/processed_images/47ce98ff6661dbe9e7f3efde14defd9f/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 9),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Durstlöscher Multivitamin', NULL, 2.50,
 'https://tb-static.uber.com/prod/image-proc/processed_images/82f1a228d026a16be277c821ddd0a7f4/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 10),
((SELECT id FROM categories WHERE slug = 'getraenke'), 'Fritz Kola', NULL, 3.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/5f1d40632044338a299cea5df55637c8/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 11);

-- ─── SOSSEN ───────────────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, is_active, is_most_liked, is_vegetarian, is_vegan, is_halal, extra_groups, position) VALUES
((SELECT id FROM categories WHERE slug = 'saucen'), 'Chili Cheese Sauce', NULL, 1.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/f5df27757f4fd62f69f7a62a63d5c8bc/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, false, true, '[]'::jsonb, 1),
((SELECT id FROM categories WHERE slug = 'saucen'), 'Joppie Sauce', NULL, 1.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/1a26fc1e27b97d4a91bd7c14f31dade9/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, false, true, '[]'::jsonb, 2),
((SELECT id FROM categories WHERE slug = 'saucen'), 'Smash Sauce', NULL, 1.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/e27050afdb8d38a7f6d566bbd3d23821/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, false, true, '[]'::jsonb, 3),
((SELECT id FROM categories WHERE slug = 'saucen'), 'Ezme Sauce', NULL, 1.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/c87fcc15116b25739ec2d80ec38c0697/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 4),
((SELECT id FROM categories WHERE slug = 'saucen'), 'Sessam Sauce', NULL, 1.00,
 'https://tb-static.uber.com/prod/image-proc/processed_images/87cd15d1ca93d22fee8811d3e5e95cd9/70aa2a4db7f990373ca9c376323e3dea.jpeg',
 true, false, true, true, true, '[]'::jsonb, 5),
((SELECT id FROM categories WHERE slug = 'saucen'), 'Mayonnaise', NULL, 0.50,
 NULL, true, false, true, false, true, '[]'::jsonb, 6),
((SELECT id FROM categories WHERE slug = 'saucen'), 'Ketchup', NULL, 0.50,
 NULL, true, false, true, true, true, '[]'::jsonb, 7);
