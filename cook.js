const el = (id) => document.getElementById(id);

let catalog = { products: [] };
let catalogIndex = new Map();
let lastIngredients = [];

function normalizeName(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildCatalogIndex(products) {
  const map = new Map();
  for (const p of products) {
    const key = normalizeName(p.name);
    if (!map.has(key)) map.set(key, p);
  }
  return map;
}

function parseCooklangIngredients(text) {
  const rawList = [];
  let i = 0;

  while (i < text.length) {
    if (text[i] === "@") {
      i += 1;
      let name = "";

      while (i < text.length) {
        const ch = text[i];
        if (ch === "{" || ch === "\n" || ch === "@") break;
        name += ch;
        i += 1;
      }

      name = name.trim().replace(/[\s,.;:!?)\]]+$/g, "");
      if (name) rawList.push(name);
      continue;
    }
    i += 1;
  }

  return rawList;
}

function renderIngredientsList(rawIngredients) {
  const list = el("ingredientsList");
  list.innerHTML = "";

  const order = [];
  const counts = new Map();
  const samples = new Map();

  for (const raw of rawIngredients) {
    let key = normalizeName(raw);
    if (!key) continue;
    if (!counts.has(key)) order.push(key);
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!samples.has(key)) samples.set(key, raw);
  }

  let missing = 0;

  for (const key of order) {
    const product = catalogIndex.get(key);
    const count = counts.get(key) || 0;
    const displayName = samples.get(key);
    const status = product ? "Trouvé" : "Introuvable";

    if (!product) missing += 1;

    const row = document.createElement("div");
    row.className = "d-flex align-items-center justify-content-between p-2 bg-white border rounded-3";
    row.innerHTML = `
      <div>
        <div class="fw-semibold">${displayName}</div>
        <div class="text-muted small">${status}</div>
      </div>
      <div class="text-end">
        <div class="mono fw-semibold">x${count}</div>
      </div>
    `;

    list.appendChild(row);
  }

  el("uniqueCount").textContent = order.length;
  el("missingCount").textContent = missing;
}

function renderCatalogDebug() {
  el("catalogDebug").value = JSON.stringify(catalog, null, 2);
}

function renderIngredientsDebug(rawIngredients) {
  el("ingredientsDebug").value = rawIngredients.join("\n");
}

async function initCatalog() {
  const loaded = await loadCatalogFromGithubIfExists();
  if (loaded) catalog = loaded;
  catalogIndex = buildCatalogIndex(catalog.products);
  renderCatalogDebug();
  if (lastIngredients.length > 0) renderIngredientsList(lastIngredients);
}

el("cookFileInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  await loadCookFile(file);

  e.target.value = "";
});

attachCatalogFileInput("catalogFileInput", (loaded) => {
  catalog = loaded;
  catalogIndex = buildCatalogIndex(catalog.products);
  renderCatalogDebug();
  if (lastIngredients.length > 0) renderIngredientsList(lastIngredients);
});


async function loadCookFile(file) {
  const text = await file.text();
  el("cookPreview").value = text;
  el("cookFilename").textContent = file.name;

  const ingredients = parseCooklangIngredients(text);
  lastIngredients = ingredients;
  renderIngredientsList(ingredients);
  renderIngredientsDebug(ingredients);
}

async function loadCookFromUrl(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    alert("Impossible de charger: " + url);
    return false;
  }
  const text = await res.text();
  el("cookPreview").value = text;
  el("cookFilename").textContent = url.replace(/^.*\\//, \"\");

  const ingredients = parseCooklangIngredients(text);
  lastIngredients = ingredients;
  renderIngredientsList(ingredients);
  renderIngredientsDebug(ingredients);
  return true;
}

function getRecipeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const recipe = params.get("recipe");
  return recipe && recipe.trim().length > 0 ? recipe : null;
}

function handleRecipeMessage(event) {
  const data = event.data || {};
  if (data.type !== "cook-recipe" || !data.recipe) return;
  el("recipeRequested").textContent = data.recipe;
  loadCookFromUrl(data.recipe).then((ok) => {
    if (!ok) {
      el("recipeRequested").textContent = `${data.recipe} (import manuel requis en mode fichier)`;
    }
  });
}

// init
initCatalog();

const recipeFromQuery = getRecipeFromQuery();
if (recipeFromQuery) {
  el("recipeRequested").textContent = recipeFromQuery;
  const normalized = recipeFromQuery.includes("/") ? recipeFromQuery : `recipes/${recipeFromQuery}`;
  loadCookFromUrl(normalized).then((ok) => {
    if (!ok) {
      el("recipeRequested").textContent = `${recipeFromQuery} (import manuel requis en mode fichier)`;
    }
  });
}

window.addEventListener("message", handleRecipeMessage);
