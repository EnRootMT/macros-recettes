const el = (id) => document.getElementById(id);

let catalog = { products: [] };
let catalogIndex = new Map();
let lastIngredients = [];
let recipesFromIndex = [];

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

function renderRecipesList() {
  const list = el("recipesList");
  list.innerHTML = "";

  for (const name of recipesFromIndex) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "list-group-item list-group-item-action";
    btn.textContent = name;
    btn.addEventListener("click", () => loadCookFromUrl(`recipes/${name}`));
    list.appendChild(btn);
  }
}

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
    return;
  }
  const text = await res.text();
  el("cookPreview").value = text;
  el("cookFilename").textContent = url.replace(/^.*\\//, \"\");

  const ingredients = parseCooklangIngredients(text);
  lastIngredients = ingredients;
  renderIngredientsList(ingredients);
  renderIngredientsDebug(ingredients);
}

// init
initCatalog();
fetch("recipes/index.json", { cache: "no-store" })
  .then((r) => r.ok ? r.json() : null)
  .then((list) => {
    if (!Array.isArray(list) || list.length === 0) {
      el("recipesStatus").textContent = "Aucune recette trouvée dans recipes/index.json (importe-le manuellement).";
      return;
    }
    recipesFromIndex = list.filter((n) => typeof n === "string");
    renderRecipesList();
    el("recipesStatus").textContent = `Recettes: ${recipesFromIndex.length}`;
  })
  .catch(() => {
    el("recipesStatus").textContent = "Impossible de charger recipes/index.json (importe-le manuellement).";
  });

el("recipesIndexInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const list = JSON.parse(text);
    if (!Array.isArray(list)) throw new Error("Format attendu: tableau JSON");
    recipesFromIndex = list.filter((n) => typeof n === "string");
    renderRecipesList();
    el("recipesStatus").textContent = `Recettes: ${recipesFromIndex.length}`;
  } catch (err) {
    alert("Import index.json invalide: " + err.message);
  } finally {
    e.target.value = "";
  }
});
