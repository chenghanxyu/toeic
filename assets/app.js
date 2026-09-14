
const DATA = window.WEEK1_DATA;
const STORAGE_KEY = "toeic_week1_progress_v1";
let currentDayId = null;
let questionStartTimes = {};

const $ = (sel) => document.querySelector(sel);

function loadProgress(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      startedAt:new Date().toISOString(),
      answers:{},
      viewedDays:{},
      sessions:[]
    };
  }catch(e){
    return {startedAt:new Date().toISOString(),answers:{},viewedDays:{},sessions:[]};
  }
}
let progress = loadProgress();

function saveProgress(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function allQuestions(){
  return DATA.days.flatMap(d => d.questions.map(q => ({...q, dayId:d.id, dayTitle:d.title})));
}
function answeredQuestions(){
  return Object.keys(progress.answers).length;
}
function correctCount(){
  return Object.values(progress.answers).filter(a => a.correct).length;
}
function accuracy(){
  const n = answeredQuestions();
  return n ? Math.round(correctCount()/n*100) : 0;
}
function totalTimeSec(){
  return Object.values(progress.answers).reduce((s,a)=>s+(a.elapsedSec||0),0);
}
function fmtTime(sec){
  const m = Math.floor(sec/60), s = Math.round(sec%60);
  return `${m}m ${s}s`;
}
function skillStats(){
  const qs = allQuestions();
  const by = {};
  qs.forEach(q=>{
    const a = progress.answers[q.id];
    if(!a) return;
    const key = q.skill || q.part;
    if(!by[key]) by[key]={correct:0,total:0,time:0};
    by[key].total++;
    if(a.correct) by[key].correct++;
    by[key].time += a.elapsedSec||0;
  });
  return by;
}
function partStats(){
  const qs = allQuestions();
  const by = {};
  qs.forEach(q=>{
    const a = progress.answers[q.id];
    if(!a) return;
    const key = q.part;
    if(!by[key]) by[key]={correct:0,total:0,time:0};
    by[key].total++;
    if(a.correct) by[key].correct++;
    by[key].time += a.elapsedSec||0;
  });
  return by;
}
function skillLabel(k){
  const map={
    word_form:"詞性",verb_tense:"時態",preposition_conjunction:"介系詞/連接詞",
    voice:"主被動",relative_clause:"關係子句",collocation:"搭配詞",comparison:"比較級",
    listening_when:"聽力：時間",listening_where:"聽力：地點",listening_why:"聽力：原因",
    listening_who:"聽力：人物",listening_request:"聽力：請求",listening_suggestion:"聽力：請求",
    listening_indirect:"聽力：間接回應",listening_main_idea:"聽力：主旨",
    listening_detail:"聽力：細節",listening_next_step:"聽力：下一步",listening_action:"聽力：行動",
    listening_sequence:"聽力：時間/順序",reading_detail:"閱讀：細節",reading_inference:"閱讀：推論",
    reading_sequence:"閱讀：順序",reading_action:"閱讀：行動",reading_purpose:"閱讀：目的"
  };
  return map[k]||k;
}

function renderNav(){
  const nav = $("#dayNav");
  nav.innerHTML = `<button class="nav-btn ${!currentDayId?'active':''}" data-view="dashboard">總覽<span class="small">進度與弱點</span></button>`+
    DATA.days.map(d=>{
      const total=d.questions.length;
      const done=d.questions.filter(q=>progress.answers[q.id]).length;
      return `<button class="nav-btn ${currentDayId===d.id?'active':''}" data-day="${d.id}">
        ${d.label}｜${d.title}<span class="small">${done}/${total || "複習"} 題</span>
      </button>`;
    }).join("")+
    `<button class="nav-btn" data-view="review">錯題本<span class="small">只看需要複習的題目</span></button>`;

  nav.querySelectorAll("[data-day]").forEach(btn=>btn.onclick=()=>showLesson(btn.dataset.day));
  nav.querySelector('[data-view="dashboard"]').onclick=showDashboard;
  nav.querySelector('[data-view="review"]').onclick=showReview;
}

function showView(id){
  ["dashboardView","lessonView","reviewView"].forEach(v=>$("#"+v).classList.add("hidden"));
  $("#"+id).classList.remove("hidden");
}

function showDashboard(){
  currentDayId=null;
  renderNav();
  $("#pageTitle").textContent="Week 1 儀表板";
  $("#pageSubtitle").textContent="先診斷，再依你的錯誤類型調整 Week 2。";
  showView("dashboardView");

  const total=allQuestions().length, done=answeredQuestions(), acc=accuracy();
  const pstats=partStats();
  const weak = Object.entries(skillStats())
    .map(([k,v])=>({k,...v,acc:Math.round(v.correct/v.total*100)}))
    .filter(x=>x.total>=1)
    .sort((a,b)=>a.acc-b.acc || b.total-a.total)
    .slice(0,6);

  let recommendation="先完成 Day 1 診斷測驗，我才能判斷你目前的主要失分來源。";
  if(done>=12){
    if(weak.length && weak[0].acc<70){
      recommendation=`目前最優先補強：${skillLabel(weak[0].k)}（${weak[0].acc}%）。Week 2 應增加這類題目的比重。`;
    }else{
      recommendation="目前各項表現相對平均，接下來可提高限時與 Part 7 題量。";
    }
  }

  $("#dashboardView").innerHTML=`
    <div class="grid stats">
      <div class="card"><div class="stat-label">已完成</div><div class="stat-value">${done}/${total}</div></div>
      <div class="card"><div class="stat-label">整體正確率</div><div class="stat-value">${acc}%</div></div>
      <div class="card"><div class="stat-label">累計作答時間</div><div class="stat-value">${fmtTime(totalTimeSec())}</div></div>
      <div class="card"><div class="stat-label">本週目標</div><div class="stat-value">診斷＋穩定</div></div>
    </div>

    <div class="section-title">本週進度</div>
    <div class="card">
      <div class="progress"><span style="width:${total?Math.round(done/total*100):0}%"></span></div>
      <p class="muted">${Math.round(done/total*100)}% 完成</p>
      <div class="notice">${recommendation}</div>
    </div>

    <div class="section-title">每日任務</div>
    <div class="grid day-cards">
      ${DATA.days.map(d=>{
        const dt=d.questions.length;
        const dd=d.questions.filter(q=>progress.answers[q.id]).length;
        return `<div class="card day-card" data-day-card="${d.id}">
          <h3>${d.label}｜${d.title}</h3>
          <p class="muted">${d.subtitle}</p>
          <div><span class="tag">約 ${d.estimatedMinutes} 分鐘</span>
          <span class="tag">${d.vocab.length} 個單字</span>
          <span class="tag">${dt || 0} 題</span></div>
          <div style="margin-top:14px" class="progress"><span style="width:${dt?Math.round(dd/dt*100):(d.id==="day7"?100:0)}%"></span></div>
        </div>`;
      }).join("")}
    </div>

    <div class="section-title">目前各 Part 表現</div>
    <div class="card">
      ${Object.keys(pstats).length ? Object.entries(pstats).map(([k,v])=>{
        const a=Math.round(v.correct/v.total*100);
        return `<div class="weak-row"><span>${k}</span><strong class="${a>=75?'score-good':a<60?'score-bad':''}">${a}%（${v.correct}/${v.total}）</strong></div>`;
      }).join("") : '<p class="muted">完成題目後會出現統計。</p>'}
    </div>

    <div class="section-title">弱點偵測</div>
    <div class="card weak-list">
      ${weak.length ? weak.map(x=>`<div class="weak-row"><span>${skillLabel(x.k)}</span><strong class="${x.acc>=75?'score-good':x.acc<60?'score-bad':''}">${x.acc}%</strong></div>`).join("") : '<p class="muted">尚無足夠資料。</p>'}
    </div>
  `;
  document.querySelectorAll("[data-day-card]").forEach(el=>el.onclick=()=>showLesson(el.dataset.dayCard));
}

function resolvePassage(day,q){
  if(q.passage) return q.passage;
  if(q.passageRef){
    const src=day.questions.find(x=>x.id===q.passageRef);
    return src?.passage || "";
  }
  return "";
}
function resolveAudio(day,q){
  if(q.audio) return q.audio;
  if(q.audioRef){
    const src=day.questions.find(x=>x.id===q.audioRef);
    return src?.audio || "";
  }
  return "";
}

function speak(text){
  if(!("speechSynthesis" in window)){
    alert("此瀏覽器不支援語音播放。建議使用 Chrome / Edge / Safari。");
    return;
  }
  speechSynthesis.cancel();
  const lines=text.split("\n").filter(Boolean);
  let i=0;
  function next(){
    if(i>=lines.length) return;
    const raw=lines[i++].replace(/^(Woman|Man):\s*/,"");
    const u=new SpeechSynthesisUtterance(raw);
    u.lang="en-US";
    u.rate=0.92;
    u.onend=next;
    speechSynthesis.speak(u);
  }
  next();
}

function showLesson(dayId){
  currentDayId=dayId;
  renderNav();
  showView("lessonView");
  const day=DATA.days.find(d=>d.id===dayId);
  progress.viewedDays[dayId]=new Date().toISOString();
  saveProgress();
  $("#pageTitle").textContent=`${day.label}｜${day.title}`;
  $("#pageSubtitle").textContent=day.subtitle;

  const done=day.questions.filter(q=>progress.answers[q.id]).length;
  $("#lessonView").innerHTML=`
    <div class="lesson-head">
      <div>
        <h2>${day.title}</h2>
        <p class="muted">建議時間：約 ${day.estimatedMinutes} 分鐘｜已完成 ${done}/${day.questions.length} 題</p>
      </div>
      <div class="lesson-actions">
        <button class="btn primary" id="goQuestions">跳到題目</button>
        <button class="btn secondary" id="backDashboard">返回總覽</button>
      </div>
    </div>

    <div class="section-title">今日單字</div>
    <div class="vocab-list">
      ${day.vocab.map(v=>`<div class="vocab">
        <strong>${v[0]}</strong>
        <div class="meaning">${v[1]}</div>
        <div class="kicker">${v[2]}</div>
        <div class="example">${v[3]}</div>
      </div>`).join("")}
    </div>

    <div id="questionsAnchor" class="section-title">${day.questions.length ? "今日題目" : "今日任務"}</div>
    ${day.questions.length ? day.questions.map((q,i)=>renderQuestion(day,q,i)).join("") :
      `<div class="card">
        <h3>Day 7：只複習，不新增題目</h3>
        <p>請打開「錯題本」，優先複習正確率低於 70% 的技能，並重新閱讀本週單字。</p>
        <button class="btn primary" id="openReview">開啟錯題本</button>
      </div>`}
  `;
  $("#backDashboard").onclick=showDashboard;
  $("#goQuestions").onclick=()=>$("#questionsAnchor").scrollIntoView({behavior:"smooth"});
  if($("#openReview")) $("#openReview").onclick=showReview;
  attachQuestionHandlers(day);
}

function renderQuestion(day,q,i){
  const a=progress.answers[q.id];
  const passage=resolvePassage(day,q);
  const audio=resolveAudio(day,q);
  if(!a) questionStartTimes[q.id]=Date.now();

  return `<div class="card question-card" id="${q.id}">
    <div class="question-no">${q.part} · Q${i+1} · ${skillLabel(q.skill)}</div>
    ${audio ? `<div class="audio-box">
      <button class="btn primary audio-play" data-audio-id="${q.id}">▶ 播放音檔</button>
      <span class="muted">先不要看逐字稿；作答後才顯示。</span>
    </div>` : ""}
    ${passage ? `<div class="passage">${escapeHtml(passage)}</div>` : ""}
    <div class="prompt">${escapeHtml(q.prompt || "請聽音檔後作答。")}</div>
    <div class="options">
      ${q.options.map((o,idx)=>{
        let cls="";
        if(a){
          if(idx===q.answer) cls="correct";
          if(idx===a.selected && !a.correct) cls="wrong";
        }
        return `<label class="option ${cls}">
          <input type="radio" name="${q.id}" value="${idx}" ${a&&a.selected===idx?'checked':''} ${a?'disabled':''}>
          <span>${String.fromCharCode(65+idx)}. ${escapeHtml(o)}</span>
        </label>`;
      }).join("")}
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      ${!a ? `<button class="btn primary submit-answer" data-qid="${q.id}">送出答案</button>` :
      `<button class="btn secondary retry-answer" data-qid="${q.id}">重新作答</button>`}
      ${audio && a ? `<button class="btn secondary show-script" data-qid="${q.id}">顯示逐字稿</button>` : ""}
    </div>
    ${a ? `<div class="explain">
      <strong class="${a.correct?'score-good':'score-bad'}">${a.correct?'答對':'答錯'}</strong>
      ｜你的答案：${String.fromCharCode(65+a.selected)} ｜用時 ${a.elapsedSec||0} 秒
      <br>${escapeHtml(q.explanation)}
      ${audio ? `<div class="script hidden" data-script="${q.id}" style="margin-top:8px"><strong>逐字稿：</strong><br>${escapeHtml(audio).replace(/\n/g,"<br>")}</div>`:""}
    </div>` : ""}
  </div>`;
}

function escapeHtml(s){
  return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}

function attachQuestionHandlers(day){
  document.querySelectorAll(".audio-play").forEach(btn=>{
    btn.onclick=()=>{
      const q=day.questions.find(x=>x.id===btn.dataset.audioId);
      speak(resolveAudio(day,q));
    };
  });
  document.querySelectorAll(".submit-answer").forEach(btn=>{
    btn.onclick=()=>{
      const qid=btn.dataset.qid;
      const q=day.questions.find(x=>x.id===qid);
      const selected=document.querySelector(`input[name="${qid}"]:checked`);
      if(!selected){ alert("請先選一個答案。"); return; }
      const idx=Number(selected.value);
      const elapsed=Math.max(1, Math.round((Date.now()-(questionStartTimes[qid]||Date.now()))/1000));
      progress.answers[qid]={
        selected:idx,
        correct:idx===q.answer,
        elapsedSec:elapsed,
        answeredAt:new Date().toISOString(),
        part:q.part,
        skill:q.skill,
        dayId:day.id
      };
      saveProgress();
      showLesson(day.id);
      setTimeout(()=>document.getElementById(qid)?.scrollIntoView({behavior:"smooth",block:"center"}),50);
    };
  });
  document.querySelectorAll(".retry-answer").forEach(btn=>{
    btn.onclick=()=>{
      delete progress.answers[btn.dataset.qid];
      saveProgress();
      showLesson(day.id);
      setTimeout(()=>document.getElementById(btn.dataset.qid)?.scrollIntoView({behavior:"smooth",block:"center"}),50);
    };
  });
  document.querySelectorAll(".show-script").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelector(`[data-script="${btn.dataset.qid}"]`)?.classList.toggle("hidden");
    };
  });
}

