function normalizeCatalog(parsed) {
  let products = null;
  if (Array.isArray(parsed)) products = parsed;
  else if (parsed && Array.isArray(parsed.products)) products = parsed.products;

  if (!products) throw new Error("Format JSON invalide");

  validateProducts(products);
  return { products };
}

function validateProducts(products) {
  for (const p of products) {
    for (const k of ["id", "name", "kcal100", "prot100", "fat100", "sugar100"]) {
      if (!(k in p)) throw new Error(`Champ manquant: ${k}`);
    }
  }
}

async function loadCatalogFromGithubIfExists() {
  try {
    const res = await fetch("macros.json", { cache: "no-store" });
    if (!res.ok) throw new Error("macros.json absent");

    const parsed = await res.json();
    return normalizeCatalog(parsed);
  } catch (err) {
    console.log("ℹ macros.json non chargé automatiquement :", err.message);
    return null;
  }
}

function attachCatalogFileInput(inputId, onCatalogLoaded) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const catalog = normalizeCatalog(parsed);
      onCatalogLoaded(catalog);
    } catch (err) {
      alert("Import JSON invalide: " + err.message);
    } finally {
      e.target.value = "";
    }
  });
}
