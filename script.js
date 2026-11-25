const IVA = 0.15;
const pantallas = ["inicio", "catalogo", "cotizador"];

let datos = { carrocerias: [], extras: [] };
let filtroActual = "Todos";
let cotizacion = cargarCotizacion();
let temporizadorAviso;

// Guardar y cargar en el navegador
function cargarCotizacion() {
  const guardado = localStorage.getItem("titan-cot");
  if (!guardado) {
    return { items: {}, extras: [] };
  }
  return JSON.parse(guardado);
}

function guardarCotizacion() {
  localStorage.setItem("titan-cot", JSON.stringify(cotizacion));
}

// Formato de dinero
function formatoDinero(valor) {
  return "$" + valor.toFixed(2);
}

// Cambiar entre Inicio, Catálogo y Cotizador
function mostrarPantalla() {
  let hash = location.hash.replace("#", "");
  if (!pantallas.includes(hash)) {
    hash = "inicio";
  }

  const secciones = document.querySelectorAll(".screen");
  for (const seccion of secciones) {
    seccion.classList.toggle("active", seccion.id === hash);
  }

  const enlaces = document.querySelectorAll("[data-nav]");
  for (const enlace of enlaces) {
    enlace.classList.toggle("current", enlace.dataset.nav === hash);
  }

  window.scrollTo(0, 0);
  if (hash === "inicio") {
    animarContadores();
  }
}

window.addEventListener("hashchange", mostrarPantalla);

// Aviso flotante
function mostrarAviso(mensaje) {
  const toast = document.querySelector("#toast");
  toast.textContent = mensaje;
  toast.classList.add("show");

  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(function () {
    toast.classList.remove("show");
  }, 2000);
}

// Botones de tipo y color del camión
const botonesTipo = document.querySelectorAll(".seg button");
for (const boton of botonesTipo) {
  boton.addEventListener("click", function () {
    for (const b of botonesTipo) {
      b.classList.remove("on");
    }
    boton.classList.add("on");
    document.querySelector("#truck").dataset.tipo = boton.dataset.tipo;
  });
}

const botonesColor = document.querySelectorAll(".swatches button");
for (const boton of botonesColor) {
  boton.addEventListener("click", function () {
    for (const b of botonesColor) {
      b.classList.remove("on");
    }
    boton.classList.add("on");
    const color = boton.style.getPropertyValue("--c");
    document.documentElement.style.setProperty("--body", color);
  });
}

// Contadores sencillos de inicio
function animarContadores() {
  const contadores = document.querySelectorAll("[data-count]");
  for (const el of contadores) {
    const meta = Number(el.dataset.count);
    let actual = 0;
    const paso = Math.max(1, Math.ceil(meta / 30));

    const intervalo = setInterval(function () {
      actual += paso;
      if (actual >= meta) {
        el.textContent = meta;
        clearInterval(intervalo);
      } else {
        el.textContent = actual;
      }
    }, 30);
  }
}

// Filtros y tarjetas del catálogo
function pintarFiltros() {
  const tipos = ["Todos"];
  for (const item of datos.carrocerias) {
    if (!tipos.includes(item.tipo)) {
      tipos.push(item.tipo);
    }
  }

  let html = "";
  for (const tipo of tipos) {
    const activa = tipo === filtroActual ? "on" : "";
    html += `<button class="${activa}" data-tipo="${tipo}">${tipo}</button>`;
  }
  document.querySelector("#filtros").innerHTML = html;
}

function pintarCatalogo() {
  const lista = datos.carrocerias.filter(function (c) {
    return filtroActual === "Todos" || c.tipo === filtroActual;
  });

  let html = "";
  for (const c of lista) {
    html += `
      <article class="card">
        <h3>${c.nombre}</h3>
        <p>${c.descripcion}</p>
        <ul>
          <li>${c.largo}</li>
          <li>${c.capacidad}</li>
          <li>${c.material}</li>
        </ul>
        <div class="precio">${formatoDinero(c.precio)}</div>
        <button class="btn" data-add="${c.id}">Agregar a cotización</button>
      </article>
    `;
  }
  document.querySelector("#grid").innerHTML = html;
}

document.querySelector("#filtros").addEventListener("click", function (e) {
  const boton = e.target.closest("button");
  if (!boton) return;
  filtroActual = boton.dataset.tipo;
  pintarFiltros();
  pintarCatalogo();
});

document.querySelector("#grid").addEventListener("click", function (e) {
  const boton = e.target.closest("[data-add]");
  if (!boton) return;

  const id = boton.dataset.add;
  cotizacion.items[id] = (cotizacion.items[id] || 0) + 1;
  guardarCotizacion();
  pintarCotizador();
  mostrarAviso("Agregado a la cotización");
});

