(() => {
  const S = window.STUDIO;
  /* Неразрывные пробелы после коротких слов и перед тире (как на сайте Тимина).
     Пробел после слова — только обычный: уже склеенное не съедается заново, поэтому повтор до неподвижности
     склеивает и второе из двух коротких слов подряд («и в срок» висело на 390 до 09.10). */
  const NB = /(^|[\s(«])(в|во|и|с|со|к|ко|о|об|у|а|на|по|за|до|от|из|не|но|для|без|при|про|под|над|что|как|или)[ \t\n]/gi;
  const typo = t => { for (let p; p !== t;) { p = t; t = t.replace(NB, "$1$2 "); } return t.replace(/\s—/g, " —").replace(/(\d)\s(?=[а-яё₽%])/gi, "$1 "); };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rub = n => n.toLocaleString("ru-RU").replace(/\s/g, " ") + " ₽";
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pic = (name, alt, extra = "") =>
    `<picture><source srcset="img/${name}.webp" type="image/webp"><img src="img/${name}.jpg" alt="${esc(alt)}" loading="lazy" ${extra}></picture>`;
  /* «от» тише цифры: глаз сразу ловит сумму */
  const priceText = s => (s.exact ? "" : "<small>от</small> ") + rub(s.price);
  const icon = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  /* Tabler: chevron-down, brand-whatsapp, brand-telegram, message (для Max своего значка в Tabler нет) */
  const I = {
    down: "M6 9l6 6l6 -6",
    wa: "M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1",
    tg: "M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4",
    max: "M8 9h8M8 13h6M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z",
  };

  /* Простые поля — всё из карточки студии */
  $$("[data-bind]").forEach(el => { el.textContent = S[el.dataset.bind] || ""; });
  $$("[data-phone]").forEach(a => { a.href = S.phoneHref; a.textContent = S.phone; });
  $$("[data-phone-icon]").forEach(a => { a.href = S.phoneHref; });
  $$("[data-map]").forEach(a => { a.href = S.mapUrl; });
  $$("[data-rating-link]").forEach(a => { a.href = S.rating.url; a.innerHTML = `<b>${S.rating.value}</b><span>${S.rating.count} в&nbsp;${S.rating.source}</span>`; });
  $$("[data-where]").forEach(el => { el.innerHTML = [S.address, S.hours].map(t => `<span>${esc(t)}</span>`).join(""); });

  /* Сообщение в мессенджер: услуга, машина и день — что человек указал; цену и время спрашиваем, а не обещаем */
  const message = (what, car, when) => [
    what ? `Здравствуйте! Хочу записаться на ${what}.` : "Здравствуйте! Хочу записаться, нужна консультация.",
    car ? `Машина: ${car}.` : "",
    when ? `Удобно ${when}.` : "",
    "Подскажите цену и свободное время?",
  ].filter(Boolean).join("\n");
  const DAYS = ["сегодня", "завтра", "на неделе"];
  const state = { car: "", when: "" };   // марка и день общие: открыл другую услугу — уже заполнено

  /* Прайс — плитки: фото работы, название, цена. Нажал — окно записи поверх страницы, сама страница не двигается */
  /* Фото плиток — кадры 4:3 по полю pos, 600×450 (assets/tiles.py): полноразмерные грузили первый экран 4,8 с. Второй ряд — по мере прокрутки */
  const services = S.groups.flatMap(g => g.items);
  const byId = Object.fromEntries(services.map(s => [s.id, s]));
  const group = id => S.groups.find(g => g.id === id);
  const fromPrice = items => ({ price: Math.min(...items.map(i => i.price)) });
  const line = (id, s) => `<span class="tile__name">${esc(s.name)}</span><span class="tile__price">${priceText(s)}</span>`;
  $("[data-tiles]").innerHTML = S.tiles.map((t, n) => {
    if (t.list) return `<li class="tile-list">${t.list.map(id =>
      `<button type="button" class="tile__line" data-open="${id}">${line(id, byId[id])}</button>`).join("")}</li>`;
    const s = t.svc ? byId[t.svc] : { name: t.name, ...fromPrice(group(t.group).items) };
    return `<li><button type="button" class="tile" data-open="${t.svc || t.group}">
      <picture class="tile__img"><source srcset="img/t-${t.img}.webp" type="image/webp"><img src="img/t-${t.img}.jpg" alt="" width="600" height="450"${n < 2 ? ' fetchpriority="high"' : n > 3 ? ' loading="lazy"' : ""}></picture>
      <span class="tile__text"><span class="tile__name">${esc(s.name)}</span>${t.sub ? `<span class="tile__sub">${esc(t.sub)}</span>` : ""}<span class="tile__price">${priceText(s)}</span></span>
    </button></li>`;
  }).join("");

  /* Окно записи */
  const sheet = $("[data-sheet]");
  const car = $("input[name=car]", sheet);
  const opts = $("[data-sheet-opts]", sheet);
  const html = document.documentElement;
  $("[data-days]", sheet).innerHTML = DAYS.map(d => `<button type="button" class="chip" data-day="${d}" aria-pressed="false">${d[0].toUpperCase() + d.slice(1)}</button>`).join("");
  $("[data-go=wa]", sheet).innerHTML = `${icon(I.wa)}WhatsApp`;
  $("[data-go=tg]", sheet).innerHTML = `${icon(I.tg)}Telegram`;
  $("[data-go=max]", sheet).innerHTML = `${icon(I.max)}Max`;
  let cur = null, opener = null, closing = 0;
  const what = () => {
    if (cur.kind === "other") return "";
    if (cur.kind === "group") return cur.opt ? byId[cur.opt].acc : `${cur.acc}, посоветуйте, какое лучше`;
    return cur.svc.acc;
  };
  const sync = () => {   // собрать сообщение и ссылки из того, что выбрано
    $$(".chip[data-day]", sheet).forEach(c => c.setAttribute("aria-pressed", c.dataset.day === state.when));
    $$(".chip[data-opt]", sheet).forEach(c => c.setAttribute("aria-pressed", c.dataset.opt === cur.opt));
    if (cur.kind === "group") {   // выбрал керамику — вверху её цена, а не самая низкая из трёх
      const o = cur.opt && byId[cur.opt];
      $("[data-sheet-price]", sheet).innerHTML = priceText(o || fromPrice(cur.items));
      $("[data-sheet-from]", sheet).hidden = o ? !!o.exact : false;
    }
    const text = message(what(), state.car.trim(), state.when);
    $("[data-go=wa]", sheet).href = `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(text)}`;
    $("[data-go=tg]", sheet).href = S.telegram;
    $("[data-go=max]", sheet).href = S.max;
    sheet.dataset.text = text;
  };
  const setText = (sel, t) => { const el = $(sel, sheet); el.innerHTML = t; el.hidden = !t; };
  const openSheet = (key, from) => {
    clearTimeout(closing);
    const g = group(key);
    if (key === "other") cur = { kind: "other", name: "Несколько услуг или другое", hint: "Опишите задачу в сообщении" };
    else if (g) { const t = S.tiles.find(x => x.group === key); cur = { kind: "group", name: t.name, acc: t.acc, hint: g.hint, items: g.items, price: priceText(fromPrice(g.items)), opt: "" }; }
    else { const s = byId[key]; cur = { kind: "svc", svc: s, name: s.name, hint: s.hint, price: priceText(s) }; }
    setText("[data-sheet-title]", esc(typo(cur.name)));
    setText("[data-sheet-price]", cur.price || "");
    $("[data-sheet-from]", sheet).hidden = !cur.price || !!cur.svc?.exact;
    setText("[data-sheet-hint]", cur.hint ? esc(typo(cur.hint)) : "");
    opts.innerHTML = cur.items ? cur.items.map(i => `<button type="button" class="chip chip--opt" data-opt="${i.id}" aria-pressed="false"><span>${esc(i.name)}</span><span>${priceText(i)}</span></button>`).join("") : "";
    $("[data-sheet-optbox]", sheet).hidden = !cur.items;
    car.value = state.car;
    sheet.classList.remove("is-copied", "is-copyfail");
    sync();
    opener = from;
    if (!sheet.open) { sheet.showModal(); html.classList.add("is-sheet"); }
    $(".sheet__in", sheet).focus({ preventScroll: true });
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add("is-in")));
  };
  const closeSheet = () => {
    if (!sheet.open || !sheet.classList.contains("is-in")) return;
    sheet.classList.remove("is-in");
    closing = setTimeout(() => {
      sheet.close(); html.classList.remove("is-sheet");
      opener?.focus({ preventScroll: true });
    }, reduce.matches ? 0 : 400);
  };
  $$("[data-open]").forEach(b => b.addEventListener("click", () => openSheet(b.dataset.open, b)));
  $("[data-sheet-close]", sheet).addEventListener("click", closeSheet);
  sheet.addEventListener("cancel", e => { e.preventDefault(); closeSheet(); });   // Esc — с тем же плавным закрытием
  sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });   // нажал мимо окна
  car.addEventListener("input", () => { state.car = car.value; sync(); });
  sheet.addEventListener("click", e => {
    const d = e.target.closest(".chip[data-day]"), o = e.target.closest(".chip[data-opt]");
    if (d) { state.when = state.when === d.dataset.day ? "" : d.dataset.day; sync(); }
    if (o) { cur.opt = cur.opt === o.dataset.opt ? "" : o.dataset.opt; sync(); }
  });
  /* Telegram и Max не умеют подставлять текст по ссылке: копируем его и открываем чат студии */
  $$("[data-go=tg], [data-go=max]", sheet).forEach(a => a.addEventListener("click", () => {
    const fail = () => { sheet.classList.remove("is-copied"); sheet.classList.add("is-copyfail"); };
    if (!navigator.clipboard) return fail();
    navigator.clipboard.writeText(sheet.dataset.text).then(() => { sheet.classList.remove("is-copyfail"); sheet.classList.add("is-copied"); }, fail);
  }));

  /* Отзывы дословно; источник один раз — у рейтинга над лентой */
  $("[data-reviews]").innerHTML = S.reviews.map(r => `
    <figure class="review">
      <blockquote>${esc(r.text)}</blockquote>
      <figcaption><b>${esc(r.name)}</b><span>${esc(r.date)}</span></figcaption>
    </figure>`).join("");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const track = $("[data-reviews]");
  const step = () => (track.firstElementChild?.getBoundingClientRect().width || 400) + 24;
  const glide = () => (reduce.matches ? "auto" : "smooth");
  $("[data-rv-prev]").addEventListener("click", () => track.scrollBy({ left: -step(), behavior: glide() }));
  $("[data-rv-next]").addEventListener("click", () => track.scrollBy({ left: step(), behavior: glide() }));
  const rvEdge = () => {
    $("[data-rv-prev]").disabled = track.scrollLeft < 4;
    $("[data-rv-next]").disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4;
  };
  track.addEventListener("scroll", rvEdge, { passive: true }); addEventListener("resize", rvEdge); rvEdge();

  /* До / после: пары рядом (на телефоне одна под другой), у каждой своя линия; линия стоит там, где видна разница */
  const webp = document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp");
  const src = (n, k) => `img/ba-${n}-${k}.${webp ? "webp" : "jpg"}`;
  $("[data-ba-list]").innerHTML = S.beforeAfter.map(w => `
    <figure class="ba" data-ba style="--pos: ${w.pos || 50}%; --p: ${w.pos || 50}">
      <div class="ba__frame">
        <img class="ba__after" src="${src(w.img, "after")}" alt="${esc(w.title)}, после" loading="lazy">
        <div class="ba__before"><img src="${src(w.img, "before")}" alt="${esc(w.title)}, до" loading="lazy"></div>
        <input class="ba__range" type="range" min="0" max="100" value="${w.pos || 50}" aria-label="${esc(w.title)}: сравнить до и после">
        <span class="ba__handle" aria-hidden="true"></span>
      </div>
      <div class="ba__caps" aria-hidden="true"><span>До</span><span>После</span></div>
      <figcaption class="ba__cap"><b>${esc(w.title)}</b><span>${esc(w.note)}</span></figcaption>
    </figure>`).join("");
  $$("[data-ba]").forEach(ba => {
    const r = $(".ba__range", ba);
    r.addEventListener("input", () => { ba.style.setProperty("--pos", r.value + "%"); ba.style.setProperty("--p", r.value); });
  });

  /* Типографика по всем текстам страницы */
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n =>
    n.parentElement.closest("script, style, svg") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  for (let n; (n = tw.nextNode());) { const v = typo(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }

  /* Шапка всегда с фоном; линия снизу появляется, когда страница уехала под шапку */
  const top = $(".top");
  new IntersectionObserver(([e]) => top.classList.toggle("is-solid", !e.isIntersecting)).observe($("[data-top-sentinel]"));   // метка в 8 px от верха: ушла — страница уехала
  /* Пока плитки на экране, «Записаться» в нижней панели телефона гаснет: запись уже перед глазами */
  new IntersectionObserver(([e]) => document.body.classList.toggle("is-booking", e.isIntersecting), { rootMargin: "-10% 0px -25% 0px" }).observe($("[data-tiles]"));
})();
