const el = (id) => document.getElementById(id);

// --- Catalogue (produits) ---
let catalog = {
  products: [
    { id: "poulet", name: "Poulet", kcal100: 165, prot100: 31, fat100: 3.6, sugar100: 0 },
    { id: "riz_cuit", name: "Riz cuit", kcal100: 130, prot100: 2.7, fat100: 0.3, sugar100: 0.1 },
    { id: "huile", name: "Huile", kcal100: 884, prot100: 0, fat100: 100, sugar100: 0 }
  ]
};

// --- Recette (ingrédients choisis) ---
let recipe = {
  ingredients: [

  ]
};

// --- Poids final manuel (indépendant) ---
let manualFinalWeight = 0;         // g
let manualAutoSync = true;         // par défaut = poids ingrédients

function round1(x){ return Math.round(x*10)/10; }
function round0(x){ return Math.round(x); }

function getProduct(productId) {
  return catalog.products.find(p => p.id === productId);
}

function ingredientTotals() {
  let weight=0, kcal=0, prot=0, fat=0, sugar=0;

  for (const ing of recipe.ingredients) {
    const p = getProduct(ing.productId);
    if (!p) continue;

    const g = Number(ing.grams) || 0;
    weight += g;

    const f = g/100;
    kcal  += (Number(p.kcal100)||0) * f;
    prot  += (Number(p.prot100)||0) * f;
    fat   += (Number(p.fat100)||0) * f;
    sugar += (Number(p.sugar100)||0) * f;
  }

  const kcalPer100Ingredients = weight>0 ? (kcal/weight)*100 : 0;

  // IMPORTANT: kcal/100g manuel se base sur le poids final entré
  const mw = Number(manualFinalWeight) || 0;
  const kcalPer100Manual = mw>0 ? (kcal/mw)*100 : 0;

  // NOUVEAU: macros / 100g (ingrédients)
  const protPer100Ingredients  = weight>0 ? (prot/weight)*100 : 0;
  const fatPer100Ingredients   = weight>0 ? (fat/weight)*100 : 0;
  const sugarPer100Ingredients = weight>0 ? (sugar/weight)*100 : 0;

  // NOUVEAU: macros / 100g (manuel)
  const protPer100Manual  = mw>0 ? (prot/mw)*100 : 0;
  const fatPer100Manual   = mw>0 ? (fat/mw)*100 : 0;
  const sugarPer100Manual = mw>0 ? (sugar/mw)*100 : 0;

  return {
    weight, kcal, prot, fat, sugar,
    kcalPer100Ingredients, kcalPer100Manual,
    protPer100Ingredients, fatPer100Ingredients, sugarPer100Ingredients,
    protPer100Manual, fatPer100Manual, sugarPer100Manual
  };
}

function syncCatalogEditor(){
  el("catalogEditor").value = JSON.stringify(catalog, null, 2);
}

function renderProductSelect(){
  const sel = el("productSelect");
  const current = sel.value;

  sel.innerHTML = "";
  const sorted = [...catalog.products].sort((a,b)=>a.name.localeCompare(b.name, "fr"));

  for (const p of sorted) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  }
  if ([...sel.options].some(o=>o.value===current)) sel.value = current;
}

