/* =====================================================================
   SEIREN KENPO — comportamiento
   Sin dependencias. Todo lo que hace es opcional: si este archivo no
   carga, el sitio se lee y se navega igual.

   El movimiento sigue tres reglas:
     · Todo arranca visible. Lo que oculta es la clase .js, que pone
       este mismo script.
     · Nada se mueve solo: cada desplazamiento esta atado al scroll o a
       una entrada en pantalla. No hay animacion que haya que pausar.
     · Si el sistema pide menos movimiento, no se engancha nada.
   ===================================================================== */
(function () {
  'use strict';

  var raiz = document.documentElement;
  raiz.classList.add('js');

  var quieto = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Menu en movil ---------- */
  var boton = document.querySelector('.menu-boton');
  var nav   = document.getElementById('nav-principal');

  function pintarMenu(abierto) {
    if (!boton || !nav) return;
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    boton.setAttribute('aria-label', abierto ? 'Cerrar el menú' : 'Abrir el menú');
    nav.setAttribute('data-abierto', abierto ? 'true' : 'false');
  }

  if (boton && nav) {
    boton.addEventListener('click', function () {
      pintarMenu(boton.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) pintarMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') {
        pintarMenu(false);
        boton.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1088) pintarMenu(false);   // mismo corte que el CSS: 68rem
    }, { passive: true });
  }

  /* ---------- Revelado al entrar en pantalla ----------
     IntersectionObserver en vez de escuchar el scroll: el navegador
     avisa cuando corresponde y no hay que recalcular el layout en
     cada fotograma. */
  var aRevelar = document.querySelectorAll('.revela');

  // Escalonado: los hijos directos de un [data-escalonar] entran uno
  // detras del otro. El retardo lo lee el CSS de la variable --r.
  // El valor del atributo dice cada cuantos vuelve a cero, para que una
  // grilla larga no termine con un elemento esperando tres segundos:
  // asi cada fila arranca de nuevo y el barrido queda en diagonal.
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-escalonar]'),
    function (madre) {
      var vuelta = parseInt(madre.getAttribute('data-escalonar'), 10) || 6;
      Array.prototype.forEach.call(madre.children, function (hijo, i) {
        hijo.classList.add('revela');
        hijo.style.setProperty('--r', i % vuelta);
      });
    }
  );
  aRevelar = document.querySelectorAll('.revela');

  if (aRevelar.length) {
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('visible');
          obs.unobserve(e.target);   // una sola vez por elemento
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

      Array.prototype.forEach.call(aRevelar, function (el) { obs.observe(el); });
    } else {
      Array.prototype.forEach.call(aRevelar, function (el) { el.classList.add('visible'); });
    }
  }

  /* ---------- Entrada de la portada ----------
     Una sola vez, al cargar, para que la pagina no aparezca de golpe. */
  var portada = document.querySelector('.portada');
  if (portada) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { portada.classList.add('entrada'); });
    });
  }

  /* =================================================================
     Lo atado al scroll: cabecera, barra de avance, deriva y cintas.
     Un solo listener y un solo rAF para las cuatro cosas: escuchar el
     scroll cuatro veces por separado es lo que hace saltar el scroll.
     ================================================================= */
  if (quieto) return;

  var cabecera = document.querySelector('.cabecera');
  var avance   = document.querySelector('.cabecera__avance');
  var derivas  = Array.prototype.slice.call(document.querySelectorAll('.deriva'));
  var cintas   = Array.prototype.slice.call(document.querySelectorAll('.cinta'));

  if (!cabecera && !avance && !derivas.length && !cintas.length) return;

  var pendiente = false;
  var alto = window.innerHeight;

  function medir() {
    alto = window.innerHeight;
    cintas.forEach(function (c) {
      c._pistas = Array.prototype.map.call(
        c.querySelectorAll('.cinta__pista'),
        function (pista) {
          return {
            el: pista,
            sobra: Math.max(0, pista.scrollWidth - c.clientWidth),
            // Una pista marcada como inversa arranca corrida y vuelve a cero,
            // asi las dos se cruzan en sentidos opuestos.
            inversa: pista.getAttribute('data-sentido') === 'inverso'
          };
        }
      );
    });
  }

  function pintar() {
    pendiente = false;
    var y = window.scrollY || window.pageYOffset || 0;

    if (cabecera) cabecera.classList.toggle('cabecera--compacta', y > 80);

    if (avance) {
      var recorrido = document.documentElement.scrollHeight - alto;
      avance.style.setProperty('--avance', recorrido > 0 ? Math.min(1, y / recorrido) : 0);
    }

    // Deriva: cuanto mas lejos del centro de la pantalla, mas se corre.
    derivas.forEach(function (el) {
      var caja = el.getBoundingClientRect();
      var factor = parseFloat(el.getAttribute('data-deriva')) || 0.12;
      var desde  = (caja.top + caja.height / 2) - alto / 2;
      el.style.setProperty('--desliz', (-desde * factor).toFixed(1) + 'px');
      if (el.hasAttribute('data-giro')) {
        el.style.setProperty('--giro', (-desde * 0.012).toFixed(2) + 'deg');
      }
    });

    // Cinta: se corre en horizontal mientras cruza la pantalla.
    cintas.forEach(function (c) {
      if (!c._pistas || !c._pistas.length) return;
      var caja = c.getBoundingClientRect();
      var paso = 1 - (caja.top + caja.height) / (alto + caja.height);  // 0 abajo, 1 arriba
      paso = Math.max(0, Math.min(1, paso));
      c._pistas.forEach(function (p) {
        if (!p.sobra) return;
        var avance = p.inversa ? (1 - paso) : paso;
        p.el.style.setProperty('--corrimiento', (-p.sobra * avance).toFixed(1) + 'px');
      });
    });
  }

  function alScrollear() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(pintar);
  }

  medir();
  pintar();
  window.addEventListener('scroll', alScrollear, { passive: true });
  window.addEventListener('resize', function () { medir(); alScrollear(); }, { passive: true });
  window.addEventListener('load', function () { medir(); pintar(); });

  /* ---------- Año del pie ---------- */
})();

/* El año del pie va aparte: tiene que correr aunque el bloque de
   movimiento haya cortado temprano por prefers-reduced-motion. */
(function () {
  var anio = document.querySelector('[data-anio]');
  if (anio) anio.textContent = new Date().getFullYear();
})();
