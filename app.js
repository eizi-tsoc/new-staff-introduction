const APP_VERSION = "1.1.1";
const DEFAULT_DEPARTMENTS = ["北参道：外来看護部","北参道：病棟看護部","北参道：手術室看護部","北参道：リハビリテーション部","北参道：放射線科","北参道：医事課","池袋：外来看護部","池袋：リハビリテーション部","池袋：放射線科","池袋：医事課","総務部","診療部","その他"];
const DEFAULT_OCCUPATIONS = ["看護師","准看護師","看護助手","理学療法士","アスレティックトレーナー","作業療法士","放射線技師","医療事務","医師","総務","その他"];
const $ = id => document.getElementById(id);
let departments = JSON.parse(localStorage.getItem('tsoc_departments') || 'null') || DEFAULT_DEPARTMENTS;
let occupations = JSON.parse(localStorage.getItem('tsoc_occupations') || 'null') || DEFAULT_OCCUPATIONS;
let staff = JSON.parse(localStorage.getItem('tsoc_staff') || '[]');
let selectedIndex = -1;
let photoData = '';
let photoOriginalData = '';
let photoCropState = { zoom: 1, offsetX: 0, offsetY: 0 };
let cropImage = null;
let cropDragging = false;
let cropLastPoint = null;

function fillSelects(){
  $('department').innerHTML = departments.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
  $('occupation').innerHTML = occupations.map(v=>`<option>${escapeHtml(v)}</option>`).join('');
}
function escapeHtml(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
function formatDate(v){ if(!v) return ''; const [y,m,d]=v.split('-'); return `${Number(m)}月${Number(d)}日`; }
function normalizedComment(value){const text=String(value??'').trim(); return text || 'よろしくお願いいたします。';}
function currentForm(){return {name:$('name').value.trim(),kana:$('kana').value.trim(),department:$('department').value,occupation:$('occupation').value,joinDate:$('joinDate').value,comment:$('comment').value.trim(),photo:photoData,photoOriginal:photoOriginalData||photoData,photoCrop:{...photoCropState}};}
function setForm(item){
  $('name').value=item.name||'';$('kana').value=item.kana||'';
  $('department').value=item.department||departments[0];$('occupation').value=item.occupation||occupations[0];
  $('joinDate').value=item.joinDate||'';$('comment').value=item.comment||'';
  photoData=item.photo||'';photoOriginalData=item.photoOriginal||item.photo||'';
  photoCropState=item.photoCrop?{zoom:Number(item.photoCrop.zoom)||1,offsetX:Number(item.photoCrop.offsetX)||0,offsetY:Number(item.photoCrop.offsetY)||0}:{zoom:1,offsetX:0,offsetY:0};
  showPhoto(photoData);$('photoAdjustBtn').disabled=!photoOriginalData;
}
function clearForm(){selectedIndex=-1;photoData='';photoOriginalData='';photoCropState={zoom:1,offsetX:0,offsetY:0};setForm({});$('photoAdjustBtn').disabled=true;$('photoInput').value='';$('updateBtn').disabled=true;$('addBtn').disabled=false;$('staffTable').querySelectorAll('tr').forEach(tr=>tr.classList.remove('selected'));}
function showPhoto(src){const img=$('photoPreview'); if(src){img.src=src;img.style.display='block';}else{img.removeAttribute('src');img.style.display='none';}}
function saveLocal(){localStorage.setItem('tsoc_staff',JSON.stringify(staff));}
function renderTable(){
  const tbody=$('staffTable').querySelector('tbody');
  tbody.innerHTML=staff.map((s,i)=>`<tr data-i="${i}" class="${i===selectedIndex?'selected':''}"><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.kana)}</td><td>${escapeHtml(s.department)}</td><td>${escapeHtml(s.occupation)}</td><td>${escapeHtml(formatDate(s.joinDate))}</td></tr>`).join('');
  tbody.querySelectorAll('tr').forEach(tr=>{
    tr.addEventListener('click',()=>{selectedIndex=Number(tr.dataset.i);renderTable();});
    tr.addEventListener('dblclick',()=>{selectedIndex=Number(tr.dataset.i);setForm(staff[selectedIndex]);$('updateBtn').disabled=false;$('addBtn').disabled=true;renderTable();});
  });
}
function validate(item){if(!item.name){alert('氏名を入力してください。');return false;}return true;}
function renderPreview(){
  const area=$('printArea');area.innerHTML='';
  const pages=[];for(let i=0;i<staff.length;i+=5)pages.push(staff.slice(i,i+5));if(!pages.length)pages.push([]);
  pages.forEach((pageStaff,pageIndex)=>{
    const page=document.createElement('div');page.className='page';if(pageIndex>0)page.classList.add('continuation');
    const headerHtml=pageIndex===0
      ? `<div class="page-header"><img src="assets/TSOC_logo.png" alt="TSOC"><div class="page-title"><h2>新入職員のご紹介</h2></div><div class="page-subtitle">新しい仲間が加わりました。皆さま、どうぞよろしくお願いいたします。</div></div>`
      : `<div class="page-header continuation-header"><div class="continuation-title">新入職員のご紹介 <span>続き</span></div><div class="continuation-note">前ページより続き</div></div>`;
    page.innerHTML=`${headerHtml}<div class="gold-line"></div><div class="cards"></div><div class="page-footer"><div><div class="footer-org">医療法人社団TSOC</div><div>理事長　菅谷 啓之　　院長　渡海 守人</div></div><div>Page ${pageIndex+1}/${pages.length}</div></div>`;
    const cards=page.querySelector('.cards');
    for(let i=0;i<5;i++){
      const s=pageStaff[i];const card=document.createElement('div');card.className='staff-card'+(!s?' empty-card':'');
      if(s){
        const photoHtml=s.photo?`<img class="photo" src="${s.photo}" alt="${escapeHtml(s.name)}">`:'<div class="photo photo-placeholder"></div>';
        const commentText=normalizedComment(s.comment);
        card.innerHTML=`${photoHtml}<div><div class="kana">${escapeHtml(s.kana)}</div><div class="staff-name">${escapeHtml(s.name)}</div><div class="badges"><span class="badge">${escapeHtml(s.department)}</span><span class="badge job">${escapeHtml(s.occupation)}</span></div><div class="join-date">入職日：${escapeHtml(formatDate(s.joinDate))}</div></div><div class="comment-wrap"><div class="comment-title">一言</div><div class="comment">${escapeHtml(commentText)}</div></div>`;
        const img=card.querySelector('img.photo');if(img)img.addEventListener('error',()=>img.replaceWith(Object.assign(document.createElement('div'),{className:'photo photo-placeholder'})));
      }else{card.innerHTML='<div class="photo photo-placeholder empty-photo"></div><div></div><div></div>';}
      cards.appendChild(card);
    }
    area.appendChild(page);
  });
}

function loadCropImage(src){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});}
function clampCropOffsets(){if(!cropImage)return;const canvas=$('cropCanvas');const base=Math.max(canvas.width/cropImage.naturalWidth,canvas.height/cropImage.naturalHeight);const scale=base*photoCropState.zoom;const drawW=cropImage.naturalWidth*scale,drawH=cropImage.naturalHeight*scale;const maxX=Math.max(0,(drawW-canvas.width)/2),maxY=Math.max(0,(drawH-canvas.height)/2);photoCropState.offsetX=Math.max(-maxX,Math.min(maxX,photoCropState.offsetX));photoCropState.offsetY=Math.max(-maxY,Math.min(maxY,photoCropState.offsetY));}
function drawCropEditor(){const canvas=$('cropCanvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#e9edf2';ctx.fillRect(0,0,canvas.width,canvas.height);if(!cropImage)return;clampCropOffsets();const base=Math.max(canvas.width/cropImage.naturalWidth,canvas.height/cropImage.naturalHeight);const scale=base*photoCropState.zoom;const w=cropImage.naturalWidth*scale,h=cropImage.naturalHeight*scale;const x=(canvas.width-w)/2+photoCropState.offsetX,y=(canvas.height-h)/2+photoCropState.offsetY;ctx.drawImage(cropImage,x,y,w,h);ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=4;ctx.strokeRect(2,2,canvas.width-4,canvas.height-4);}
async function openPhotoEditor(){if(!photoOriginalData)return;cropImage=await loadCropImage(photoOriginalData);if(!cropImage){alert('写真を読み込めませんでした。');return;}$('photoZoom').value=String(photoCropState.zoom||1);drawCropEditor();$('photoDialog').showModal();}
function cropPoint(e){const rect=$('cropCanvas').getBoundingClientRect();const p=e.touches?e.touches[0]:e;return{x:(p.clientX-rect.left)*($('cropCanvas').width/rect.width),y:(p.clientY-rect.top)*($('cropCanvas').height/rect.height)};}
function startCropDrag(e){if(!cropImage)return;cropDragging=true;cropLastPoint=cropPoint(e);$('cropCanvas').classList.add('dragging');if(e.cancelable)e.preventDefault();}
function moveCropDrag(e){if(!cropDragging)return;const p=cropPoint(e);photoCropState.offsetX+=p.x-cropLastPoint.x;photoCropState.offsetY+=p.y-cropLastPoint.y;cropLastPoint=p;drawCropEditor();if(e.cancelable)e.preventDefault();}
function endCropDrag(){cropDragging=false;cropLastPoint=null;$('cropCanvas').classList.remove('dragging');}
function applyPhotoCrop(){if(!cropImage)return;drawCropEditor();const source=$('cropCanvas'),output=document.createElement('canvas');output.width=1200;output.height=1200;output.getContext('2d').drawImage(source,0,0,1200,1200);photoData=output.toDataURL('image/jpeg',0.94);showPhoto(photoData);$('photoAdjustBtn').disabled=false;$('photoDialog').close();}
function resetPhotoCrop(){photoCropState={zoom:1,offsetX:0,offsetY:0};$('photoZoom').value='1';drawCropEditor();}

function openMaster(){$('departmentMaster').value=departments.join('\n');$('occupationMaster').value=occupations.join('\n');$('masterDialog').showModal();}
function saveMaster(){departments=$('departmentMaster').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);occupations=$('occupationMaster').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(!departments.length||!occupations.length){alert('所属・職種は最低1件必要です。');return;}localStorage.setItem('tsoc_departments',JSON.stringify(departments));localStorage.setItem('tsoc_occupations',JSON.stringify(occupations));fillSelects();$('masterDialog').close();alert('マスタを保存しました。');}
function downloadJson(){const blob=new Blob([JSON.stringify({staff,departments,occupations},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tsoc_staff_intro_data.json';a.click();URL.revokeObjectURL(a.href);}
function loadJsonFile(file){const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(Array.isArray(data.staff))staff=data.staff;if(Array.isArray(data.departments))departments=data.departments;if(Array.isArray(data.occupations))occupations=data.occupations;localStorage.setItem('tsoc_departments',JSON.stringify(departments));localStorage.setItem('tsoc_occupations',JSON.stringify(occupations));saveLocal();fillSelects();renderTable();renderPreview();alert('読み込みました。');}catch(e){alert('JSONの読み込みに失敗しました。');}};r.readAsText(file,'utf-8');}

async function makeLineImages(){renderPreview();const pages=[...document.querySelectorAll('.page')];for(let pi=0;pi<pages.length;pi++){const pageStaff=staff.slice(pi*5,pi*5+5);await drawLinePage(pageStaff,pi+1,pages.length);}}
function loadImage(src){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});}
async function drawLinePage(items,pageNo,total){
  const c=$('lineCanvas'),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#19283b';
  const logo=await loadImage('assets/TSOC_logo.png');let startY;
  if(pageNo===1){if(logo)ctx.drawImage(logo,60,34,330,88);ctx.font='bold 44px sans-serif';ctx.textAlign='right';ctx.fillText('新入職員のご紹介',1020,80);ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText('新しい仲間が加わりました。皆さま、どうぞよろしくお願いいたします。',540,140);ctx.fillStyle='#b49745';ctx.fillRect(50,178,980,5);startY=215;}
  else{ctx.font='bold 34px sans-serif';ctx.textAlign='left';ctx.fillText('新入職員のご紹介　続き',60,70);ctx.font='20px sans-serif';ctx.fillStyle='#667386';ctx.textAlign='right';ctx.fillText('前ページより続き',1020,70);ctx.fillStyle='#b49745';ctx.fillRect(50,105,980,5);startY=145;}
  for(let i=0;i<5;i++){
    const y=startY+i*190;roundRect(ctx,60,y,960,160,18,'#fff','#d7dce2');const s=items[i];if(!s)continue;
    const img=await loadImage(s.photo);if(img){ctx.save();roundClip(ctx,80,y+18,124,124,16);const scale=Math.max(124/img.width,124/img.height);const w=img.width*scale,h=img.height*scale;ctx.drawImage(img,80+(124-w)/2,y+18+(124-h)/2,w,h);ctx.restore();}else{roundRect(ctx,80,y+18,124,124,14,'#f0f2f5',null);}
    ctx.fillStyle='#667386';ctx.font='18px sans-serif';ctx.textAlign='left';ctx.fillText(s.kana||'',230,y+45);ctx.fillStyle='#19283b';ctx.font='bold 32px sans-serif';ctx.fillText(s.name||'',230,y+82);
    ctx.font='bold 20px sans-serif';roundRect(ctx,230,y+103,210,34,17,'#eef2f6',null);ctx.fillStyle='#19283b';ctx.fillText(s.department||'',250,y+127);roundRect(ctx,465,y+103,210,34,17,'#f5efe3',null);ctx.fillStyle='#7c611c';ctx.fillText(s.occupation||'',485,y+127);
    ctx.fillStyle='#5c6675';ctx.font='17px sans-serif';ctx.fillText('入職日：'+formatDate(s.joinDate),230,y+157);ctx.fillStyle='#9b7f2b';ctx.font='bold 20px sans-serif';ctx.fillText('一言',720,y+55);ctx.fillStyle='#142033';ctx.font='22px sans-serif';wrapText(ctx,normalizedComment(s.comment),720,y+92,270,32);
  }
  ctx.fillStyle='#19283b';ctx.font='bold 22px sans-serif';ctx.textAlign='left';ctx.fillText('医療法人社団TSOC',60,1300);ctx.font='20px sans-serif';ctx.fillText('理事長　菅谷 啓之　　院長　渡海 守人',60,1330);ctx.textAlign='right';ctx.fillStyle='#8c95a3';ctx.fillText(`Page ${pageNo}/${total}`,1020,1330);
  const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=`新入職員紹介_LINE_page${pageNo}.png`;a.click();
}
function roundRect(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function roundClip(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.clip();}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){let line='';for(const ch of String(text)){const test=line+ch;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);line=ch;y+=lineHeight;}else line=test;}if(line)ctx.fillText(line,x,y);}