// Cálculos y vista del cotizador
function calcularTotales() {
  let unidades = 0;
  let base = 0;

  for (const id in cotizacion.items) {
    const cantidad = cotizacion.items[id];
    const carroceria = datos.carrocerias.find(function (c) {
      return c.id === id;
    });
    if (carroceria && cantidad > 0) {
      unidades += cantidad;
      base += carroceria.precio * cantidad;
    }
  }

  let totalExtras = 0;
  for (const extraId of cotizacion.extras) {
    const extra = datos.extras.find(function (x) {
      return x.id === extraId;
    });
    if (extra) {
      totalExtras += extra.precio * unidades;
    }
  }

  const subtotal = base + totalExtras;
  const iva = subtotal * IVA;
  const total = subtotal + iva;

  return { unidades, subtotal, iva, total };
}

function pintarCotizador() {
  const ids = Object.keys(cotizacion.items).filter(function (id) {
    return cotizacion.items[id] > 0 && datos.carrocerias.some(function (c) {
      return c.id === id;
    });
  });

  if (ids.length === 0) {
    document.querySelector("#items").innerHTML =
      '<div class="vacio">Tu cotización está vacía. <a href="#catalogo">Elige una carrocería</a></div>';
  } else {
    let htmlItems = "";
    for (const id of ids) {
      const c = datos.carrocerias.find(function (x) {
        return x.id === id;
      });
      htmlItems += `
        <div class="item">
          <div>
            <strong>${c.nombre}</strong>
            <small>${formatoDinero(c.precio)} c/u</small>
          </div>
          <div class="qty">
            <button data-menos="${id}">-</button>
            <span>${cotizacion.items[id]}</span>
            <button data-mas="${id}">+</button>
          </div>
        </div>
      `;
    }
    document.querySelector("#items").innerHTML = htmlItems;
  }

  let htmlExtras = "";
  for (const x of datos.extras) {
    const marcado = cotizacion.extras.includes(x.id) ? "checked" : "";
    htmlExtras += `
      <label>
        <span><input type="checkbox" data-extra="${x.id}" ${marcado}>${x.nombre}</span>
        <span>+${formatoDinero(x.precio)} por unidad</span>
      </label>
    `;
  }
  document.querySelector("#extras").innerHTML = htmlExtras;

  const res = calcularTotales();
  document.querySelector("#subtotal").textContent = formatoDinero(res.subtotal);
  document.querySelector("#iva").textContent = formatoDinero(res.iva);
  document.querySelector("#total").textContent = formatoDinero(res.total);
  document.querySelector("#badge").textContent = res.unidades;
}

document.querySelector("#items").addEventListener("click", function (e) {
  const mas = e.target.dataset.mas;
  const menos = e.target.dataset.menos;

  if (mas) {
    cotizacion.items[mas] = (cotizacion.items[mas] || 0) + 1;
  }
  if (menos) {
    cotizacion.items[menos] -= 1;
    if (cotizacion.items[menos] <= 0) {
      delete cotizacion.items[menos];
    }
  }

  if (mas || menos) {
    guardarCotizacion();
    pintarCotizador();
  }
});

document.querySelector("#extras").addEventListener("change", function (e) {
  const id = e.target.dataset.extra;
  if (!id) return;

  if (e.target.checked) {
    if (!cotizacion.extras.includes(id)) {
      cotizacion.extras.push(id);
    }
  } else {
    cotizacion.extras = cotizacion.extras.filter(function (x) {
      return x !== id;
    });
  }

  guardarCotizacion();
  pintarCotizador();
});

document.querySelector("#vaciar").addEventListener("click", function () {
  cotizacion = { items: {}, extras: [] };
  guardarCotizacion();
  pintarCotizador();
  mostrarAviso("Cotización vaciada");
});

document.querySelector("#exportar").addEventListener("click", function () {
  const res = calcularTotales();
  if (res.unidades === 0) {
    mostrarAviso("Agrega al menos una carrocería");
    return;
  }

  const pedido = {
    fecha: new Date().toISOString(),
    items: cotizacion.items,
    accesorios: cotizacion.extras,
    subtotal: res.subtotal,
    iva: res.iva,
    total: res.total
  };

  const texto = JSON.stringify(pedido, null, 2);
  const blob = new Blob([texto], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "pedido-titan.json";
  enlace.click();

  URL.revokeObjectURL(url);
  mostrarAviso("Pedido exportado");
});

// Inicio de la aplicación
async function iniciar() {
  mostrarPantalla();

  try {
    const respuesta = await fetch("data/carrocerias.json");
    datos = await respuesta.json();
  } catch (error) {
    document.querySelector("#grid").innerHTML =
      '<div class="vacio">No se pudo cargar el catálogo. Usa Live Server para abrir el proyecto.</div>';
    return;
  }

  pintarFiltros();
  pintarCatalogo();
  pintarCotizador();
}

iniciar();