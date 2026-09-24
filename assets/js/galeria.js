//--------------GALERIA---------------
// filtros, visor y descripciones desde galeria.txt
// sin este archivo las fotos se abren igual en la misma pestaña
(function () {
  'use strict';

  var muro = document.querySelector('.muro');
  if (!muro) return;

  var obras   = Array.prototype.slice.call(muro.querySelectorAll('.obra'));
  var filtros = Array.prototype.slice.call(document.querySelectorAll('.filtro'));
  var aviso   = document.getElementById('galeria-aviso');
  var visor   = document.getElementById('visor');
  var raiz    = document.documentElement;
  var quieto  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CARPETA = 'assets/img/fotos/';
  var SIN_TEXTO = 'Fotografía de la galería de Seiren Kenpo';

  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function visibles() { return obras.filter(function (o) { return !o.hidden; }); }
  function textoDe(o) { return o.querySelector('.obra__txt').textContent; }

  //--------------MURO---------------
  // cada foto ocupa filas de 4px segun lo que mide, ResizeObserver lo recalcula
  // sin ResizeObserver queda en columnas, que tambien anda
  if ('ResizeObserver' in window) {
    var FILA = 4;
    var sep = function () {
      return parseFloat(getComputedStyle(muro).getPropertyValue('--sep')) || 40;
    };
    var medir = new ResizeObserver(function (entradas) {
      var s = sep();
      entradas.forEach(function (e) {
        var alto = e.target.getBoundingClientRect().height;
        if (alto) e.target.style.setProperty('--filas', Math.ceil((alto + s) / FILA));
      });
    });
    muro.classList.add('muro--grilla');
    obras.forEach(function (o) { medir.observe(o); });
  }

  //--------------FILTROS---------------
  function filtrar(cat, anunciar) {
    var existe = filtros.some(function (f) { return f.getAttribute('data-cat') === cat; });
    if (!existe) cat = 'todas';

    filtros.forEach(function (f) {
      f.setAttribute('aria-pressed', f.getAttribute('data-cat') === cat ? 'true' : 'false');
    });

    var n = 0;
    obras.forEach(function (o) {
      var ver = cat === 'todas' || o.getAttribute('data-cat') === cat;
      o.hidden = !ver;
      o.classList.remove('entra');
      if (ver) {
        // entran escalonadas, cada 6 vuelve a cero
        if (!quieto && anunciar) {
          o.style.setProperty('--e', n % 6);
          void o.offsetWidth;            // reinicia la animacion
          o.classList.add('entra');
        }
        n++;
      }
    });

    if (anunciar && aviso) {
      var nombre = cat === 'todas' ? 'todas las categorías'
        : filtros.filter(function (f) { return f.getAttribute('data-cat') === cat; })[0]
                 .querySelector('.filtro__nombre').textContent;
      aviso.textContent = n + (n === 1 ? ' foto' : ' fotos') + ' de ' + nombre + '.';
    }
    return cat;
  }

  filtros.forEach(function (f) {
    f.addEventListener('click', function () {
      var cat = filtrar(f.getAttribute('data-cat'), true);
      // la categoria queda en la url para poder compartirla
      if (window.history && history.replaceState) {
        history.replaceState(null, '', cat === 'todas'
          ? location.pathname + location.search
          : '#' + cat);
      }
    });
  });

  obras.forEach(function (o) {
    o.addEventListener('animationend', function () { o.classList.remove('entra'); });
  });

  //--------------VISOR---------------
  var puedeVisor = visor && typeof visor.showModal === 'function';
  var img, fuenteAvif, fuenteWebp, eNum, eTotal, eCat, eTxt, eAvance;
  var lista = [], actual = 0, empujado = false, origen = null;

  if (puedeVisor) {
    img        = visor.querySelector('.visor__imagen img');
    fuenteAvif = visor.querySelector('source[type="image/avif"]');
    fuenteWebp = visor.querySelector('source[type="image/webp"]');
    eNum       = visor.querySelector('.visor__actual');
    eTotal     = visor.querySelector('.visor__total');
    eCat       = visor.querySelector('.visor__cat');
    eTxt       = visor.querySelector('.visor__txt');
    eAvance    = visor.querySelector('.visor__avance span');
  }

  function pintarTextos() {
    var o = lista[actual];
    eNum.textContent   = dos(actual + 1);
    eTotal.textContent = '/ ' + dos(lista.length);
    eCat.textContent   = o.querySelector('.obra__cat').textContent;
    eTxt.textContent   = textoDe(o);
    eAvance.style.width = ((actual + 1) / lista.length * 100) + '%';
  }

  function mostrar(i, direccion) {
    lista = visibles();
    if (!lista.length) return;
    actual = (i + lista.length) % lista.length;
    var o = lista[actual];
    var n = o.getAttribute('data-foto');

    pintarTextos();

    if (window.history && history.replaceState) {
      history.replaceState(history.state, '', '#foto-' + n);
    }

    var cambiar = function () {
      fuenteAvif.srcset = CARPETA + n + '.avif';
      fuenteWebp.srcset = CARPETA + n + '.webp';
      img.width  = +o.getAttribute('data-w') || 0;
      img.height = +o.getAttribute('data-h') || 0;
      img.src    = CARPETA + n + '.jpg';
      img.alt    = '';               // el texto ya esta al lado, en el figcaption
    };

    if (quieto || !direccion) { cambiar(); visor.classList.remove('cambiando'); return; }

    // la que se va sale de costado
    visor.style.setProperty('--desde', (direccion * -28) + 'px');
    visor.classList.add('cambiando');
    setTimeout(function () {
      cambiar();
      visor.style.setProperty('--desde', (direccion * 28) + 'px');
      var listo = function () { visor.classList.remove('cambiando'); };
      if (img.complete) requestAnimationFrame(listo);
      else { img.onload = listo; img.onerror = listo; setTimeout(listo, 1200); }
    }, 180);
  }

  function abrir(o, desdeDireccion) {
    if (!puedeVisor) return false;
    lista = visibles();
    var i = lista.indexOf(o);
    if (i < 0) return false;
    origen = o.querySelector('.obra__enlace');

    raiz.classList.add('visor-abierto');
    visor.showModal();

    // suma un paso al historial asi el "atras" del celu cierra el visor
    if (!desdeDireccion && window.history && history.pushState) {
      history.pushState({ visor: true }, '', '#foto-' + o.getAttribute('data-foto'));
      empujado = true;
    }
    mostrar(i, 0);
    visor.querySelector('.visor__cerrar').focus();
    return true;
  }

  function cerrar(porHistorial) {
    if (!visor.open) return;
    visor.close();
    raiz.classList.remove('visor-abierto');
    if (empujado && !porHistorial) {
      empujado = false;
      history.back();                // el popstate ya no hace nada: el visor esta cerrado
    } else {
      empujado = false;
      if (window.history && history.replaceState) {
        var cat = filtros.filter(function (f) { return f.getAttribute('aria-pressed') === 'true'; })[0];
        var c = cat ? cat.getAttribute('data-cat') : 'todas';
        history.replaceState(null, '', c === 'todas' ? location.pathname + location.search : '#' + c);
      }
    }
    if (origen) origen.focus();
  }

  if (puedeVisor) {
    obras.forEach(function (o) {
      o.querySelector('.obra__enlace').addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;   // abrir en pestana nueva, si se pide
        if (abrir(o)) e.preventDefault();
      });
    });

    visor.querySelector('.visor__cerrar').addEventListener('click', function () { cerrar(); });
    visor.querySelector('.visor__prev').addEventListener('click', function () { mostrar(actual - 1, -1); });
    visor.querySelector('.visor__next').addEventListener('click', function () { mostrar(actual + 1, 1); });

    // escape lo cierra el dialog, aca solo se ordena el historial
    visor.addEventListener('cancel', function (e) { e.preventDefault(); cerrar(); });

    // tocar afuera cierra, pero no justo despues de deslizar (el clic al soltar lo cerraba)
    var recienDeslizado = false;
    visor.addEventListener('click', function (e) {
      if (recienDeslizado) { recienDeslizado = false; return; }
      if (e.target === visor || e.target.classList.contains('visor__imagen')) cerrar();
    });

    visor.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); mostrar(actual - 1, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(actual + 1, 1); }
      if (e.key === 'Home')       { e.preventDefault(); mostrar(0, -1); }
      if (e.key === 'End')        { e.preventDefault(); mostrar(lista.length - 1, 1); }
    });

    // swipe
    var x0 = null, y0 = null;
    var zona = visor.querySelector('.visor__imagen');
    zona.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; });
    zona.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      x0 = y0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        recienDeslizado = true;
        setTimeout(function () { recienDeslizado = false; }, 400);
        mostrar(actual + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }
    });

    window.addEventListener('popstate', function () { if (visor.open) cerrar(true); });
  }

  //--------------AL CARGAR (#mendoza, #foto-archi43)---------------
  // try porque un link mal escrito (#%E0) rompe decodeURIComponent y cortaba todo
  var hash = location.hash.replace(/^#/, '');
  try { hash = decodeURIComponent(hash); } catch (e) { hash = ''; }
  if (hash.indexOf('foto-') === 0) {
    filtrar('todas', false);
    var pedida = muro.querySelector('.obra[data-foto="' + hash.slice(5).replace(/[^\w-]/g, '') + '"]');
    if (pedida) abrir(pedida, true);
  } else if (hash) {
    filtrar(hash, false);
  }

  //--------------DESCRIPCIONES---------------
  // vuelve a leer galeria.txt, asi un cambio hecho en github se ve sin regenerar
  // siempre con textContent, nunca como html
  if (window.fetch) {
    fetch('galeria.txt', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) {
        t.split(/\r?\n/).forEach(function (linea) {
          linea = linea.trim();
          if (!linea || linea.charAt(0) === '#') return;
          var partes = linea.split('|');
          if (partes.length < 3) return;
          var n = partes[0].trim();
          if (!/^[\w-]+$/.test(n)) return;
          var texto = partes.slice(2).join('|').trim();
          var o = muro.querySelector('.obra[data-foto="' + n + '"]');
          if (!o) return;
          var el = o.querySelector('.obra__txt');
          if (el.textContent !== texto) {
            el.textContent = texto;
            o.querySelector('.obra__enlace img').alt = texto || SIN_TEXTO;
          }
        });
        if (puedeVisor && visor.open) pintarTextos();
      })
      .catch(function () { /* sin conexion: quedan los textos del html */ });
  }
})();