function showReview(){
  currentDayId=null;
  renderNav();
  showView("reviewView");
  $("#pageTitle").textContent="錯題本";
  $("#pageSubtitle").textContent="優先看「為什麼錯」，而不是只背正確答案。";
  const qs=allQuestions().filter(q=>progress.answers[q.id] && !progress.answers[q.id].correct);
  $("#reviewView").innerHTML = qs.length ? `
    <div class="card">
      <table class="review-table">
        <thead><tr><th>Day</th><th>題型</th><th>技能</th><th>題目</th><th>你的答案</th><th>正確答案</th></tr></thead>
        <tbody>
          ${qs.map(q=>{
            const a=progress.answers[q.id];
            return `<tr>
              <td>${q.dayId.replace("day","Day ")}</td>
              <td>${q.part}</td>
              <td>${skillLabel(q.skill)}</td>
              <td>${escapeHtml(q.prompt||"(聽力題)")}</td>
              <td>${String.fromCharCode(65+a.selected)}. ${escapeHtml(q.options[a.selected])}</td>
              <td>${String.fromCharCode(65+q.answer)}. ${escapeHtml(q.options[q.answer])}<br><span class="muted">${escapeHtml(q.explanation)}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>` : `<div class="card"><p>目前沒有錯題。完成 Day 1 後再回來看。</p></div>`;
}

function download(name, content, type="application/json"){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
}
$("#exportBtn").onclick=()=>{
  const payload={
    exportedAt:new Date().toISOString(),
    course:DATA.meta,
    progress,
    summary:{
      answered:answeredQuestions(),
      correct:correctCount(),
      accuracy:accuracy(),
      totalTimeSec:totalTimeSec(),
      partStats:partStats(),
      skillStats:skillStats()
    }
  };
  download("toeic_week1_progress.json", JSON.stringify(payload,null,2));
};
$("#exportCsvBtn").onclick=()=>{
  const rows=[["day","question_id","part","skill","prompt","selected","correct_answer","is_correct","elapsed_sec"]];
  allQuestions().forEach(q=>{
    const a=progress.answers[q.id];
    if(!a || a.correct) return;
    rows.push([
      q.dayId,q.id,q.part,skillLabel(q.skill),q.prompt||"(listening)",
      q.options[a.selected],q.options[q.answer],a.correct,a.elapsedSec||0
    ]);
  });
  const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  download("toeic_week1_mistakes.csv","\ufeff"+csv,"text/csv;charset=utf-8");
};
$("#resetBtn").onclick=()=>{
  if(confirm("確定要清除 Week 1 所有作答紀錄嗎？")){
    localStorage.removeItem(STORAGE_KEY);
    progress=loadProgress();
    showDashboard();
  }
};

renderNav();
showDashboard();
