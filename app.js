(function(){
  const $ = id => document.getElementById(id);
  const val = name => { const el = document.querySelector('input[name="'+name+'"]:checked'); return el ? el.value : null; };
  const fmt = n => n.toLocaleString('de-DE');
  const r5 = x => Math.round(x/5)*5;
  const src = r => r[1] === 0 ? 'keine' : r[1] <= 60 ? 'Single Source' : r[0] >= 90 ? 'Dual Source' : 'Single/Dual';

  // Ausdauer: Morton et al. 2026, Abb. 5 – [min,max] g/h; Spalten: <1h, 1–2h, 2–3h, 3–6h, >6h
  const END = {
    cols: ['< 1 h','1–2 h','2–3 h','3–6 h','> 6 h'],
    col: D => D < 1 ? 0 : D < 2 ? 1 : D < 3 ? 2 : D <= 6 ? 3 : 4,
    rows: [
      {key:'5', name:'Z5', sub:'VO₂max / HIT', cls:'s', r:[[30,60],[75,90],[90,120],[90,120],[90,120]]},
      {key:'4', name:'Z4', sub:'Schwelle',     cls:'h', r:[[0,30],[75,90],[90,120],[90,120],[90,120]]},
      {key:'3', name:'Z3', sub:'Tempo',        cls:'h', r:[[0,30],[60,90],[90,120],[90,120],[90,120]]},
      {key:'2', name:'Z2', sub:'Grundlage',    cls:'m', r:[[0,0],[30,60],[60,90],[60,90],[60,90]]},
      {key:'1', name:'Z1', sub:'Regeneration', cls:'m', r:[[0,0],[0,30],[30,60],[30,60],[60,90]]}
    ],
    title: 'Modell: Intensität × Dauer',
    hint: 'Bereiche in g/h nach Morton et al. 2026, Abb. 5. Markiert ist deine Einheit.'
  };
  // Sprint: abgeleitet (siehe README) – Spalten: <1h, 1–2h, >2h
  const SPRINT = {
    cols: ['< 1 h','1–2 h','> 2 h'],
    col: D => D < 1 ? 0 : D <= 2 ? 1 : 2,
    rows: [
      {key:'rep', name:'Wiederholte Sprints', sub:'kurze Pausen, Intervalle', cls:'s', r:[[0,30],[30,60],[60,90]]},
      {key:'max', name:'Maximalsprints', sub:'lange Pausen, Technik', cls:'h', r:[[0,0],[0,0],[0,30]]}
    ],
    title: 'Sprint: Belastungsform × Dauer',
    hint: 'Abgeleitet aus Studien zu Sprint- und intermittierender Belastung; nicht Teil des Modells von Morton et al.'
  };
  // Kraft: abgeleitet aus King et al. 2022 – Spalten: <45 min, 45–90 min, >90 min
  const KRAFT = {
    cols: ['< 45 min','45–90 min','> 90 min'],
    col: D => D < 0.75 ? 0 : D <= 1.5 ? 1 : 2,
    rows: [
      {key:'high', name:'Hohes Volumen', sub:'oder nüchtern (≥ 8 h)', cls:'h', r:[[0,20],[20,40],[30,60]]},
      {key:'norm', name:'Normales Volumen', sub:'Mahlzeit 1–4 h vorher', cls:'m', r:[[0,0],[0,30],[20,40]]}
    ],
    title: 'Krafttraining: Umfang × Dauer',
    hint: 'Abgeleitet aus der Meta-Analyse von King et al. 2022; nicht Teil des Modells von Morton et al.'
  };

  function compute(){
    const sport = val('sport'), goal = val('goal'), env = val('env');
    const D = Math.max(0, (+$('dh').value||0) + (+$('dm').value||0)/60);
    const gut = +$('gut').value, mass = +$('mass').value||70, sex = $('sex').value;

    const isKraft = sport === 'kraft', isSprint = sport === 'sprint', isEnd = !isKraft && !isSprint;
    $('zoneField').hidden = !isEnd;
    $('sprintField').hidden = !isSprint;
    $('kraftField').hidden = !isKraft;

    let model, rowKey;
    if (isKraft) { model = KRAFT; rowKey = (val('vol') === 'high' || $('fasted').checked) ? 'high' : 'norm'; }
    else if (isSprint) { model = SPRINT; rowKey = val('sform'); }
    else { model = END; rowKey = val('zone'); }
    const row = model.rows.find(r => r.key === rowKey);
    const c = model.col(D), base = row.r[c];
    let lo = base[0], hi = base[1];
    const notes = [], pills = [];

    let p = 0.5;
    if (goal === 'race') p += 0.3;
    if (mass < 70) p -= 0.15; else if (mass >= 80) p += 0.1;
    if (sport === 'run') p -= 0.1;
    if (env === 'heat') p -= 0.1;
    p = Math.min(1, Math.max(0, p));
    let target = r5(lo + p*(hi-lo));

    const Z = isEnd ? +rowKey : 0;
    if (goal === 'low') {
      if (isEnd && Z <= 2 || isKraft) { target = lo; notes.push('Train-low: Bei niedriger Belastung darf die Zufuhr bewusst gering bleiben, um die Trainingsanpassung zu fördern (KH-Periodisierung). Für harte Einheiten gilt „Fuel for the work required“.'); }
      else notes.push('Train-low passt nicht zu dieser Einheit: Bei hoher Intensität wird für die Qualität der Einheit normal versorgt.');
    }

    let capped = false;
    if (hi > gut) { hi = gut; capped = true; }
    if (lo > gut) lo = gut;
    if (target > gut) { target = gut; capped = true; }

    let g = target, f = 0, srcTxt;
    if (target === 0) srcTxt = 'Keine KH nötig';
    else if (target <= 60) srcTxt = (isEnd && Z >= 4 && D < 2.5) || isSprint || isKraft ? 'Glukose / Maltodextrin' : 'Glukose / Maltodextrin (Mischung möglich)';
    else { g = Math.round(target/1.8); f = target - g; srcTxt = 'Glukose + Fruktose'; }

    $('target').innerHTML = fmt(target)+'<small>g/h</small>';
    $('range').innerHTML = 'Bereich laut Modell: <strong>'+(base[1]===0?'0':base[0]+'–'+base[1])+' g/h</strong><br>'+src(base)+(capped ? ' · gedeckelt auf '+gut+' g/h' : '');
    pills.push(['', row.name+' · '+model.cols[c]]);
    pills.push([target > 90 ? 'warn' : '', srcTxt]);
    if (capped) pills.push(['warn','Darm-Toleranz limitiert']);
    $('pills').innerHTML = pills.map(x => '<span class="pill '+x[0]+'">'+x[1]+'</span>').join('');

    $('total').textContent = fmt(Math.round(target*D))+' g';
    $('glu').textContent = target ? g+' g/h' : '–';
    $('fru').textContent = f ? f+' g/h' : '–';

    // Hinweise
    if (isEnd && target > 0) notes.push('Früh beginnen (ab ~15 min) und gleichmäßig über die Einheit verteilen: Die exogene Oxidation erreicht ihr Plateau erst nach ~2 h.');
    if (target > 60) notes.push('Über 60 g/h nur mit Glukose-Fruktose-Mischung (SGLT1 + GLUT5). Ein Fruktose-zu-Glukose-Verhältnis von 0,6–1,0 (z. B. 1 : 0,8) ergab die höchste Oxidation.');
    if (isEnd && target > 0 && target <= 60 && Z >= 4 && D < 2.5) notes.push('Kurz und intensiv: Glukose/Maltodextrin bevorzugen. Im Halbmarathon senkte eine Glukose-Fruktose-Mischung bei 60 g/h die KH-Oxidation.');
    if (capped) notes.push('Das Modell erlaubt bis '+base[1]+' g/h. Mit progressivem Gut-Training (wiederholt höhere Mengen im Training, hohe KH-Kost vor Wettkämpfen) steigt die Verträglichkeit.');
    if (target > 90) notes.push('90–120 g/h steigert exogene und Gesamt-KH-Oxidation bei Trainierten; die Leistungswirkung oberhalb 90 g/h ist noch nicht abschließend belegt.');
    if (isEnd && target > 0) notes.push('Gemischtes Format (Getränk, Gel, Chews) oxidiert so gut wie Getränke allein. Riegel nicht als einzige Quelle nutzen.');
    if (sport === 'run') notes.push('Laufen: höheres GI-Risiko. Bei Elite-Marathonis verbesserten 120 g/h die Laufökonomie um ~3 % gegenüber 60 g/h, aber mit stärkeren Magensymptomen.');
    if (sport === 'tri') notes.push('Triathlon: Kein Essen beim Schwimmen, daher früh auf dem Rad starten und dort den Großteil aufnehmen. Bei GI-Problemen spät auf dem Rad / früh im Lauf leicht reduzieren.');
    if (sport === 'bike') notes.push('Rad: Zufuhr nach Profil und Härte der Einheit periodisieren; für späte Attacken die KH-Verfügbarkeit bis zum Schluss hochhalten.');
    if (sport === 'ultra') notes.push('Ultra: Geschmacksermüdung einplanen (salzige Optionen, kalte Getränke in Hitze). Finisher nahmen im Mittel mehr KH auf als Aussteiger.');
    if (sport === 'team') notes.push('Teamsport: Halbzeit und Unterbrechungen nutzen; Getränke und Gels sind am praktikabelsten.');
    if (isSprint) {
      if (rowKey === 'max') notes.push('Einzelne Maximalsprints mit langen Pausen werden nicht durch Kohlenhydratmangel begrenzt. Entscheidend ist eine KH-reiche Mahlzeit 2–4 h vorher. Eine KH-Mundspülung verbesserte Sprintleistung in einer Meta-Analyse nicht.');
      else notes.push('Wiederholte Sprints mit kurzen Pausen leeren die Glykogenspeicher der schnellen Muskelfasern. Ab ~60 min wie intermittierenden Teamsport versorgen, am besten als Getränk.');
    }
    if (isKraft) {
      notes.push('Krafttraining: KH steigerten in einer Meta-Analyse (21 Studien) vor allem das Trainingsvolumen, deutlicher bei Einheiten über 45 min, nach ≥ 8 h Fasten und mit vielen Sätzen bis zur Ausbelastung.');
      notes.push('Die Dosis hatte keinen messbaren Einfluss. Kleine Mengen als Getränk reichen; die Mahlzeit vor dem Training ist wichtiger als die Zufuhr währenddessen.');
    }
    if (env === 'heat') notes.push('Hitze: Exogene Oxidation sinkt um 20–30 %, die Empfehlung bleibt aber gleich. Bei Magenproblemen moderat reduzieren, kalte KH-Getränke nutzen.');
    if (env === 'alt') notes.push('Höhe: Erst ab > 4000 m sinkt die exogene Oxidation deutlich (20–50 %). Bei kurzer Exposition gelten dieselben Empfehlungen wie auf Meereshöhe.');
    if (env === 'cold') notes.push('Kälte: Exogene Oxidation bleibt unverändert. Stabile Blutglukose unterstützt die Wärmebildung, also Zufuhr beibehalten.');
    if (mass < 70 && target > 0) notes.push('Leichtere Athleten oxidieren im Mittel weniger exogene Glukose (≈ 33 vs. 45 g/h bei < bzw. > 70 kg), daher eher unterer Teil des Bereichs.');
    if (sex === 'f' && target > 0) notes.push('Frauen: Glukose allein steigerte die Oxidation nur bis ~60 g/h; darüber Mischung verwenden. Die Ausdauer-Bereiche basieren auf Daten von Männern.');
    $('notes').innerHTML = notes.map(n => '<li>'+n+'</li>').join('');

    if (isEnd) {
      const acsm = D < 1 ? 'kleine Mengen / Mundspülung' : D <= 2.5 ? '30–60 g/h' : 'bis 90 g/h (Mehrfachzucker)';
      $('compare').textContent = 'Zum Vergleich ACSM 2016 für diese Dauer: '+acsm+'. Morton et al. 2026 schlagen vor, die Obergrenze für Trainierte auf 120 g/h anzuheben.';
    } else {
      $('compare').textContent = 'Morton et al. 2026 behandeln nur Ausdauerbelastungen. Die Werte für '+(isKraft?'Krafttraining':'Sprint')+' sind aus anderen Studien abgeleitet und als Orientierung gedacht.';
    }

    // Matrix
    $('m-h').textContent = model.title;
    $('m-hint').textContent = model.hint;
    let h = '<thead><tr><th></th>'+model.cols.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>';
    for (const rw of model.rows) {
      h += '<tr class="'+rw.cls+'"><th class="zl">'+rw.name+'<small>'+rw.sub+'</small></th>';
      rw.r.forEach((r,i)=>{ h += '<td class="'+(rw.key===rowKey&&i===c?'on':'')+'"><b>'+(r[1]===0?'0':r[0]+'–'+r[1])+'</b><span>'+(r[1]===0?'Wasser':src(r))+'</span></td>'; });
      h += '</tr>';
    }
    $('mtx').innerHTML = h + '</tbody>';
  }

  $('f').addEventListener('input', compute);
  $('f').addEventListener('change', compute);
  compute();
})();
