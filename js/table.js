/* Калькулятор праздничного стола. Набор собирается из реальных позиций и цен меню;
   количество пирогов — от числа гостей (~175 г на гостя, округление вверх).
   Никаких полей имени и телефона: список уходит в WhatsApp готовым текстом. */
(function () {
  'use strict';
  const WA = 'https://wa.me/79247292094';

  // id: [название, подпись (вес), цена ₽, граммов в единице для расчёта]
  const CAT = {
    gubNikah: ['Губадия «на никах»', '2 кг', 970, 2000],
    gub: ['Губадия с кортом, изюмом и рисом', '700 г', 370, 700],
    belesh: ['Зур бэлеш с говядиной халяль', 'за шт.', 1100, 0],
    chakNikah: ['Чак-чак на никах с украшением', '1 кг', 900, 0],
    chak: ['Чак-чак праздничный', '1 кг', 900, 0],
    karavai: ['Каравай «Свадебный»', '1 кг', 800, 0],
    kystyby: ['Кыстыбый с картофельным пюре', '100 г', 55, 0],
    apple: ['Яблочный с кусочками яблока', '600 г', 300, 600],
    cherry: ['Вишнёвый', '500 г', 266, 500],
    pear: ['Грушевый', '500 г', 300, 500],
    lemon: ['Лимонник', '500 г', 265, 500],
    vatrushka: ['Королевская ватрушка', '600 г', 330, 600],
    pumpkin: ['Тыква, изюм и рис', '550 г', 200, 550],
    muzh: ['«Мужское счастье»', '600 г', 348, 600],
    meatRice: ['«Мясо с рисом»', '550 г', 345, 550],
    onion: ['Зелёный лук и яйцо', '500 г', 260, 500],
    kish: ['Киш с курицей и грибами', '550 г', 330, 550],
    fish: ['Рыбник с рисом', '550 г', 260, 550],
    rings: ['Колечки из бриоши', '135 г', 63, 0],
  };

  const up = Math.ceil;
  const pies = (g, share, w = 550) => Math.max(1, up((g * 175 * share) / w));
  const split = (n, ids) => ids.map((id, i) => [id, Math.max(i < n ? 1 : 0, Math.floor(n / ids.length) + (i < n % ids.length ? 1 : 0))]).filter(([, q]) => q > 0);

  const SETS = {
    nikah: (g) => [['gubNikah', up(g / 25)], ['belesh', up(g / 20)], ['chakNikah', up(g / 20)], ['karavai', 1], ...split(pies(g, .45), ['apple', 'cherry', 'vatrushka'])],
    wedding: (g) => [['gubNikah', up(g / 25)], ['belesh', up(g / 20)], ['chak', up(g / 20)], ['karavai', 1], ...split(pies(g, .45), ['apple', 'pear', 'vatrushka'])],
    ash: (g) => [['gub', up(g / 8)], ['belesh', up(g / 20)], ['kystyby', g], ...split(pies(g, .4), ['apple', 'pumpkin'])],
    birthday: (g) => [...split(pies(g, .5), ['cherry', 'vatrushka']), ...split(pies(g, .5), ['muzh', 'kish']), ['rings', up(g * .6)]],
    office: (g) => [...split(pies(g, .6), ['meatRice', 'onion', 'fish']), ...split(pies(g, .4), ['apple', 'lemon']), ['rings', g]],
    tea: (g) => [...split(pies(g, .85), ['cherry', 'lemon', 'pear']), ['rings', g]],
  };
  const OCC = { nikah: 'Никах', wedding: 'Свадьба', ash: 'Аш', birthday: 'День рождения', office: 'В офис', tea: 'К чаю' };

  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  function init(opts = {}) {
    const root = document.querySelector('.calc');
    if (!root) return;
    const list = root.querySelector('.calc__list');
    const range = document.getElementById('guests');
    const out = document.getElementById('guestsOut');
    const totalEl = document.getElementById('total');
    const barEl = document.getElementById('totalBar');
    const fill = root.querySelector('.goal__fill');
    const marks = [...root.querySelectorAll('.goal__mark')];
    const perk = root.querySelector('.calc__perk');
    const card = root.querySelector('.calc__card');
    const wa = [root.querySelector('.calc__wa'), document.querySelector('.calc-bar a')];
    const crumbs = window.Crumbs && root.querySelector('.crumbs--calc') ? window.Crumbs.make(root.querySelector('.crumbs--calc')) : null;

    let occ = 'nikah', guests = +range.value, lines = [], shown = 0, prevTotal = 0;
    const counter = { v: 0 };

    function build() { lines = SETS[occ](guests).map(([id, q]) => ({ id, q })); render(); }

    function render() {
      list.innerHTML = '';
      for (const l of lines) {
        const [name, unit, price] = CAT[l.id];
        const li = document.createElement('li');
        li.innerHTML = `<span class="calc__name">${name}<small>${unit} · ${fmt(price)} ₽</small></span>
          <span class="qty"><button type="button" data-a="-" aria-label="Меньше: ${name}">−</button><output>${l.q}</output><button type="button" data-a="+" aria-label="Больше: ${name}">+</button></span>
          <span class="calc__sum">${fmt(price * l.q)} ₽</span>
          <button type="button" class="calc__del" data-a="x" aria-label="Убрать: ${name}">×</button>`;
        li.dataset.line = l.id;
        list.appendChild(li);
      }
      totals();
    }

    function totals() {
      const total = lines.reduce((s, l) => s + CAT[l.id][2] * l.q, 0);
      const max = Math.max(6000, total * 1.08);
      fill.style.width = Math.min(100, (total / max) * 100) + '%';
      marks.forEach((m) => { m.style.left = (+m.dataset.goal / max) * 100 + '%'; m.classList.toggle('is-hit', total >= +m.dataset.goal); });
      perk.textContent = total >= 5000 ? 'Доставка бесплатно + тыквенный пирог в подарок' : total >= 3000 ? `Доставка бесплатно · до подарка ${fmt(5000 - total)} ₽` : `До бесплатной доставки ${fmt(3000 - total)} ₽`;
      // число «прокручивается»
      if (window.gsap && !opts.reduce) {
        gsap.to(counter, { v: total, duration: .7, ease: 'power3.out', overwrite: true, onUpdate: () => { totalEl.textContent = fmt(counter.v); barEl.textContent = fmt(counter.v); } });
      } else { totalEl.textContent = fmt(total); barEl.textContent = fmt(total); }
      // пересекли рубеж — вспышка и крошки
      for (const g of [3000, 5000]) {
        if (prevTotal < g && total >= g && shown) {
          card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
          if (crumbs) { const cr = card.getBoundingClientRect(); const m = marks.find((x) => +x.dataset.goal === g); const mr = m.getBoundingClientRect(); crumbs.size(); crumbs.burst(mr.left - cr.left + 40 + mr.width / 2, mr.top - cr.top + 30, 24); }
        }
      }
      prevTotal = total; shown = 1;
      const text = message(total);
      wa.forEach((a) => a && (a.href = `${WA}?text=${encodeURIComponent(text)}`));
    }

    function message(total) {
      const rows = lines.map((l) => { const [n, u, p] = CAT[l.id]; return `— ${n} (${u}) × ${l.q} = ${fmt(p * l.q)} ₽`; });
      return `Здравствуйте! Хочу заказать к празднику: ${OCC[occ].toLowerCase()}, гостей — ${guests}.\n${rows.join('\n')}\nОриентировочно: ${fmt(total)} ₽.\nПодскажите, пожалуйста, по наличию и времени.`;
    }

    list.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-a]');
      if (!b) return;
      const li = b.closest('li');
      const i = lines.findIndex((l) => l.id === li.dataset.line);
      if (i < 0) return;
      if (b.dataset.a === '+') lines[i].q++;
      if (b.dataset.a === '-') lines[i].q--;
      if (b.dataset.a === 'x' || lines[i].q <= 0) {
        lines.splice(i, 1);
        const next = li.nextElementSibling || li.previousElementSibling;
        li.remove();
        (next?.querySelector('[data-a="x"]') || root.querySelector('.calc__reset')).focus();
        return totals();
      }
      li.querySelector('output').textContent = lines[i].q;
      li.querySelector('.calc__sum').textContent = fmt(CAT[lines[i].id][2] * lines[i].q) + ' ₽';
      totals();
    });

    root.querySelectorAll('.chips button').forEach((b) => b.addEventListener('click', () => {
      root.querySelectorAll('.chips button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      occ = b.dataset.occ; build();
    }));
    root.querySelector('.chips').addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const bs = [...root.querySelectorAll('.chips button')];
      const i = bs.indexOf(document.activeElement);
      const n = bs[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length];
      n.focus(); n.click(); e.preventDefault();
    });
    const setP = () => { const p = ((guests - range.min) / (range.max - range.min)) * 100; range.parentElement.style.setProperty('--p', p + '%'); out.textContent = guests; };
    range.addEventListener('input', () => { guests = +range.value; setP(); build(); });
    root.querySelector('.calc__reset').addEventListener('click', build);
    setP(); build();

    // мобильная нижняя панель с итогом — пока секция в кадре
    const bar = document.querySelector('.calc-bar');
    if (bar) new IntersectionObserver(([e]) => bar.classList.toggle('is-on', e.isIntersecting), { rootMargin: '-30% 0px -30% 0px' }).observe(root);
  }
  window.Table = { init };
})();