$('photoInput').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{photoOriginalData=r.result;photoData=r.result;photoCropState={zoom:1,offsetX:0,offsetY:0};showPhoto(photoData);$('photoAdjustBtn').disabled=false;await openPhotoEditor();};r.readAsDataURL(f);});
$('addBtn').onclick=()=>{const item=currentForm();if(!validate(item))return;staff.push(item);saveLocal();renderTable();renderPreview();clearForm();};
$('updateBtn').onclick=()=>{if(selectedIndex<0)return;const item=currentForm();if(!validate(item))return;staff[selectedIndex]=item;saveLocal();renderTable();renderPreview();clearForm();};
$('deleteBtn').onclick=()=>{if(selectedIndex<0){alert('削除する行を選択してください。');return;}if(confirm('選択行を削除しますか？')){staff.splice(selectedIndex,1);saveLocal();clearForm();renderTable();renderPreview();}};
$('clearBtn').onclick=clearForm;$('previewBtn').onclick=renderPreview;$('printBtn').onclick=()=>{renderPreview();window.print();};$('lineBtn').onclick=makeLineImages;$('saveBtn').onclick=downloadJson;$('loadBtn').onclick=()=>$('loadInput').click();$('loadInput').onchange=e=>{if(e.target.files[0])loadJsonFile(e.target.files[0]);};$('masterBtn').onclick=openMaster;$('masterSaveBtn').onclick=e=>{e.preventDefault();saveMaster();};
$('photoAdjustBtn').onclick=openPhotoEditor;$('photoZoom').addEventListener('input',e=>{photoCropState.zoom=Number(e.target.value);drawCropEditor();});$('photoResetBtn').onclick=resetPhotoCrop;$('photoApplyBtn').onclick=applyPhotoCrop;$('photoCancelBtn').onclick=()=>$('photoDialog').close();
$('cropCanvas').addEventListener('mousedown',startCropDrag);window.addEventListener('mousemove',moveCropDrag);window.addEventListener('mouseup',endCropDrag);$('cropCanvas').addEventListener('touchstart',startCropDrag,{passive:false});window.addEventListener('touchmove',moveCropDrag,{passive:false});window.addEventListener('touchend',endCropDrag);
fillSelects();renderTable();renderPreview();
