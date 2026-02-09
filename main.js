<script type="module">
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// MERKEZ FIREBASE
const merkezConfig = {
 apiKey: "AIzaSyAM5NHBpRHIlttNXwJ9YKDypR4eoyQbDeM",
 authDomain: "kolartguvenlik-e002d.firebaseapp.com",
 databaseURL: "https://kolartguvenlik-e002d-default-rtdb.firebaseio.com",
 projectId: "kolartguvenlik-e002d",
 storageBucket: "kolartguvenlik-e002d.firebasestorage.app",
 messagingSenderId: "212955174898",
 appId: "1:212955174898:web:f77501991c1648fb66bd6b",
 measurementId: "G-TCGDNDYY6Y"
};
const merkezApp = getApps().find(a => a.name === "[DEFAULT]") || initializeApp(merkezConfig);
const merkezDB = getDatabase(merkezApp);

// DOM
const siteNameEl = document.getElementById("siteName");
const securityBtn = document.getElementById("securityBtn");
const securityGroup = document.getElementById("securityGroup");
const msg = document.getElementById("message");
const secUsername = document.getElementById("secUsername");
const secPassword = document.getElementById("secPassword");
const secRemember = document.getElementById("secRemember");

const qrBtn = document.getElementById("startQR");
const codeBtn = document.getElementById("enterCode");
const codeModal = document.getElementById("codeModal");
const codeInput = document.getElementById("codeInput");
const codeCancel = document.getElementById("codeCancel");
const codeConfirm = document.getElementById("codeConfirm");
const qrModal = document.getElementById("qrModal");
const closeQRModal = document.getElementById("closeQRModal");
let qrReader = null;

const modal = document.getElementById("disconnectModal");
const cancelBtn = document.getElementById("cancelDisconnect");
const confirmBtn = document.getElementById("confirmDisconnect");

// 💡 Yeni fonksiyonlar
// 💡 Yeni fonksiyonlar
function hideQRButtons(){
  qrBtn.style.display="none";
  codeBtn.style.display="none";
  document.getElementById("qrButtonsWrapper").style.display = "none"; // 🌟 wrapper da kayboluyor
}

function showQRButtons(){
  qrBtn.style.display="flex";
  codeBtn.style.display="flex";
  document.getElementById("qrButtonsWrapper").style.display = "flex"; // 🌟 wrapper geri geliyor
}


// sayfa yüklendiğinde
window.addEventListener("load", async ()=>{
  securityBtn.click();
  const secStored = JSON.parse(localStorage.getItem("securityUser"));
  if(secStored){ 
    secUsername.value = secStored.username; 
    secPassword.value = secStored.password; 
    secRemember.checked = true; 
  }

[secUsername, secPassword].forEach(el => {
  // IME (Türkçe karakter vs.) için
  el.addEventListener("compositionstart", () => el.isComposing = true);
  el.addEventListener("compositionend", () => el.isComposing = false);

  // kullanıcı inputtan çıkınca büyük harfe çevir
  el.addEventListener("blur", () => {
    el.value = el.value.toLocaleUpperCase('tr-TR');
  });

  // istersen yazarken de canlı büyük yapabilirsin
  el.addEventListener("input", () => {
    if(!el.isComposing) { 
      el.value = el.value.toLocaleUpperCase('tr-TR'); 
    }
  });
});


  const savedSiteID = localStorage.getItem("siteID");
  const savedConfig = localStorage.getItem("siteConfig");
  if(savedSiteID && savedConfig){
    const siteConfig = JSON.parse(savedConfig);
    let siteApp = getApps().find(a=>a.name==`siteApp-${savedSiteID}`);
    if(!siteApp) siteApp = initializeApp(siteConfig, `siteApp-${savedSiteID}`);
    const siteDB = getDatabase(siteApp);
    hideQRButtons();
    await loadSiteName(siteDB);
  }
});

// LOGIN
async function loginUser(username,password,role){
  username=username.trim(); password=password.trim(); msg.textContent="";
  const siteConfig = localStorage.getItem("siteConfig") ? JSON.parse(localStorage.getItem("siteConfig")) : null;
  if(!siteConfig){ msg.textContent="Lütfen QR kodu okutunuz!"; return; }
  if(!username||!password){ msg.textContent="Kullanıcı adı ve şifre gerekli!"; return; }

  try{
    const siteId = localStorage.getItem("siteID");
    let app = getApps().find(a=>a.name==`siteApp-${siteId}`);
    if(!app) app=initializeApp(siteConfig,`siteApp-${siteId}`);
    const activeDB = getDatabase(app);

    const adminSnap = await get(child(ref(activeDB),'admin'));
    if(adminSnap.exists()){
      const adminUser = adminSnap.val();
      if(username===adminUser.username && password===adminUser.password){
        sessionStorage.setItem("currentUser", JSON.stringify({username,type:"admin"}));
        window.location.href="mod.html"; return;
      }
    }

    const userSnap = await get(child(ref(activeDB),'users/'+username));
    if(!userSnap.exists()){ msg.textContent="Kullanıcı bulunamadı!"; return; }
    const user=userSnap.val();
    if(user.password!==password){ msg.textContent="Şifre hatalı!"; return; }

    sessionStorage.setItem("currentUser", JSON.stringify({username:user.username,type:user.type}));
    if(role==="security"){
      if(secRemember.checked) localStorage.setItem("securityUser",JSON.stringify({username,password}));
      else localStorage.removeItem("securityUser");

      if(user.type==="company") window.location.href="sirket.html";
      else if(user.type==="security") window.location.href="guvenlik.html";
      else if(user.type==="admin") window.location.href="yetkili.html";
      else msg.textContent="Yetki hatalı!";
    }

  }catch(err){ console.error(err); msg.textContent="Bağlantı hatası!"; }
}

