(function(){
  const $ = id => document.getElementById(id);
  const val = name => { const el = document.querySelector('input[name="'+name+'"]:checked'); return el ? el.value : null; };
  const fmt = n => n.toLocaleString('de-DE');

  // Morton et al. 2026, Abb. 5 – [min,max] g/h; Spalten: <1h, 1–2h, 2–3h, 3–6h, >6h
  const M = {
    1:[[0,0],[0,30],[30,60],[30,60],[60,90]],
    2:[[0,0],[30,60],[60,90],[60,90],[60,90]],
    3:[[0,30],[60,90],[90,120],[90,120],[90,120]],
    4:[[0,30],[75,90],[90,120],[90,120],[90,120]],
    5:[[30,60],[75,90],[90,120],[90,120],[90,120]]
  };
  const COLS = ['< 1 h','1–2 h','2–3 h','3–6 h','> 6 h'];
  const ZN = {1:['Z1','Regeneration','m'],2:['Z2','Grundlage','m'],3:['Z3','Tempo','h'],4:['Z4','Schwelle','h'],5:['Z5','VO₂max / HIT','s']};
  const col = D => D < 1 ? 0 : D < 2 ? 1 : D < 3 ? 2 : D <= 6 ? 3 : 4;
  const src = r => r[1] === 0 ? 'keine' : r[1] <= 60 ? 'Single Source' : r[0] >= 90 ? 'Dual Source' : 'Single/Dual';
  const r5 = x => Math.round(x/5)*5;

  function compute(){
    const sport = val('sport'), Z = +val('zone'), goal = val('goal'), env = val('env');
    const D = Math.max(0, (+$('dh').value||0) + (+$('dm').value||0)/60);
    const gut = +$('gut').value, mass = +$('mass').value||70, sex = $('sex').value;
    const iv = +$('iv').value, bph = +$('bph').value, bc = +$('bc').value||0, gs = +$('gs').value||25;
    const ox = +$('ox').value||0;
    const c = col(D), base = M[Z][c];
    let lo = base[0], hi = base[1];
    const notes = [], pills = [];

    let p = 0.5;
    if (goal === 'race') p += 0.3;
    if (mass < 70) p -= 0.15; else if (mass >= 80) p += 0.1;
    if (sport === 'run') p -= 0.1;
    if (env === 'heat') p -= 0.1;
    p = Math.min(1, Math.max(0, p));
    let target = r5(lo + p*(hi-lo));

    if (goal === 'low') {
      if (Z <= 2) { target = lo; notes.push('Train-low: Bei niedriger Intensität darf die Zufuhr bewusst gering bleiben, um Fettoxidation und Trainingsanpassung zu fördern (KH-Periodisierung). Für harte Einheiten gilt „Fuel for the work required“.'); }
      else { notes.push('Train-low passt nicht zu Zone '+Z+': Bei schwerer/schwellennaher Intensität wird für die Qualität der Einheit normal versorgt.'); }
    }

    let capped = false;
    if (hi > gut) { hi = gut; capped = true; }
    if (lo > gut) lo = gut;
    if (target > gut) { target = gut; capped = true; }

    let personal = false;
    if (ox > 0 && target > 0) {
      const gDose = ox / 0.8;
      const t = base[1] > 60 ? gDose * 1.8 : Math.min(target, gDose);
      target = r5(Math.min(gut, t));
      personal = true;
      pills.push(['ok','personalisiert']);
      notes.push('Personalisiert: '+Math.round(gDose)+' g/h Glukose deckt deine gemessene Oxidation von '+ox+' g/h bei ~80 % Effizienz'+(base[1] > 60 ? '; dazu ~'+Math.round(gDose*0.8)+' g/h Fruktose.' : '.')+' Der Test erfasst nur die Glukose-Komponente.');
    }

    // Komposition
    let g = target, f = 0, srcTxt;
    if (target === 0) srcTxt = 'Keine KH nötig';
    else if (target <= 60) {
      srcTxt = (Z >= 4 && D < 2.5) ? 'Glukose / Maltodextrin' : 'Glukose / Maltodextrin (Mischung möglich)';
    } else {
      g = Math.round(target/1.8); f = target - g; srcTxt = 'Glukose + Fruktose';
    }

    // Ausgabe Kopf
    $('target').innerHTML = fmt(target)+'<small>g/h</small>';
    $('range').innerHTML = 'Bereich laut Modell: <strong>'+base[0]+'–'+base[1]+' g/h</strong><br>'+src(base)+(capped ? ' · gedeckelt auf '+gut+' g/h' : '');
    pills.unshift([target > 90 ? 'warn' : '', srcTxt]);
    pills.unshift(['', ZN[Z][0]+' · '+COLS[c]]);
    if (capped) pills.push(['warn','Darm-Toleranz limitiert']);
    $('pills').innerHTML = pills.map(x => '<span class="pill '+x[0]+'">'+x[1]+'</span>').join('');

    const totalMin = Math.round(D*60);
    const n = target > 0 ? Math.floor(totalMin/iv) : 0;
    const per = target*iv/60;
    $('total').textContent = target > 0 ? fmt(Math.round(target*D))+' g' : '0 g';
    $('perfeed').textContent = target > 0 ? fmt(Math.round(per))+' g' : '–';
    $('nfeed').textContent = n ? n+' × '+iv+' min' : '–';

    // Blend
    $('blendbox').hidden = target === 0;
    const tot = Math.max(1, g+f);
    $('bg').style.width = (g/tot*100)+'%'; $('bf').style.width = (f/tot*100)+'%';
    $('legend').innerHTML = '<span class="lg">Glukose/Maltodextrin '+g+' g</span>' + (f ? '<span class="lf">Fruktose '+f+' g</span><span>Verhältnis F:G = '+(f/g).toFixed(2).replace('.',',')+'</span>' : '');

    // Mix
    if (target === 0) $('mix').textContent = 'Wasser bzw. Elektrolyte nach Durst. Bei harten kurzen Einheiten optional KH-Mundspülung.';
    else {
      const fromB = bph*bc, rest = Math.max(0, target - fromB);
      const gels = Math.round(rest/gs*2)/2;
      let s = '';
      if (bph > 0) s += fmt(bph)+' Flasche'+(bph===1?'':'n')+' à '+bc+' g = '+fmt(fromB)+' g';
      if (gels > 0) s += (s ? ' + ' : '')+fmt(gels)+' Gel'+(gels===1?'':'s')+' / Chews à '+gs+' g';
      if (fromB > target + 5) s += ' – die Flaschen allein liefern mehr als das Ziel; Konzentration oder Menge reduzieren.';
      $('mix').textContent = s || 'Kein Produkt gewählt.';
    }

    // Zeitplan
    const feeds = [];
    for (let i=1;i<=n;i++){ const t=i*iv; feeds.push('<span class="feed">'+Math.floor(t/60)+':'+String(t%60).padStart(2,'0')+' · <b>'+Math.round(per)+' g</b></span>'); }
    $('feeds').innerHTML = feeds.length ? feeds.join('') : '<span class="hint">Kein fester Plan nötig.</span>';

    // Hinweise
    if (target > 0) notes.push('Früh beginnen (ab ~15 min) und gleichmäßig verteilen: Die exogene Oxidation erreicht ihr Plateau erst nach ~2 h.');
    if (target > 60) notes.push('Über 60 g/h nur mit Glukose-Fruktose-Mischung (SGLT1 + GLUT5). Ein Fruktose-zu-Glukose-Verhältnis von 0,6–1,0 (z. B. 1 : 0,8) ergab die höchste Oxidation.');
    if (target <= 60 && target > 0 && Z >= 4 && D < 2.5) notes.push('Kurz und intensiv: Glukose/Maltodextrin bevorzugen – im Halbmarathon senkte eine Glukose-Fruktose-Mischung bei 60 g/h die KH-Oxidation.');
    if (capped) notes.push('Das Modell erlaubt bis '+base[1]+' g/h. Mit progressivem Gut-Training (wiederholt höhere Mengen in Trainingseinheiten, hohe KH-Kost vor Wettkämpfen) steigt die Verträglichkeit.');
    if (target > 90) notes.push('90–120 g/h steigert exogene und Gesamt-KH-Oxidation bei Trainierten; die Leistungswirkung oberhalb 90 g/h ist noch nicht abschließend belegt.');
    if (target > 0) notes.push('Gemischtes Format (Getränk, Gel, Chews) oxidiert so gut wie Getränke allein. Riegel nicht als einzige Quelle nutzen. Gelreste einrechnen – die tatsächliche Aufnahme wird oft überschätzt.');
    if (sport === 'run') notes.push('Laufen: höheres GI-Risiko. In einer Studie mit Elite-Marathonis verbesserten 120 g/h die Laufökonomie um ~3 % gegenüber 60 g/h, aber mit stärkeren Magensymptomen. Im Wettkampf meist alle 5 km (~15 min) verpflegen.');
    if (sport === 'tri') notes.push('Triathlon: Kein Essen beim Schwimmen, daher früh auf dem Rad starten und dort den Großteil aufnehmen. Bei GI-Problemen spät auf dem Rad / früh im Lauf leicht reduzieren.');
    if (sport === 'bike') notes.push('Rad: Zufuhr nach Etappenprofil periodisieren. Ausreißversuche fallen heute oft früher; die KH-Verfügbarkeit dafür bis zum Schluss hochhalten.');
    if (sport === 'ultra') notes.push('Ultra: Geschmacksermüdung einplanen (salzige Optionen, kalte Getränke in Hitze, Crew-Logistik). Finisher nahmen im Mittel mehr KH auf als Aussteiger; 120 g/h senkte im Bergmarathon Muskelschadensmarker.');
    if (sport === 'team') notes.push('Teamsport: Halbzeit und Unterbrechungen nutzen; Getränke und Gels sind am praktikabelsten.');
    if (env === 'heat') notes.push('Hitze: Exogene Oxidation sinkt um 20–30 %, die Empfehlung bleibt aber gleich. Bei Magenproblemen moderat reduzieren, kalte KH-Getränke nutzen, hitzeakklimatisieren.');
    if (env === 'alt') notes.push('Höhe: Erst ab > 4000 m sinkt die exogene Oxidation deutlich (20–50 %). Bei kurzer Exposition (Pässe, Bergläufe) gelten dieselben Empfehlungen wie auf Meereshöhe.');
    if (env === 'cold') notes.push('Kälte: Exogene Oxidation bleibt unverändert. Stabile Blutglukose unterstützt die Wärmebildung, also Plan beibehalten.');
    if (mass < 70) notes.push('Leichtere Athleten oxidieren im Mittel weniger exogene Glukose (≈ 33 vs. 45 g/h bei < bzw. > 70 kg), daher eher unterer Teil des Bereichs.');
    if (sex === 'f') notes.push('Frauen: Glukose allein steigerte die Oxidation nur bis ~60 g/h; darüber Mischung verwenden. Die Bereiche im Modell basieren auf Daten von Männern.');

    $('notes').innerHTML = notes.map(n => '<li>'+n+'</li>').join('');

    const acsm = D < 1 ? 'kleine Mengen / Mundspülung' : D <= 2.5 ? '30–60 g/h' : 'bis 90 g/h (Mehrfachzucker)';
    $('compare').textContent = 'Zum Vergleich ACSM 2016 für diese Dauer: '+acsm+'. Morton et al. 2026 schlagen vor, die Obergrenze für Trainierte auf 120 g/h anzuheben.';

    // Matrix
    let h = '<thead><tr><th></th>'+COLS.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>';
    for (const z of [5,4,3,2,1]) {
      h += '<tr class="'+ZN[z][2]+'"><th class="zl">'+ZN[z][0]+'<small>'+ZN[z][1]+'</small></th>';
      M[z].forEach((r,i)=>{ h += '<td class="'+(z===Z&&i===c?'on':'')+'"><b>'+(r[1]===0?'0':r[0]+'–'+r[1])+'</b><span>'+(r[1]===0?'Wasser':src(r))+'</span></td>'; });
      h += '</tr>';
    }
    $('mtx').innerHTML = h + '</tbody>';
  }

  $('f').addEventListener('input', compute);
  $('f').addEventListener('change', compute);
  compute();
})();