function renderIngredients(){
  const wrap = el("ingredients");
  wrap.innerHTML = "";

  recipe.ingredients.forEach((ing, idx) => {
    const p = getProduct(ing.productId);
    const name = p ? p.name : "(Produit manquant)";
    const info = p
      ? `${p.kcal100} kcal/100g · P ${p.prot100}g · L ${p.fat100}g · Sucres ${p.sugar100}g`
      : "";

    const card = document.createElement("div");
    card.className = "mb-3 p-3 bg-white border rounded-3";
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <div class="fw-semibold">${name}</div>
          <div class="text-muted small">${info}</div>
        </div>
        <div class="text-end">
          <div class="mono fw-semibold" id="gramsLabel-${idx}">${round0(ing.grams)} g</div>
          <button class="btn btn-sm btn-outline-danger mt-1" data-del="${idx}">Suppr</button>
        </div>
      </div>

      <div class="mt-2">
        <input type="range" min="0" max="${Number(ing.gramsMax)||1000}" step="1"
               value="${round0(ing.grams)}" data-idx="${idx}">
      </div>
    `;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll('input[type="range"][data-idx]').forEach(sl => {
    sl.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      recipe.ingredients[idx].grams = Number(e.target.value);
      el(`gramsLabel-${idx}`).textContent = `${round0(recipe.ingredients[idx].grams)} g`;
      onIngredientsChanged();
    });
  });

  wrap.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.del);
      recipe.ingredients.splice(idx, 1);
      onIngredientsChanged(true);
    });
  });
}

function onIngredientsChanged(fullRender=false){
  // si auto-sync activé, le poids manuel suit le poids ingrédients
  const t = ingredientTotals();
  if (manualAutoSync) {
    manualFinalWeight = round0(t.weight);
    el("manualFinalWeightSlider").value = manualFinalWeight;
  }
  if (fullRender) renderAll(); else renderResultsAndWeights();
}

function renderManualWeightUI(){
  el("manualAutoSync").checked = manualAutoSync;
  el("manualFinalWeightSlider").value = round0(manualFinalWeight);
  el("manualFinalWeightLabel").textContent = `${round0(manualFinalWeight)} g`;
}

function renderResultsAndWeights(){
  const t = ingredientTotals();

  el("kcalTotal").textContent = round0(t.kcal);
  el("kcalPer100Ingredients").textContent = round0(t.kcalPer100Ingredients);
  el("kcalPer100Manual").textContent = round0(t.kcalPer100Manual);

  // NOUVEAU: affichage macros / 100g
  el("protPer100Ingredients").textContent = round1(t.protPer100Ingredients);
  el("fatPer100Ingredients").textContent = round1(t.fatPer100Ingredients);
  el("sugarPer100Ingredients").textContent = round1(t.sugarPer100Ingredients);

  el("protPer100Manual").textContent = round1(t.protPer100Manual);
  el("fatPer100Manual").textContent = round1(t.fatPer100Manual);
  el("sugarPer100Manual").textContent = round1(t.sugarPer100Manual);

  el("ingredientsWeight").textContent = `${round0(t.weight)} g`;
  el("manualWeightOut").textContent = `${round0(manualFinalWeight)} g`;

  el("protTotal").textContent = `${round1(t.prot)} g`;
  el("fatTotal").textContent = `${round1(t.fat)} g`;
  el("sugarTotal").textContent = `${round1(t.sugar)} g`;

  el("manualFinalWeightLabel").textContent = `${round0(manualFinalWeight)} g`;
}

function slugifyId(name){
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function ensureUniqueId(base){
  let id = base || "produit";
  let i = 2;
  while (catalog.products.some(p => p.id === id)) {
    id = `${base}_${i++}`;
  }
  return id;
}

function downloadJson(filename, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Events ---
el("addIngredientBtn").addEventListener("click", () => {
  const productId = el("productSelect").value;
  if (!productId) return;

  const gramsMax = Math.max(1, Number(el("gramsMaxInput").value) || 1000);
  recipe.ingredients.push({ productId, grams: 0, gramsMax });
  renderAll();
});

el("createProductBtn").addEventListener("click", () => {
  const name = el("newName").value.trim();
  if (!name) { alert("Nom requis"); return; }

  const base = slugifyId(name);
  const id = ensureUniqueId(base);

  const p = {
    id,
    name,
    kcal100: Number(el("newKcal").value) || 0,
    prot100: Number(el("newProt").value) || 0,
    fat100: Number(el("newFat").value) || 0,
    sugar100: Number(el("newSugar").value) || 0
  };

  catalog.products.push(p);
  renderProductSelect();
  el("productSelect").value = id;
  syncCatalogEditor();

  el("newName").value = "";
  el("newKcal").value = 0;
  el("newProt").value = 0;
  el("newFat").value = 0;
  el("newSugar").value = 0;

  alert("Produit ajouté au catalogue (en mémoire). Pense à Exporter JSON si tu veux le sauvegarder.");
});

el("exportCatalogBtn").addEventListener("click", () => {
  downloadJson("macros.json", catalog);
});

attachCatalogFileInput("jsonFileInput", (loaded) => {
  catalog = loaded;

  // IMPORTANT: met à jour l'UI dans le bon ordre
  syncCatalogEditor();
  renderProductSelect();

  // Sélectionne le 1er produit pour vérifier visuellement
  const sel = el("productSelect");
  if (sel.options.length > 0) sel.selectedIndex = 0;

  alert(`Catalogue importé: ${loaded.products.length} produits`);
});

el("loadSampleBtn").addEventListener("click", () => {
  catalog = {
    products: [
      { id:"poulet", name:"Poulet", kcal100:165, prot100:31, fat100:3.6, sugar100:0 },
      { id:"riz_cuit", name:"Riz cuit", kcal100:130, prot100:2.7, fat100:0.3, sugar100:0.1 },
      { id:"huile", name:"Huile", kcal100:884, prot100:0, fat100:100, sugar100:0 }
    ]
  };
  renderAll();
});

el("resetBtn").addEventListener("click", () => {
  recipe = { ingredients: [] };
  // re-synchronise poids manuel par défaut
  manualAutoSync = true;
  el("manualAutoSync").checked = true;
  manualFinalWeight = 0;
  renderAll();
});

// Poids final manuel slider
el("manualFinalWeightSlider").addEventListener("input", (e) => {
  manualFinalWeight = Number(e.target.value) || 0;
  // si l'utilisateur bouge le slider, on coupe l'auto-sync
  if (manualAutoSync) {
    manualAutoSync = false;
    el("manualAutoSync").checked = false;
  }
  renderResultsAndWeights();
});

// Checkbox auto-sync
el("manualAutoSync").addEventListener("change", (e) => {
  manualAutoSync = !!e.target.checked;
  if (manualAutoSync) {
    // recolle immédiatement au poids ingrédients
    manualFinalWeight = round0(ingredientTotals().weight);
    el("manualFinalWeightSlider").value = manualFinalWeight;
  }
  renderResultsAndWeights();
});

function renderAll(){
  renderProductSelect();
  renderIngredients();

  // défaut: poids manuel = poids ingrédients si auto-sync
  const t = ingredientTotals();
  if (manualAutoSync) manualFinalWeight = round0(t.weight);

  renderManualWeightUI();
  renderResultsAndWeights();
  syncCatalogEditor();
}


// init
renderAll();
loadCatalogFromGithubIfExists().then((loaded) => {
  if (!loaded) return;
  catalog = loaded;
  renderAll();
  console.log(`✔ macros.json chargé depuis GitHub (${loaded.products.length} produits)`);
});
