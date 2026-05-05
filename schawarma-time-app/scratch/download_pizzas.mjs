import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const pizzas = [
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-prosciutto.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-salami.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-funghi.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-regina.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-vegetaria.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-tonno.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-barbecue-bacon.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-diabolo.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/aktion/kaese-wochen/pizza-vegan-bbq.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-vegan-funghi.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-vegan-vegetaria.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-sucuk.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-margherita.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-calzone.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-hawaii.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-spinaci.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-vegan-margherita.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-capricciosa.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-mista.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-bacon-eggs.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-beef-onions.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-paparazzi.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-vulcano.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-inferno.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/aktion/kaese-wochen/pizza-cheese-onion.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-buckelpiste.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/aktion/2025/09-maedn/pizza-brett-pitt.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-chicken-curry.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-muchacho.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-x-treme.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-wuerzwunder.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-gaumengangster.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-urknall.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-homerun.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/aktion/kaese-wochen/pizza-5-cheese.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/aktion/2017-01-fastfood/pizza-sucuk-keeper.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/aktion/2025/03-pimp/pizza-dynamit.png" },
  { "src": "https://dlct0dt1hx57m.cloudfront.net/static/desktop/products/pizza-naturglueck-haehnchen.png" }
];

const targetDir = 'public/assets';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

pizzas.forEach(pizza => {
  const fileName = path.basename(pizza.src);
  const targetPath = path.join(targetDir, fileName);
  console.log(`Downloading ${fileName}...`);
  try {
    execSync(`curl -o "${targetPath}" "${pizza.src}"`);
  } catch (err) {
    console.error(`Failed to download ${fileName}`);
  }
});

console.log('Done!');
