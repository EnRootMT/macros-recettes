const el = (id) => document.getElementById(id);

let catalog = { products: [] };
let catalogIndex = new Map();
let lastCookText = "";

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

function parseCooklang(text) {
  const trimmed = text.replace(/^\s*---\s*\n/, "");
  const parts = trimmed.split(/\n---\s*\n/);
  const metaBlock = parts[0] || "";
  const bodyBlock = parts[1] || "";
  const notesBlock = parts[2] || "";

  const meta = {};
  for (const line of metaBlock.split("\n")) {
    const m = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (m) meta[m[1].trim()] = m[2].trim();
  }

  const ingredients = [];
  const re = /@([^@\n{]+)(?:\{([^}]*)\})?/g;
  let match;
  while ((match = re.exec(bodyBlock)) !== null) {
    const name = match[1].trim();
    const qtyRaw = (match[2] || "").trim();

    let qty = null;
    let unit = "";
    let grams = null;

    if (qtyRaw) {
      const q = qtyRaw.match(/^\s*([0-9]+(?:[\.,][0-9]+)?)\s*([a-zA-Z]*)\s*$/);
      if (q) {
        qty = Number(q[1].replace(",", "."));
        unit = (q[2] || "").toLowerCase();

        if (unit === "g" || unit === "gr") grams = qty;
        else if (unit === "kg") grams = qty * 1000;
        else if (unit === "ml") grams = qty;
        else if (unit === "l") grams = qty * 1000;
      }
    }

    ingredients.push({ name, qtyRaw, qty, unit, grams });
  }

  return { meta, bodyBlock, notesBlock, ingredients };
}

function renderMeta(meta) {
  const list = el("metaList");
  list.innerHTML = "";

  const entries = Object.entries(meta);
  if (entries.length === 0) {
    list.textContent = "(aucune meta)";
    return;
  }

  for (const [k, v] of entries) {
    const row = document.createElement("div");
    row.className = "d-flex justify-content-between border-bottom py-1";
    row.innerHTML = `<span class="text-muted">${k}</span><span>${v || "—"}</span>`;
    list.appendChild(row);
  }
}

function renderSteps(body) {
  const steps = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const list = el("stepsList");
  list.innerHTML = "";

  for (const step of steps) {
    const li = document.createElement("li");
    li.textContent = step;
    list.appendChild(li);
  }
}

function computeMacros(ingredients) {
  let kcal = 0;
  let prot = 0;
  let fat = 0;
  let sugar = 0;
  let weight = 0;

  for (const ing of ingredients) {
    if (!ing.grams) continue;
    const p = catalogIndex.get(normalizeName(ing.name));
    if (!p) continue;

    const f = ing.grams / 100;
    weight += ing.grams;
    kcal += (Number(p.kcal100) || 0) * f;
    prot += (Number(p.prot100) || 0) * f;
    fat += (Number(p.fat100) || 0) * f;
    sugar += (Number(p.sugar100) || 0) * f;
  }

  return { kcal, prot, fat, sugar, weight };
}

function renderIngredients(ingredients) {
  const tbody = el("ingredientsTbody");
  tbody.innerHTML = "";

  let missing = 0;

  for (const ing of ingredients) {
    const p = catalogIndex.get(normalizeName(ing.name));
    const found = !!p;
    if (!found) missing += 1;

    const row = document.createElement("tr");
    const qtyDisplay = ing.qtyRaw ? ing.qtyRaw : "—";
    const gramsDisplay = ing.grams ? `${ing.grams} g` : "—";

    row.innerHTML = `
      <td>${ing.name}</td>
      <td class="mono">${qtyDisplay}</td>
      <td class="mono">${gramsDisplay}</td>
      <td>${found ? "Trouvé" : "Introuvable"}</td>
    `;
    tbody.appendChild(row);
  }

  el("missingCount").textContent = String(missing);
}

function renderMacros(totals) {
  el("totalWeight").textContent = `${Math.round(totals.weight)} g`;
  el("totalKcal").textContent = Math.round(totals.kcal);
  el("totalProt").textContent = `${Math.round(totals.prot * 10) / 10} g`;
  el("totalFat").textContent = `${Math.round(totals.fat * 10) / 10} g`;
  el("totalSugar").textContent = `${Math.round(totals.sugar * 10) / 10} g`;
}

function renderAllFromText(text) {
  lastCookText = text;
  const parsed = parseCooklang(text);
  renderMeta(parsed.meta);
  renderSteps(parsed.bodyBlock);
  renderIngredients(parsed.ingredients);
  renderMacros(computeMacros(parsed.ingredients));
  el("cookRaw").value = text;
}

async function initCatalog() {
  const loaded = await loadCatalogFromGithubIfExists();
  if (loaded) catalog = loaded;
  catalogIndex = buildCatalogIndex(catalog.products);
  el("catalogDebug").value = JSON.stringify(catalog, null, 2);
  if (lastCookText) renderAllFromText(lastCookText);
}

el("cookFileInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  el("cookFilename").textContent = file.name;
  renderAllFromText(text);
  e.target.value = "";
});

attachCatalogFileInput("catalogFileInput", (loaded) => {
  catalog = loaded;
  catalogIndex = buildCatalogIndex(catalog.products);
  el("catalogDebug").value = JSON.stringify(catalog, null, 2);
  if (lastCookText) renderAllFromText(lastCookText);
});

(async () => {
  await initCatalog();

  const defaultPath = document.body.dataset.cook;
  if (defaultPath) {
    try {
      const res = await fetch(defaultPath, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        el("cookFilename").textContent = defaultPath;
        renderAllFromText(text);
      }
    } catch (err) {
      // mode file:// fallback -> user can import manually
    }
  }
})();
