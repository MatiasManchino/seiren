//--------------SEIREN KENPO---------------
// sin dependencias, si no carga el sitio se ve igual
// todo arranca visible y nada se mueve solo (solo con el scroll)
(function () {
  'use strict';

  var raiz = document.documentElement;
  raiz.classList.add('js');

  var quieto = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  //--------------MENU MOBILE---------------
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
      if (window.innerWidth > 1088) pintarMenu(false);   // mismo corte que el css (68rem)
    }, { passive: true });
  }

  //--------------REVELADO---------------
  var aRevelar = document.querySelectorAll('.revela');

  // escalonado: los hijos de [data-escalonar] entran de a uno (--r en el css)
  // el numero del atributo es cada cuantos vuelve a cero
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

  //--------------ENTRADA PORTADA---------------
  var portada = document.querySelector('.portada');
  if (portada) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { portada.classList.add('entrada'); });
    });
  }

  //--------------SCROLL: cabecera, barra, deriva y cintas---------------
  // un solo listener y un rAF para todo
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
            // la inversa arranca corrida, asi se cruzan
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

    // deriva: mas lejos del centro, mas se mueve
    derivas.forEach(function (el) {
      var caja = el.getBoundingClientRect();
      var factor = parseFloat(el.getAttribute('data-deriva')) || 0.12;
      var desde  = (caja.top + caja.height / 2) - alto / 2;
      el.style.setProperty('--desliz', (-desde * factor).toFixed(1) + 'px');
      if (el.hasAttribute('data-giro')) {
        el.style.setProperty('--giro', (-desde * 0.012).toFixed(2) + 'deg');
      }
    });

    // cinta
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

  //--------------AÑO DEL PIE---------------
})();

// va aparte porque tiene que andar aunque reduced-motion corte antes
(function () {
  var anio = document.querySelector('[data-anio]');
  if (anio) anio.textContent = new Date().getFullYear();
})();
