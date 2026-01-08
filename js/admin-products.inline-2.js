(function(){
  const apiBase = window.__SHOP_ORIGIN || 'https://unalomecodes.com';
  async function authedFetch(url, options){
    const opts = Object.assign({}, options || {});
    opts.credentials = 'include';
    const res = await fetch(url, opts);
    if (res.status === 401){
      throw new Error('未登入或無權限，請使用管理員帳號重新登入。');
    }
    return res;
  }
  // ==== 神祇代碼驗證 ====
  const VALID_DEITY_CODES = ["WE","XZ","KP","CD","RH","HM","FM","GA","JL","ZD","ZF","HP"];
  // 名稱對應代碼對照表
  const DEITY_NAME_TO_CODE = {
    "四面神": "FM",
    "象神": "GA",
    "招財女神": "ZF",
    "五眼四耳": "WE",
    "徐祝老人": "XZ",
    "坤平": "KP",
    "崇迪": "CD",
    "拉胡": "RH",
    "哈魯曼": "HM",
    "迦樓羅": "JL",
    "澤度金": "ZD",
    "魂魄勇": "HP"
  };

  // --- 與 shop.html 同步的分類正規化函式 ---
  const ALL_CATEGORIES = ["佛牌/聖物", "蠟燭加持祈福", "跑廟行程", "其他"];
  function normalizeCategory(p) {
    const cat = p && p.category;
    if (cat && ALL_CATEGORIES.includes(cat)) return cat;
    const name = (p && p.name || "").toLowerCase();
    if (name.includes("蠟燭")) return "蠟燭加持祈福";
    if (name.includes("跑廟")) return "跑廟行程";
    return "佛牌/聖物";
  }

  // ==== 工具 ====
  const $ = (id)=>document.getElementById(id);
  const el = (tag, attrs={}, html="")=>{
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "style") e.setAttribute("style", attrs[k]);
      else e[k] = attrs[k];
    }
    if (html) e.innerHTML = html;
    return e;
  };
  const fallbackCopy = (text)=>{
    const ta = el("textarea", { style:"position:fixed;left:-9999px;top:-9999px" });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand("copy"); }catch(_){}
    document.body.removeChild(ta);
  };
  const copyText = async (text)=>{
    if (!text) return;
    try{
      if (navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
      }else{
        fallbackCopy(text);
      }
      alert("已複製 ID");
    }catch(_){
      fallbackCopy(text);
      alert("已複製 ID");
    }
  };

  // ==== 新增商品：規格 UI ====
  const newVars = $("new_vars");
  const addVarRow = (parent, data={name:"", priceDiff:0, stock:0})=>{
    const row = el("div", { class:"varRow" });
    const inName = el("input", { placeholder:"外殼名稱（例：銀色）", value: data.name||"", title:"規格名稱" });
    const inDiff = el("input", { type:"number", step:"1", min:"0", value: Number(data.priceDiff||0), placeholder:"加價（NT$）", title:"此規格相對於基礎價格的加價金額（NT$）" });
    const inStock= el("input", { type:"number", step:"1", min:"0", value: Number(data.stock||0), placeholder:"庫存數量", title:"此規格可販售的庫存數量" });
    const btnDel = el("button", { class:"btn danger", title:"刪除規格" }, "×");
    btnDel.addEventListener("click", ()=> row.remove());
    row.append(inName, inDiff, inStock, btnDel);
    parent.append(row);
  };
  $("btnAddVar").addEventListener("click", ()=> addVarRow(newVars));

  // ==== 上傳 ====
  const newImgsBox = $("new_imgs");
  $("btnUpload").addEventListener("click", ()=> $("filePicker").click());
  $("filePicker").addEventListener("change", async (ev)=>{
    const files = Array.from(ev.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach(f=> fd.append("files[]", f));
    setBusy(true);
    try{
      const res = await authedFetch(apiBase + "/api/upload", { method:"POST", body:fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error||"上傳失敗");
      for (const it of data.files) addThumb(newImgsBox, it.url);
    }catch(e){ alert(e.message||e); }
    setBusy(false);
    ev.target.value = "";
  });

  function addThumb(container, url, onRemoveR2=true){
    const box = el("div", { class:"thumb" });
    const img = el("img", { src:url, loading:"lazy", crossOrigin:"anonymous" });
    const x = el("button", { class:"x" }, "×");
    x.addEventListener("click", async ()=>{
      if (!confirm("確定刪除此圖片？（會刪除儲存檔案）")) return;
      try{
        await authedFetch(apiBase + "/api/deleteFile", {
          method:"POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ url })
        });
      }catch(e){}
      box.remove();
    });
    box.append(img, x);
    container.append(box);
  }

  // ==== 建立商品 ====
  $("btnCreate").addEventListener("click", async ()=>{
    const name = $("new_name").value.trim();
    const deity = $("new_deity").value.trim();
    const deityCode = $("new_deityCode") ? $("new_deityCode").value.trim().toUpperCase() : "";
    const category = ($("new_category") && $("new_category").value) || "佛牌/聖物";
    const basePrice = Number($("new_price").value || 0);
    const sold = Number($("new_sold").value || 0);
    const limitedUntilRaw = $("new_limited_until") ? $("new_limited_until").value.trim() : "";
    const limitedUntil = toIsoFromLocal(limitedUntilRaw);
    const description = $("new_desc").value.trim();
    const instagram = $("new_instagram") ? $("new_instagram").value.trim() : "";

    const images = Array.from(newImgsBox.querySelectorAll("img")).map(i=>i.src);
    const variants = Array.from(newVars.querySelectorAll(".varRow")).map(row=>{
      const [n, d, s] = row.querySelectorAll("input");
      return { name:n.value.trim(), priceDiff:Number(d.value||0), stock:Number(s.value||0) };
    });

    if (!name || !images.length) {
      $("createMsg").textContent = "請至少輸入名稱並上傳一張圖片。";
      return;
    }
    // 神祇代碼驗證
    if (deityCode) {
      if (!/^[A-Z]{2}$/.test(deityCode) || !VALID_DEITY_CODES.includes(deityCode)) {
        $("createMsg").textContent = "神祇代碼格式不正確，請重新選擇。";
        return;
      }
    }

    setBusy(true);
    $("createMsg").textContent = "建立中…";
    try{
      const payload = { name, deity, deityCode, category, basePrice, sold, description, images, variants, instagram, active:true };
      if (limitedUntil) payload.limitedUntil = limitedUntil;
      const res = await authedFetch(apiBase + "/api/products", {
        method:"POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error||"建立失敗");
      $("createMsg").textContent = "✅ 已建立";
      clearNewForm();
      await reloadList();
    }catch(e){
      $("createMsg").textContent = "❌ " + (e.message||e);
    }
    setBusy(false);
  });

  function clearNewForm(){
    $("new_name").value = "";
    $("new_deity").value = "";
    if ($("new_deityCode")) $("new_deityCode").value = "";
    $("new_price").value = "0";
    $("new_sold").value  = "0";
    if ($("new_limited_until")) $("new_limited_until").value = "";
    $("new_desc").value  = "";
    if ($("new_instagram")) $("new_instagram").value = "";
    newImgsBox.innerHTML = "";
    newVars.innerHTML = "";
  }

  // ==== 列表 ====
  $("btnReload").addEventListener("click", reloadList);
  $("q").addEventListener("input", renderList);
  $("onlyActive").addEventListener("change", renderList);

  let allItems = [];
  async function reloadList(){
    setBusy(true);
    try{
      const onlyActive = $("onlyActive").checked ? "?active=true" : "";
      const res = await authedFetch(apiBase + "/api/products" + onlyActive);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error||"讀取失敗");
      allItems = data.items || [];
      renderList();
    }catch(e){ alert(e.message||e); }
    setBusy(false);
  }

  function renderList(){
    const q = $("q").value.trim().toLowerCase();
    const tbody = $("list");
    tbody.innerHTML = "";
    const items = allItems.filter(p=>{
      if (!q) return true;
      return (p.name||"").toLowerCase().includes(q) || (p.deity||"").toLowerCase().includes(q);
    });
    for (const p of items){
      const tr = el("tr");
      const firstImg = (p.images && p.images[0]) ? p.images[0] : "";
      tr.append(
        tdImg(firstImg),
        tdInfo(p),
        tdCategory(p),
        tdPrice(p),
        tdSold(p),
        tdTools(p)
      );
      tbody.append(tr);
    }
  }

  function tdImg(url){
    const td = el("td");
    if (url) {
      const img = el("img", { src:url, style:"width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #262730;background:#0e0e12" });
      td.append(img);
    } else {
      td.textContent = "—";
    }
    return td;
  }
  function tdInfo(p){
    const td = el("td");
    const t = el("div", { style:"font-weight:700" }, escapeHtml(p.name||"未命名"));
    const chips = el("div", { class:"chips", style:"margin-top:6px" });
    if (p.category) chips.append(el("div",{ class:"chip alt" },"分類："+escapeHtml(p.category)));
    if (p.deity)    chips.append(el("div",{ class:"chip" },"神祇："+escapeHtml(p.deity)));
    if (p.deityCode) chips.append(el("div",{ class:"chip" },"代碼："+escapeHtml(p.deityCode)));
    chips.append(el("div",{ class:"chip "+(p.active? "alt": "") }, p.active ? "上架中" : "已下架"));
    td.append(t, chips);
    return td;
  }
  function tdCategory(p){
    const td = el("td");
    const cat = normalizeCategory(p);
    td.textContent = cat;
    return td;
  }
  function tdPrice(p){
    const td = el("td");
    td.innerHTML = `NT$ ${Number(p.basePrice||0).toLocaleString()}`;
    return td;
  }
  function tdSold(p){
    const td = el("td");
    td.innerHTML = `<span class="badge ${p.sold>0?'green':'gray'}">${Number(p.sold||0)}</span>`;
    return td;
  }
  function tdTools(p){
    const td = el("td");
    const box = el("div",{ class:"tools" });
    const b1 = el("button",{ class:"btn" },"編輯");
    const b2 = el("button",{ class:"btn "+(p.active? "warn":"ok") }, p.active ? "下架" : "上架");
    const bCopy = el("button",{ class:"btn" },"複製ID");
    const b3 = el("button",{ class:"btn danger" },"刪除");
    b1.addEventListener("click", ()=> openEdit(p.id));
    b2.addEventListener("click", ()=> toggleActive(p));
    bCopy.addEventListener("click", ()=> copyText(p.id));
    b3.addEventListener("click", ()=> removeProduct(p.id));
    box.append(b1,b2,bCopy,b3);
    td.append(box);
    return td;
  }

  async function toggleActive(p){
    if (!confirm(`確定要${p.active? "下架":"上架"}「${p.name}」？`)) return;
    setBusy(true);
    try{
      await authedFetch(`${apiBase}/api/products/${encodeURIComponent(p.id)}`, {
        method:"PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ active: !p.active })
      });
      await reloadList();
    }catch(e){ alert(e.message||e); }
    setBusy(false);
  }

  async function removeProduct(id){
    if (!confirm("刪除後無法復原，確定刪除？")) return;
    setBusy(true);
    try{
      await authedFetch(`${apiBase}/api/products/${encodeURIComponent(id)}`, { method:"DELETE" });
      await reloadList();
    }catch(e){ alert(e.message||e); }
    setBusy(false);
  }

  // ==== 編輯 Modal ====
  const modal = $("editModal");
  $("closeEdit").addEventListener("click", ()=> modal.style.display="none");

  async function openEdit(id){
    setBusy(true);
    try{
      const res = await authedFetch(`${apiBase}/api/products/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error||"讀取失敗");
      const p = data.product;
      renderEdit(p);
      modal.style.display = "flex";
    }catch(e){ alert(e.message||e); }
    setBusy(false);
  }

  function renderEdit(p){
    const box = $("editBody");
    box.innerHTML = "";

    const name = inputRow("商品名稱", p.name||"");
    const deity= inputRow("神祇", p.deity||"");

    // 神祇代碼（兩碼）
    const deityCodeWrap = el("div");
    const deityCodeLab  = el("label",{}, "神祇代碼（兩碼大寫）");
    const deityCodeSel  = el("select");
    [
      ["","（不設定）"],
      ["WE","WE｜五眼四耳"],["XZ","XZ｜徐祝老人"],["KP","KP｜坤平"],
      ["CD","CD｜崇迪"],["RH","RH｜拉胡"],["HM","HM｜哈魯曼"],
      ["FM","FM｜四面神"],["GA","GA｜象神"],["JL","JL｜迦樓羅"],
      ["ZD","ZD｜澤度金"],["ZF","ZF｜招財女神"],["HP","HP｜魂魄勇"]
    ].forEach(([v,t])=>{
      const o = el("option",{ value:v }, t);
      if ((p.deityCode||"") === v) o.selected = true;
      deityCodeSel.append(o);
    });
    deityCodeWrap.append(deityCodeLab, deityCodeSel);

    // 分類選擇
    const catWrap = el("div");
    const catLab  = el("label",{}, "分類");
    const catSel  = el("select");
    ["佛牌/聖物","蠟燭加持祈福","跑廟行程","其他"].forEach(v=>{
      const opt = el("option",{ value:v }, v);
      // 使用新的正規化函式來確保正確選中
      if (normalizeCategory(p) === v) opt.selected = true;
      catSel.append(opt);
    });
    catWrap.append(catLab, catSel);

    const price= inputRow("基礎價格（NT$）", String(Number(p.basePrice||0)), "number");
    const sold = inputRow("已售出", String(Number(p.sold||0)), "number");
    const limited = inputRow("限時上架至（選填）", formatDatetimeLocal(p.limitedUntil), "datetime-local");
    const desc = areaRow("商品描述", p.description||"");
    const ig = inputRow("Instagram 影片連結（選填）", p.instagram || "");

    const imgTitle = el("label",{}, "圖片");
    const addBtn = el("button",{ class:"btn", style:"margin-left:8px" },"＋新增圖片");
    const picker  = el("input",{ type:"file", accept:"image/*", multiple:true, style:"display:none" });
    const thumbs  = el("div",{ class:"thumbs" });

    (p.images||[]).forEach(u=> addThumbEdit(thumbs, u, p));

    addBtn.addEventListener("click", ()=> picker.click());
    picker.addEventListener("change", async (ev)=>{
      const files = Array.from(ev.target.files||[]);
      if (!files.length) return;
      const fd = new FormData();
      files.forEach(f=> fd.append("files[]", f));
      setBusy(true);
      try{
        const r = await authedFetch(apiBase + "/api/upload", { method:"POST", body:fd });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error||"上傳失敗");
        for (const it of d.files){
          p.images = p.images || [];
          p.images.push(it.url);
          addThumbEdit(thumbs, it.url, p);
        }
        await savePatch(p.id, { images: p.images });
      }catch(e){ alert(e.message||e); }
      setBusy(false);
      ev.target.value = "";
    });

    const varsTitle = el("label",{},"規格（外殼）");
    const varsHead  = el("div",{ class:"varHead" });
    varsHead.innerHTML = '<div>名稱</div><div>加價（NT$）</div><div>庫存</div><div></div>';
    const varsBox   = el("div",{ class:"variants" });
    (p.variants||[]).forEach(v=> addVarEdit(varsBox, v, p));
    const btnAddV   = el("button",{ class:"btn", style:"margin-top:8px" },"＋新增規格");
    btnAddV.addEventListener("click", ()=>{
      const v = { name:"", priceDiff:0, stock:0 };
      p.variants = p.variants || [];
      p.variants.push(v);
      addVarEdit(varsBox, v, p);
      queueSave(p.id, { variants: p.variants });
    });

    const btnRow = el("div",{ class:"row", style:"gap:8px;margin-top:12px" });
    const btnSave= el("button",{ class:"btn primary" },"儲存變更");
    const tip    = el("div",{ class:"muted" },"你也可以邊改邊存：欄位失焦、刪圖/加圖、增減規格時會自動 PATCH。");
    btnSave.addEventListener("click", async ()=>{
      const payload = {
        name: name.input.value.trim(),
        deity: deity.input.value.trim(),
        deityCode: deityCodeSel.value.trim().toUpperCase(),
        category: catSel.value,
        basePrice: Number(price.input.value||0),
        sold: Number(sold.input.value||0),
        limitedUntil: toIsoFromLocal(limited.input.value.trim()),
        description: desc.input.value.trim(),
        instagram: ig.input.value.trim(),
        images: p.images||[],
        variants: p.variants||[]
      };
      await savePatch(p.id, payload, true);
      await reloadList();
      alert("已儲存");
    });
    btnRow.append(btnSave, tip);

    box.append(
      name.row, deity.row, deityCodeWrap, catWrap,
      twoCols(price.row, sold.row),
      limited.row,
      desc.row,
      ig.row,
      hr(),
      rowBetween(imgTitle, addBtn),
      thumbs, picker,
      hr(),
      varsTitle, varsHead, varsBox, btnAddV,
      hr(),
      btnRow
    );

    // 欄位失焦即存
    [name.input, deity.input, price.input, sold.input, limited.input, desc.input, ig.input].forEach(inp=>{
      inp.addEventListener("change", ()=> {
        queueSave(p.id, {
          name: name.input.value.trim(),
          deity: deity.input.value.trim(),
          basePrice: Number(price.input.value||0),
          sold: Number(sold.input.value||0),
          limitedUntil: toIsoFromLocal(limited.input.value.trim()),
          description: desc.input.value.trim(),
          instagram: ig.input.value.trim()
        });
      });
    });

    // deityCode 欄位變更即存 + 驗證
    deityCodeSel.addEventListener("change", ()=> {
      const val = deityCodeSel.value.trim().toUpperCase();
      if (val && (!/^[A-Z]{2}$/.test(val) || !VALID_DEITY_CODES.includes(val))) {
        alert("神祇代碼格式不正確，請重新選擇。");
        deityCodeSel.value = "";
        return;
      }
      queueSave(p.id, { deityCode: val });
    });
    // 分類變動即存
    catSel.addEventListener("change", ()=> {
      queueSave(p.id, { category: catSel.value });
    });
  }

  function addThumbEdit(container, url, p){
    const box = el("div",{ class:"thumb" });
    const img = el("img",{ src:url, loading:"lazy", crossOrigin:"anonymous" });
    const x   = el("button",{ class:"x" },"×");
    x.addEventListener("click", async ()=>{
      if (!confirm("刪除此圖片？（會刪除檔案並自商品移除）")) return;
      try{
        await authedFetch(apiBase + "/api/deleteFile", {
          method:"POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ url })
        });
      }catch(e){}
      p.images = (p.images||[]).filter(u=>u!==url);
      box.remove();
      queueSave(p.id, { images: p.images });
    });
    box.append(img,x);
    container.append(box);
  }

  function addVarEdit(container, v, p){
    const row = el("div",{ class:"varRow" });
    const n = el("input",{ value:v.name||"", placeholder:"外殼名稱", title:"規格名稱" });
    const d = el("input",{ type:"number", step:"1", min:"0", value:Number(v.priceDiff||0), placeholder:"加價（NT$）", title:"此規格相對於基礎價格的加價金額（NT$）" });
    const s = el("input",{ type:"number", step:"1", min:"0", value:Number(v.stock||0), placeholder:"庫存數量", title:"此規格可販售的庫存數量" });
    const del= el("button",{ class:"btn danger" },"×");
    const sync = ()=> {
      v.name = n.value.trim();
      v.priceDiff = Number(d.value||0);
      v.stock = Number(s.value||0);
      queueSave(p.id, { variants: p.variants });
    };
    [n,d,s].forEach(inp=> inp.addEventListener("change", sync));
    del.addEventListener("click", ()=>{
      if (!confirm("刪除此規格？")) return;
      p.variants = (p.variants||[]).filter(x=> x!==v);
      row.remove();
      queueSave(p.id, { variants: p.variants });
    });
    row.append(n,d,s,del);
    container.append(row);
  }

  // === 小工具區 ===
  function inputRow(labelText, val="", type="text"){
    const row = el("div");
    const lab = el("label",{}, labelText);
    const inp = el("input",{ value:val, type });
    row.append(lab, inp);
    return { row, input:inp };
  }
  function areaRow(labelText, val=""){
    const row = el("div");
    const lab = el("label",{}, labelText);
    const inp = el("textarea"); inp.value = val;
    row.append(lab, inp);
    return { row, input:inp };
  }
  function rowBetween(a,b){
    const r = el("div",{ class:"row", style:"align-items:center;justify-content:space-between" });
    r.append(a,b); return r;
  }
  function twoCols(a,b){
    const r = el("div",{ class:"row" });
    a.style="flex:1"; b.style="flex:1";
    r.append(a,b); return r;
  }
  function toIsoFromLocal(val){
    const raw = String(val || "").trim();
    if (!raw) return "";
    const parts = raw.split("T");
    if (parts.length !== 2) return "";
    const [datePart, timePart] = parts;
    const dateBits = datePart.split("-").map(Number);
    const timeBits = timePart.split(":").map(Number);
    if (dateBits.length < 3 || timeBits.length < 2) return "";
    const [y, m, d] = dateBits;
    const [hh, mm] = timeBits;
    if (![y, m, d, hh, mm].every(n => Number.isFinite(n))) return "";
    const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (!Number.isFinite(dt.getTime())) return "";
    return dt.toISOString();
  }
  function formatDatetimeLocal(val){
    const raw = String(val || "").trim();
    if (!raw) return "";
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return "";
    const pad = (n)=> String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function hr(){ return el("div",{ class:"hr" }); }
  function setBusy(on){
    document.body.style.cursor = on? "progress":"default";
  }
  function escapeHtml(s){
    return String(s||"").replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  }

  let saveTimer = null, savePayload = null, saveId = null;
  function queueSave(id, payload){
    saveId = id;
    savePayload = Object.assign({}, savePayload || {}, payload);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async ()=>{
      await savePatch(saveId, savePayload);
      saveTimer = null;
      savePayload = null;
      saveId = null;
    }, 500);
  }
  async function savePatch(id, payload, force=false){
    try{
      const res = await authedFetch(`${apiBase}/api/products/${encodeURIComponent(id)}`, {
        method:"PATCH",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error||"儲存失敗");
      if (force) await reloadList();
      return true;
    }catch(e){ alert(e.message||e); return false; }
  }

  // 初次載入
  reloadList();

  // ==== 新增商品表單：神祇名稱 input 自動對應神祇代碼 ====
  if ($("new_deity")) {
    $("new_deity").addEventListener("input", function(ev){
      const val = this.value.trim();
      let matched = "";
      // 直接比對全名
      for (const k in DEITY_NAME_TO_CODE) {
        if (val === k) { matched = DEITY_NAME_TO_CODE[k]; break; }
      }
      // 若沒完全符合，嘗試模糊包含
      if (!matched) {
        for (const k in DEITY_NAME_TO_CODE) {
          if (val.includes(k)) { matched = DEITY_NAME_TO_CODE[k]; break; }
        }
      }
      if ($("new_deityCode")) {
        $("new_deityCode").value = matched;
      }
    });
  }
})();
