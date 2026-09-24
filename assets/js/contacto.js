//--------------ARMADOR DEL MENSAJE---------------
// no manda nada: arma el texto, lo copia y abre messenger o instagram
(function () {
  'use strict';

  var form = document.getElementById('armador');
  if (!form) return;

  var burbuja   = document.getElementById('mensaje');
  var hora      = document.getElementById('mensaje-hora');
  var estado    = document.getElementById('estado');
  var copiar    = document.getElementById('copiar');
  var messenger = document.getElementById('abrir-messenger');
  var instagram = document.getElementById('abrir-instagram');
  var avisos    = Array.prototype.slice.call(form.querySelectorAll('[data-aviso-sede]'));
  var nombreIn  = form.querySelector('[name="nombre"]');
  var paraEl    = document.getElementById('chat-para');
  var viaEl     = document.getElementById('chat-via');
  var extraIn   = form.querySelector('[name="extra"]');

  var SEDES = {
    'mendoza':      'Me gustaría entrenar en la sede de Mendoza.',
    'salta':        'Me gustaría entrenar en la sede de Salta.',
    'buenos-aires': 'Me gustaría entrenar en la sede de Buenos Aires.',
    'no-se':        'Todavía no sé qué sede me queda más cerca.'
  };
  // en este orden van en la frase, "probar" al final
  var CONSULTAS = [
    ['horarios',  'los horarios'],
    ['direccion', 'la dirección'],
    ['costo',     'cuánto cuesta'],
    ['ropa',      'qué ropa tengo que llevar'],
    ['probar',    'si puedo probar una clase']
  ];
  var EXPERIENCIA = {
    'nunca': 'Nunca practiqué artes marciales.',
    'otra':  'Practiqué otro arte marcial.',
    'kenpo': 'Ya practiqué kenpo.'
  };

  function elegido(nombre) {
    var el = form.querySelector('[name="' + nombre + '"]:checked');
    return el ? el.value : '';
  }

  function enumerar(partes) {
    if (partes.length < 2) return partes.join('');
    return partes.slice(0, -1).join(', ') + ' y ' + partes[partes.length - 1];
  }

  // primera letra en mayuscula
  function nombreProlijo(t) {
    t = t.replace(/\s+/g, ' ').trim().slice(0, 40);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  }

  function armar() {
    var lineas = [];
    var nombre = nombreProlijo(nombreIn.value);
    lineas.push(nombre ? '¡Hola! Soy ' + nombre + '.' : '¡Hola!');

    var sede = elegido('sede');
    if (sede) lineas.push(SEDES[sede]);

    var marcadas = CONSULTAS.filter(function (c) {
      return form.querySelector('[name="consulta"][value="' + c[0] + '"]').checked;
    }).map(function (c) { return c[1]; });

    if (marcadas.length) {
      lineas.push('Quería consultar ' + enumerar(marcadas) + '.');
    } else if (!sede) {
      lineas.push('Quería consultar por las clases de kenpo.');
    }

    var exp = elegido('experiencia');
    if (exp) lineas.push(EXPERIENCIA[exp]);

    var extra = extraIn.value.trim();
    if (extra) lineas.push(extra);

    lineas.push('¡Gracias!');
    return lineas.join(' ');
  }

  function actualizar() {
    burbuja.textContent = armar();

    var sede = elegido('sede');

    // salta tiene su propia pagina y no tiene instagram
    var salta = sede === 'salta';
    messenger.href = salta ? messenger.getAttribute('data-salta') : messenger.getAttribute('data-general');
    messenger.querySelector('span').textContent = salta ? 'Abrir Messenger de Salta' : 'Abrir Messenger';
    instagram.hidden = salta;
    paraEl.textContent = salta ? 'Para: Seiren Kenpo Salta' : 'Para: Seiren Kenpo';
    viaEl.textContent  = salta ? 'Messenger' : 'Messenger · Instagram';

    avisos.forEach(function (a) { a.hidden = a.getAttribute('data-aviso-sede') !== sede; });

    estado.textContent = '';
    [messenger, instagram].forEach(function (b) { b.classList.remove('siguiente'); });
  }

  function mostrarCopiado(ok) {
    if (ok) {
      estado.textContent = 'Copiado. Ahora abrí el chat y pegalo.';
      [messenger, instagram].forEach(function (b) {
        if (b.hidden) return;
        b.classList.remove('siguiente');
        void b.offsetWidth;
        b.classList.add('siguiente');
      });
    } else {
      estado.textContent = 'No se pudo copiar solo: seleccioná el texto del mensaje y copialo.';
      var r = document.createRange();
      r.selectNodeContents(burbuja);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }
  }

  // por si no hay clipboard api
  function copiarViejo(texto) {
    var t = document.createElement('textarea');
    t.value = texto;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(t);
    return ok;
  }

  copiar.addEventListener('click', function () {
    var texto = armar();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(
        function () { mostrarCopiado(true); },
        function () { mostrarCopiado(copiarViejo(texto)); }
      );
    } else {
      mostrarCopiado(copiarViejo(texto));
    }
  });

  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  // hora de la burbuja
  var ahora = new Date();
  hora.textContent = 'Ahora · ' + ahora.getHours() + ':' + (ahora.getMinutes() < 10 ? '0' : '') + ahora.getMinutes();

  // si viene de sedes (contacto.html#sede-mendoza) ya viene elegida
  var pedida = location.hash.replace(/^#sede-/, '');
  if (pedida && pedida !== location.hash) {
    var radio = form.querySelector('[name="sede"][value="' + pedida.replace(/[^\w-]/g, '') + '"]');
    if (radio) radio.checked = true;
  }

  actualizar();
})();
