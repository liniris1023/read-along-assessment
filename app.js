const $ = id => document.getElementById(id);
let questions = [], active = -1, utterance = null, speechToken = 0, voices = [], busy = false;
const demo = '1. 小明有 5 顆蘋果，又買了 3 顆蘋果，現在一共有幾顆蘋果？\n① 7 顆　② 8 顆　③ 9 顆\n\n2. 請選出與「快樂」意思相近的詞語。\n① 開心　② 傷心　③ 生氣\n\n3. 閱讀下面的句子，再回答問題。\n小美每天早上都會替陽台上的花澆水。\n請問：小美在什麼時候澆水？';
function status(text, error = false) { $('status').textContent = text; $('status').style.color = error ? '#a34e35' : ''; }
function splitQuestions(text) {
  return text.trim().replace(/\r/g, '').split(/\n\s*\n+|\n(?=\s*(?:第\s*[一二三四五六七八九十百\d]+\s*題|\d{1,3}[.．、](?!\d)|[（(]\d{1,3}[）)]))/).map(t => t.trim()).filter(Boolean);
}
function syncRaw() { $('raw').value = questions.join('\n\n'); }
function render() {
  $('count').textContent = `${questions.length} 題`;
  if (!questions.length) { $('questions').innerHTML = '<div class="empty"><div class="empty-icon">♫</div><h3>每一道題目，都可以慢慢聽。</h3><p>匯入試卷後，題目會出現在這裡。<br>按下「聽題目」，想聽幾次都可以。</p><button id="emptyDemo">先用範例體驗 →</button></div>'; $('emptyDemo').onclick = loadDemo; return; }
  $('questions').replaceChildren();
  questions.forEach((q, i) => {
    const card = document.createElement('article'); card.className = 'question'; card.id = `q-${i}`;
    const top = document.createElement('div'); top.className = 'qtop';
    const num = document.createElement('span'); num.className = 'qnum'; num.textContent = `題目 ${String(i + 1).padStart(2, '0')}`;
    const listen = document.createElement('button'); listen.className = 'listen'; listen.textContent = '◖)) 聽題目'; listen.setAttribute('aria-label', `報讀第 ${i + 1} 題`); listen.onclick = () => speak(i);
    top.append(num, listen);
    const text = document.createElement('p'); text.className = 'qtext'; text.textContent = q;
    const edit = document.createElement('button'); edit.className = 'qedit'; edit.textContent = '編輯題目'; edit.onclick = () => editQuestion(i, card);
    card.append(top, text, edit); $('questions').append(card);
  });
}
function editQuestion(i, card) {
  if (card.querySelector('.qeditor')) return;
  stop(); const box = document.createElement('div'); box.className = 'qeditor';
  const input = document.createElement('textarea'); input.value = questions[i]; input.rows = 5; input.setAttribute('aria-label', `編輯第 ${i + 1} 題`);
  const save = document.createElement('button'); save.textContent = '儲存'; save.className = 'primary'; save.onclick = () => { if (!input.value.trim()) { input.focus(); return; } questions[i] = input.value.trim(); syncRaw(); render(); };
  const cancel = document.createElement('button'); cancel.textContent = '取消'; cancel.onclick = () => box.remove();
  const del = document.createElement('button'); del.textContent = '刪除此題'; del.onclick = () => { if (confirm('要刪除這一道題目嗎？')) { questions.splice(i, 1); syncRaw(); render(); } };
  box.append(input, save, cancel, del); card.append(box); input.focus();
}
function stop() { speechToken++; if ('speechSynthesis' in window) speechSynthesis.cancel(); document.querySelectorAll('.question.active').forEach(e => e.classList.remove('active')); active = -1; utterance = null; $('playing').textContent = '點選題目旁的喇叭，開始聽題目'; }
function speak(i) {
  stop(); if (!('speechSynthesis' in window)) { $('playing').textContent = '此瀏覽器不支援語音，請改用 Safari、Chrome 或 Edge。'; return; }
  const token = speechToken; active = i; $(`q-${i}`).classList.add('active'); $('playing').textContent = `正在報讀第 ${i + 1} 題…`;
  const selected = voices.find(v => v.voiceURI === $('voice').value); const chunks = questions[i].match(/[^。！？\n]+[。！？\n]?|[。！？\n]/g) || [questions[i]];
  let part = 0;
  const next = () => {
    if (token !== speechToken) return;
    if (part >= chunks.length) { stop(); $('playing').textContent = `第 ${i + 1} 題報讀完畢，可以再聽一次。`; return; }
    utterance = new SpeechSynthesisUtterance(chunks[part++]); utterance.lang = 'zh-TW'; utterance.rate = Number($('rate').value); if (selected) utterance.voice = selected;
    utterance.onend = next; utterance.onerror = e => { if (token !== speechToken) return; stop(); $('playing').textContent = `語音無法播放（${e.error}），請確認裝置音量與中文語音設定，再按一次。`; };
    speechSynthesis.speak(utterance);
  }; next();
}
function updateVoices() { if (!('speechSynthesis' in window)) return; const old = $('voice').value; voices = speechSynthesis.getVoices().filter(v => /^zh|^cmn/i.test(v.lang)); $('voice').replaceChildren(new Option('系統中文語音', '')); voices.forEach(v => $('voice').add(new Option(`${v.name} (${v.lang})`, v.voiceURI))); $('voice').value = voices.some(v => v.voiceURI === old) ? old : (voices.find(v => /TW/i.test(v.lang))?.voiceURI || ''); }
if ('speechSynthesis' in window) { updateVoices(); speechSynthesis.onvoiceschanged = updateVoices; }
function loadDemo() { if (questions.length && !confirm('要用範例取代目前的題目嗎？')) return; stop(); $('raw').value = demo; questions = splitQuestions(demo); render(); status('已載入 3 題範例，按「聽題目」即可體驗。'); }
function loadScript(src, check) { if (check()) return Promise.resolve(); return new Promise((resolve, reject) => { const s = document.createElement('script'); const timer = setTimeout(() => { s.remove(); reject(new Error('套件載入逾時，請確認網路後重試，或先貼上題目文字。')); }, 45000); s.src = src; s.onload = () => { clearTimeout(timer); resolve(); }; s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('套件載入失敗，請確認網路後重試。')); }; document.head.append(s); }); }
function timeLimit(promise, ms = 180000) { return Promise.race([promise, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('辨識逾時，請改拍清楚的單頁照片後重試。')), ms); promise.finally(() => clearTimeout(timer)).catch(() => {}); })]); }
async function createOCR() { status('正在載入文字辨識工具，首次使用需下載中文資料，可能需要數分鐘…'); await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', () => !!window.Tesseract); return timeLimit(Tesseract.createWorker('chi_tra+eng', 1, { logger: m => { $('progress').value = m.progress || 0; if (m.status === 'recognizing text') status(`正在辨識繁體中文… ${Math.round(m.progress * 100)}%`); else if (m.status === 'loading language traineddata') status(`正在下載中文與英文辨識資料… ${Math.round((m.progress || 0) * 100)}%`); else status('正在準備辨識引擎，請稍候…'); } })); }
async function imageCanvas(file) {
  const url = URL.createObjectURL(file);
  try { const img = new Image(); img.src = url; await img.decode(); const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight)); const c = document.createElement('canvas'); c.width = img.naturalWidth * scale; c.height = img.naturalHeight * scale; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height); ctx.drawImage(img,0,0,c.width,c.height); return c; } finally { URL.revokeObjectURL(url); }
}
function textFromItems(items) { let out = '', y = null; for (const item of items) { if (!('str' in item)) continue; const currentY = item.transform[5]; if (y !== null && Math.abs(y - currentY) > 5) out += '\n'; out += item.str + ' '; if (item.hasEOL) { out += '\n'; y = null; } else y = currentY; } return out.replace(/\n[ \t]*\n+/g, '\n').trim(); }
async function importFiles(fileList) {
  if (busy || !fileList.length) return;
  if (questions.length && !confirm('匯入新檔案會取代目前題目，要繼續嗎？')) return;
  busy = true; stop(); const buttons = ['cameraBtn','uploadBtn','split','demo','emptyDemo','add','clear','studentMode']; buttons.forEach(id => { if ($(id)) $(id).disabled = true; }); $('progress').hidden = false; $('progress').value = 0;
  let worker = null, pdf = null;
  try {
    const files = Array.from(fileList); let texts = [];
    if (files.some(f => f.size > 25 * 1024 * 1024)) throw new Error('每個檔案需小於 25 MB，請縮小檔案或分開匯入。');
    for (const file of files) {
      status(`正在開啟 ${file.name}…`);
      if (/\.json$/i.test(file.name)) {
        const data = JSON.parse(await file.text()); if (!Array.isArray(data.questions) || data.questions.length > 1000 || data.questions.some(t => typeof t !== 'string' || t.length > 50000)) throw new Error('題目檔格式不正確。'); texts.push(data.questions.join('\n\n')); continue;
      }
      if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        const lib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs'); lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
        pdf = await lib.getDocument({data: new Uint8Array(await file.arrayBuffer()), cMapUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/', cMapPacked:true, standardFontDataUrl:'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/'}).promise;
        if (pdf.numPages > 30) throw new Error('一次最多辨識 30 頁，請先將 PDF 分成較小的檔案。');
        for (let n = 1; n <= pdf.numPages; n++) {
          status(`正在讀取第 ${n} / ${pdf.numPages} 頁…`); const page = await pdf.getPage(n); let text = textFromItems((await page.getTextContent()).items);
          if (text.replace(/\s/g,'').length < 15) {
            if (!worker) worker = await createOCR();
            const base = page.getViewport({scale:1}); const viewport = page.getViewport({scale:Math.min(2.2,2400/Math.max(base.width,base.height))}); const c = document.createElement('canvas'); c.width = viewport.width; c.height = viewport.height; await page.render({canvasContext:c.getContext('2d'),viewport}).promise;
            text = (await timeLimit(worker.recognize(c))).data.text; c.width = c.height = 0;
          }
          texts.push(text); page.cleanup();
        }
        await pdf.destroy(); pdf = null;
      } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)) {
        if (!worker) worker = await createOCR(); const c = await imageCanvas(file); texts.push((await timeLimit(worker.recognize(c))).data.text); c.width = c.height = 0;
      } else throw new Error('請選擇 PDF、照片，或本站下載的 JSON 題目檔。');
    }
    const text = texts.map(t => t.trim().replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g, '$1')).filter(Boolean).join('\n\n'); if (!text) throw new Error('沒有辨識到文字，請在光線充足處將試卷平放拍攝，或直接貼上文字。');
    $('raw').value = text; questions = splitQuestions(text); render(); status(`辨識完成，共 ${questions.length} 題。可立即點選報讀；請核對文字、選項與分題。`);
  } catch(e) { status(`未完成匯入：${e.name === 'PasswordException' ? 'PDF 已加密，請先解除密碼後上傳。' : e.message}`, true); }
  finally { if (worker) await worker.terminate().catch(()=>{}); if (pdf) await pdf.destroy().catch(()=>{}); busy = false; buttons.forEach(id => { if ($(id)) $(id).disabled = false; }); $('progress').hidden = true; $('files').value = ''; $('camera').value = ''; }
}
$('cameraBtn').onclick = () => $('camera').click(); $('uploadBtn').onclick = () => $('files').click();
$('camera').onchange = e => importFiles(e.target.files); $('files').onchange = e => importFiles(e.target.files);
$('dropzone').ondragover = e => { e.preventDefault(); $('dropzone').style.background = '#e4ebdc'; }; $('dropzone').ondragleave = () => $('dropzone').style.background = '';
$('dropzone').ondrop = e => { e.preventDefault(); $('dropzone').style.background = ''; importFiles(e.dataTransfer.files); };
$('demo').onclick = loadDemo; $('emptyDemo').onclick = loadDemo;
$('split').onclick = () => { const next = splitQuestions($('raw').value); if (!next.length) { status('請先貼上題目文字。', true); $('raw').focus(); return; } stop(); questions = next; render(); status(`已整理為 ${questions.length} 題，可編輯每一題修正內容。`); };
$('stop').onclick = stop; $('rate').onchange = stop; $('voice').onchange = stop; $('font').onclick = () => { const on = document.body.classList.toggle('large'); $('font').textContent = on ? '字級 A－' : '字級 A＋'; };
$('studentMode').onclick = () => { const on = document.body.classList.toggle('student'); $('studentMode').textContent = on ? '返回老師準備區' : '進入學生模式 ↗'; if (on && !questions.length) $('playing').textContent = '目前沒有題目，請返回老師準備區匯入試卷。'; window.scrollTo({top:0,behavior:'smooth'}); };
$('add').onclick = () => { stop(); questions.push('新題目'); syncRaw(); render(); const card = $(`q-${questions.length-1}`); editQuestion(questions.length-1, card); card.scrollIntoView({behavior:'smooth',block:'center'}); };
$('clear').onclick = () => { if (!confirm('清除所有題目？尚未下載的題目將無法復原。')) return; stop(); questions = []; $('raw').value = ''; history.replaceState(null,'',location.pathname + location.search); render(); status('已清除所有題目。'); };
$('export').onclick = () => { if (!questions.length) { status('請先匯入題目。',true); return; } const url = URL.createObjectURL(new Blob([JSON.stringify({version:1,questions},null,2)],{type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = '聽見題目-試卷.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); };
function encodeQuestions() {
  if (!window.fflate) throw new Error('分享工具未載入，請重新整理後再試。');
  const bytes = fflate.gzipSync(fflate.strToU8(JSON.stringify(questions)), { level: 9 });
  let binary = ''; for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function openShare() {
  $('shareDialog').showModal(); $('qr').replaceChildren(); $('shareHint').textContent = '正在產生分享連結…'; $('shareUrl').value = ''; $('copyUrl').disabled = true;
  try {
    let url = location.origin + location.pathname + '?v=20261028-2';
    if (questions.length) url += '#exam=' + await encodeQuestions();
    $('shareUrl').value = url; $('copyUrl').disabled = false;
    $('shareHint').textContent = questions.length ? `掃碼後將載入這份試卷的 ${questions.length} 道題目，並進入學生模式。` : '掃碼開啟網站，可在平板上拍照或上傳試卷。';
    if (url.length > 1900) { $('qr').textContent = '這份試卷較長，請複製下方連結傳給學生，或下載題目檔後在平板匯入。'; return; }
    await loadScript('https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',()=>!!window.QRCode);
    new QRCode($('qr'), {text:url,width:240,height:240,correctLevel:QRCode.CorrectLevel.L,colorDark:'#244f44',colorLight:'#ffffff'}); $('qr').setAttribute('aria-label','使用平板相機掃描此 QR Code 開啟網站');
  } catch(e) { $('shareHint').textContent = `無法產生分享碼：${e.message} 也可以下載題目檔，在平板上匯入。`; }
}
$('share').onclick = openShare; $('closeShare').onclick = () => $('shareDialog').close();
$('copyUrl').onclick = async () => { try { await navigator.clipboard.writeText($('shareUrl').value); $('copyUrl').textContent = '已複製網址 ✓'; setTimeout(()=>$('copyUrl').textContent='複製網址',2000); } catch { $('shareUrl').select(); $('shareHint').textContent = '請長按網址或使用複製功能。'; } };
let restoredHash = '';
function restoreShare() {
  if (!location.hash.startsWith('#exam=') || restoredHash === location.hash) return;
  $('playing').textContent = '正在載入老師分享的題目…';
  try {
    if (!window.fflate) throw new Error('分享工具尚未載入，請重新整理再試。');
    const encoded = decodeURIComponent(location.hash.slice(6)); if (encoded.length > 100000 || !/^[A-Za-z0-9_-]+={0,2}$/.test(encoded)) throw new Error('試卷連結不完整，請向老師索取新的 QR Code。');
    let base64 = encoded.replace(/-/g,'+').replace(/_/g,'/'); while (base64.length % 4) base64 += '=';
    const bytes = Uint8Array.from(atob(base64), c=>c.charCodeAt(0));
    let chunks = [], total = 0;
    const decoder = new fflate.Gunzip(chunk => { total += chunk.length; if (total > 500000) throw new Error('試卷內容過大，請改用題目檔匯入。'); chunks.push(chunk); });
    for (let offset = 0; offset < bytes.length; offset += 128) decoder.push(bytes.subarray(offset, offset + 128), offset + 128 >= bytes.length);
    const plain = new Uint8Array(total); let offset = 0; chunks.forEach(chunk => { plain.set(chunk, offset); offset += chunk.length; });
    const data = JSON.parse(fflate.strFromU8(plain)); if (!Array.isArray(data)||!data.length||data.length>1000||data.some(t=>typeof t!=='string'||!t.trim()||t.length>50000)) throw new Error('試卷格式不正確，請向老師索取新的 QR Code。');
    stop(); questions = data; syncRaw(); render(); document.body.classList.add('student'); $('studentMode').textContent='返回老師準備區';
    $('playing').textContent = `已載入 ${questions.length} 題，請點選「聽題目」。`; restoredHash = location.hash;
  } catch (e) {
    document.body.classList.remove('student'); $('studentMode').textContent='進入學生模式 ↗';
    const message = `試卷載入失敗：${e.message || '請向老師索取新的 QR Code 或題目檔。'}`;
    status(message, true); $('playing').textContent = message;
    $('questions').replaceChildren(); const error = document.createElement('div'); error.className = 'share-error'; error.setAttribute('role','alert');
    const title = document.createElement('h3'); title.textContent = '這份試卷尚未載入'; const detail = document.createElement('p'); detail.textContent = message;
    const retry = document.createElement('button'); retry.className='primary'; retry.textContent='重新載入試卷'; retry.onclick=()=>location.reload(); error.append(title,detail,retry); $('questions').append(error);
  }
}
window.addEventListener('hashchange', () => { restoredHash = ''; restoreShare(); });
window.addEventListener('pagehide',stop); restoreShare();