document.getElementById("secLoginBtn").addEventListener("click", ()=> loginUser(secUsername.value, secPassword.value,"security"));

// SITE ADI
async function loadSiteName(db){
  try{
    const snap = await get(child(ref(db),"settings/siteName"));
    if(snap.exists()){
      const name=snap.val().trim();
      if(name!==""){ siteNameEl.textContent=name; siteNameEl.style.display="block"; }
    }
  }catch(e){ console.error("Site adı yüklenemedi", e); }
}

// QR Başlat
qrBtn.addEventListener("click", ()=>{
  setActive(qrBtn);
  qrModal.style.display = "flex";
  const qrDiv = document.getElementById("qr-reader");
  qrDiv.innerHTML = "";
  qrReader = new Html5Qrcode("qr-reader");
  const qrBoxSize = Math.min(window.innerWidth*0.8,300);
  qrReader.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: qrBoxSize },
    async (qrCodeMessage)=>{
      try{ await qrReader.stop(); }catch(e){}
      qrReader=null;
      qrModal.style.display = "none";
      await loadSiteConfig(qrCodeMessage);
      document.getElementById("qrMessage").textContent="İşlem başarılı, şimdi giriş yapabilirsiniz.";
    },
    (err)=>{ console.log("QR tarama:",err);}
  ).catch(err=>{
    alert("Kamera açılamadı: "+err);
    qrModal.style.display = "none";
  });
});

// Kod Gir buton
codeBtn.addEventListener("click", ()=>{
  setActive(codeBtn);
  codeModal.classList.remove("hidden");
  codeInput.value="";
  codeInput.focus();
});

// Kod Modal
codeCancel.addEventListener("click", ()=> codeModal.classList.add("hidden"));
codeConfirm.addEventListener("click", async ()=>{
  const code = codeInput.value.trim();
  if(!/^\d{4}$/.test(code)){ alert("Lütfen 4 haneli sayı girin!"); return; }
  codeModal.classList.add("hidden");
  await loadSiteConfig(code);
  document.getElementById("qrMessage").textContent="Kod başarıyla yüklendi, giriş yapabilirsiniz!";
});

// Disconnect Modal
siteNameEl.addEventListener("mousedown",()=>{ pressTimer=setTimeout(openDisconnectModal,800); });
siteNameEl.addEventListener("mouseup",()=>clearTimeout(pressTimer));
siteNameEl.addEventListener("mouseleave",()=>clearTimeout(pressTimer));
siteNameEl.addEventListener("touchstart",()=>{ pressTimer=setTimeout(openDisconnectModal,800); });
siteNameEl.addEventListener("touchend",()=>clearTimeout(pressTimer));

function disconnectProject(){
  localStorage.removeItem("siteID");
  localStorage.removeItem("siteConfig");
  sessionStorage.removeItem("currentUser");
  siteNameEl.textContent="";
  siteNameEl.style.display="none";
  showQRButtons(); // 🔹 artık iki buton da geri geliyor
  document.getElementById("qrMessage").textContent="Proje bağlantısından ayrıldınız.";
  msg.textContent="";
}

function openDisconnectModal(){ modal.classList.remove("hidden"); }
function closeDisconnectModal(){ modal.classList.add("hidden"); }
cancelBtn.onclick = closeDisconnectModal;
confirmBtn.onclick = ()=>{ closeDisconnectModal(); disconnectProject(); };

// Aktif buton görseli
function setActive(button){ [qrBtn, codeBtn].forEach(b=>b.classList.remove("active")); button.classList.add("active"); }

// SITE CONFIG
async function loadSiteConfig(inputCode){
  try{
    let siteID;

    // inputCode 4 haneli sayı mı?
    if(/^\d{4}$/.test(inputCode)){
      // 4 haneli kod -> shortCodes'dan al
      const shortSnap = await get(child(ref(merkezDB), `shortCodes/${inputCode}`));
      if(!shortSnap.exists()){
        msg.textContent = "Kısa kod geçersiz!";
        showQRButtons();
        return null;
      }
      siteID = shortSnap.val();
    } else {
      // QR kod ile gelen uzun ID -> direk kullan
      siteID = inputCode;
    }

    // sites/<siteID>/config al
    const siteSnap = await get(child(ref(merkezDB), `sites/${siteID}/config`));
    if(!siteSnap.exists()){
      msg.textContent = "Site config bulunamadı!";
      showQRButtons();
      return null;
    }

    const siteConfig = siteSnap.val();

    // App oluştur / kullan
    let siteApp = getApps().find(a => a.name === `siteApp-${siteID}`);
    if(!siteApp) siteApp = initializeApp(siteConfig, `siteApp-${siteID}`);

    const siteDB = getDatabase(siteApp);

    // localStorage ve buton işlemleri
    localStorage.setItem("siteID", siteID);
    localStorage.setItem("siteConfig", JSON.stringify(siteConfig));
    hideQRButtons(); // butonları gizle
    await loadSiteName(siteDB);

    msg.textContent = "Site başarıyla yüklendi!";
    return siteDB;

  } catch(err){
    console.error(err);
    msg.textContent = "Site yüklenirken hata oluştu!";
    showQRButtons();
  }
}
// QR modal kapatma
closeQRModal.addEventListener("click", async () => {
  if(qrReader){
    try {
      await qrReader.stop(); // QR tarayıcıyı durdur
      qrReader.clear();      // Temizle
    } catch(e){
      console.error("QR durdurulamadı:", e);
    }
    qrReader = null;
  }
  qrModal.style.display = "none"; // modalı gizle
});

</script>