import {useEffect,useState} from 'react';
import {NavLink,Link,Navigate,Routes,Route,useNavigate,useLocation} from 'react-router-dom';
import {signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,signOut} from 'firebase/auth';
import {collection,doc,onSnapshot,setDoc,deleteDoc,getDoc,updateDoc,writeBatch,serverTimestamp} from 'firebase/firestore';
import {db,auth} from './firebase';
import {useApp,money} from './store';
import {CATS} from './shared';

const useCol=n=>{const [r,setR]=useState([]);useEffect(()=>onSnapshot(collection(db,n),s=>setR(s.docs.map(d=>({id:d.id,...d.data()})))),[n]);return r;};
const today=()=>new Date().toISOString().slice(0,10);

const csv=(name,rows)=>{if(!rows.length)return;const k=Object.keys(rows[0]);const t=[k.join(','),...rows.map(r=>k.map(x=>`"${String(r[x]??'').replace(/"/g,'""')}"`).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=name;a.click();};

// ---- Hero slider: each picture is resized in the browser and saved as a base64 data-URL string in its own Firestore doc (banners/{id}).
// A Firestore document may not exceed 1 MiB; the string is kept well below that.
const MAX_B64=600000; // smaller per-slide budget keeps the home page quick with several slides
const MAX_SLIDES=6;
function toDataUrl(file){return new Promise((res,rej)=>{const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);let w=Math.min(img.width,1920),q=.85;
    for(let i=0;i<12;i++){const h=Math.round(img.height*w/img.width),c=document.createElement('canvas');c.width=w;c.height=h;
      const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
      const d=c.toDataURL('image/jpeg',q);if(d.length<=MAX_B64)return res(d);
      if(q>.6)q-=.08;else w=Math.round(w*.85);}
    rej(new Error('This picture is too detailed to fit. Try a smaller or simpler image.'));};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('That file could not be read as an image.'))};img.src=url;});}

function Banner(){const slides=[...useCol('banners')].sort((x,y)=>(x.order||0)-(y.order||0));
  const blank={image:'',title:'',subtitle:'',link:''};const [f,setF]=useState(blank),[id,setId]=useState(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState('');
  const set=k=>e=>setF({...f,[k]:e.target.value});const fail=x=>setErr((x.message||String(x)).replace('Firebase: ',''));
  const pick=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setErr('');setMsg('');setBusy(true);
    try{setF({...f,image:await toDataUrl(file)})}catch(x){fail(x)}setBusy(false)};
  const reset=()=>{setF(blank);setId(null)};
  const save=async e=>{e.preventDefault();setErr('');setMsg('');
    if(!f.image)return setErr('Choose a picture first.');if(!id&&slides.length>=MAX_SLIDES)return setErr(`You can have up to ${MAX_SLIDES} slides. Delete one first.`);
    setBusy(true);try{const ref=id?doc(db,'banners',id):doc(collection(db,'banners'));
      const order=id?(slides.find(s=>s.id===id)?.order??1):Math.max(0,...slides.map(s=>s.order||0))+1;
      await setDoc(ref,{image:f.image,title:f.title.trim(),subtitle:f.subtitle.trim(),link:f.link.trim(),order,updatedAt:serverTimestamp()});
      setMsg(id?'Slide updated.':'Slide added. It is live on the home page.');reset()}catch(x){fail(x)}setBusy(false)};
  const del=async s=>{if(!confirm('Delete this slide?'))return;setErr('');try{await deleteDoc(doc(db,'banners',s.id));if(id===s.id)reset()}catch(x){fail(x)}};
  const move=async(k,d)=>{const a=slides[k],b=slides[k+d];if(!b)return;setErr('');try{const w=writeBatch(db);w.update(doc(db,'banners',a.id),{order:b.order});w.update(doc(db,'banners',b.id),{order:a.order});await w.commit()}catch(x){fail(x)}};
  return <><h2>Hero slider</h2><form className="card bn-form" onSubmit={save}>
    <p className="muted sm">Slides fill the top of the home page and play automatically, in the order below. Use wide pictures (16:9 or wider, ideally 1920×1080). Each picture is resized and saved in Firestore as a base64 string. Up to {MAX_SLIDES} slides.</p>
    <div className="bn-prev">{f.image?<img src={f.image} alt="Slide preview"/>:<span>{busy?'Preparing picture…':'Choose a picture to preview it here'}</span>}{f.image&&(f.title||f.subtitle)&&<div className="bn-t">{f.title&&<b>{f.title}</b>}{f.subtitle&&<span>{f.subtitle}</span>}</div>}</div>
    {f.image&&<span className="muted sm">Stored size: {Math.round(f.image.length/1024)} KB of the 1,024 KB Firestore document limit</span>}
    <input type="file" accept="image/*" onChange={pick} disabled={busy}/>
    <input placeholder="Headline (optional)" maxLength={80} value={f.title} onChange={set('title')}/>
    <input placeholder="Sub-text (optional)" maxLength={140} value={f.subtitle} onChange={set('subtitle')}/>
    <input placeholder="Button link (optional), e.g. /products?f=free or https://…" value={f.link} onChange={set('link')}/>
    {err&&<p className="err">{err}</p>}{msg&&<p className="ok">{msg}</p>}
    <div className="row"><button className="btn" disabled={busy||!f.image}>{id?'Save changes':'Add slide'}</button>{(id||f.image)&&<button type="button" className="btn ghost" onClick={reset}>Cancel</button>}</div></form>
    <h3>Slides ({slides.length}/{MAX_SLIDES})</h3>{!slides.length?<p className="muted">No slides yet. The home page shows no banner until you add one.</p>:
    <div className="bn-list">{slides.map((s,k)=><div className="card bn-row" key={s.id}><span className="bn-no">{k+1}</span><img className="bn-th" src={s.image} alt=""/>
      <div className="bn-meta"><b>{s.title||'No headline'}</b><span className="muted sm">{s.subtitle||'No sub-text'}{s.link&&` · ${s.link}`}</span></div>
      <div className="row"><button className="btn sm ghost" disabled={k===0} onClick={()=>move(k,-1)} aria-label="Move up">↑</button><button className="btn sm ghost" disabled={k===slides.length-1} onClick={()=>move(k,1)} aria-label="Move down">↓</button>
        <button className="btn sm ghost" onClick={()=>{setId(s.id);setF({image:s.image,title:s.title||'',subtitle:s.subtitle||'',link:s.link||''});window.scrollTo(0,0)}}>Edit</button><button className="btn sm ghost" onClick={()=>del(s)}>Delete</button></div></div>)}</div>}</>;}

function Overview(){const tools=useCol('tools'),users=useCol('users'),orders=useCol('orders').filter(o=>o.status==='Paid');
  const revenue=orders.reduce((a,o)=>a+Number(o.total),0);
  const days=[...Array(7)].map((_,i)=>{const d=new Date(Date.now()-(6-i)*864e5).toISOString().slice(0,10);return {d,v:orders.filter(o=>o.date.slice(0,10)===d).reduce((a,o)=>a+Number(o.total),0)}});const max=Math.max(1,...days.map(x=>x.v));
  const top=Object.entries(orders.flatMap(o=>o.items).reduce((m,i)=>{m[i.toolName]=(m[i.toolName]||0)+1;return m},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const stat=(l,v)=><div className="card stat"><span className="muted">{l}</span><b>{v}</b></div>;
  return <><h2>Overview</h2><div className="grid4">{stat('Revenue',money(revenue))}{stat('Orders',orders.length)}{stat('Avg order value',money(orders.length?Math.round(revenue/orders.length):0))}{stat('Customers',users.length)}{stat('Tools',tools.length)}{stat('Paid / free',`${tools.filter(t=>t.access==='paid').length} / ${tools.filter(t=>t.access==='free').length}`)}</div>
    <div className="two"><div className="card"><b>Revenue, last 7 days</b><div className="chart">{days.map(x=><div key={x.d} className="bar-c"><span className="sm">{x.v?money(x.v):''}</span><div className="barv" style={{height:Math.max(4,x.v/max*120)}}/><span className="sm muted">{x.d.slice(5)}</span></div>)}</div></div>
    <div className="card"><b>Top selling tools</b>{!top.length?<p className="muted">No sales yet.</p>:top.map(([n,c])=><div className="row line" key={n}><span>{n}</span><b>{c} sold</b></div>)}</div></div>
    <h3>Recent orders</h3><OrderTable rows={[...orders].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6)}/></>;}

function OrderTable({rows,edit}){return <div className="scroll"><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
  {rows.map(o=><tr key={o.orderNo}><td><a href={`/invoice/${o.orderNo}`}>{o.orderNo}</a></td><td>{o.date.slice(0,10)}</td><td>{o.name||o.email}</td><td>{o.items.map(i=>i.toolName).join(', ')}</td><td>{money(o.total)}</td>
  <td>{edit?<select className="mini" value={o.status} onChange={e=>updateDoc(doc(db,'orders',o.orderNo),{status:e.target.value})}><option>Paid</option><option>Refunded</option><option>Cancelled</option></select>:o.status}</td></tr>)}</tbody></table></div>;}

function Orders(){const orders=useCol('orders');const [q,setQ]=useState('');const [st,setSt]=useState('all');
  const rows=orders.filter(o=>(st==='all'||o.status===st)&&(o.orderNo+o.email+(o.name||'')).toLowerCase().includes(q.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
  return <><h2>Orders</h2><div className="row bar"><input placeholder="Search order no, name or email" value={q} onChange={e=>setQ(e.target.value)}/><select value={st} onChange={e=>setSt(e.target.value)}><option value="all">All statuses</option><option>Paid</option><option>Refunded</option><option>Cancelled</option></select>
    <button className="btn ghost" onClick={()=>csv('orders.csv',rows.map(o=>({order:o.orderNo,date:o.date.slice(0,10),customer:o.name,email:o.email,items:o.items.map(i=>i.toolName).join('; '),total:o.total,method:o.method,status:o.status})))}>Export CSV</button></div><OrderTable rows={rows} edit/></>;}

function Customers(){const users=useCol('users');const [q,setQ]=useState('');const [msg,setMsg]=useState('');
  const rows=users.filter(u=>((u.name||'')+(u.email||'')).toLowerCase().includes(q.toLowerCase()));
  const reset=async u=>{try{await sendPasswordResetEmail(auth,u.email);setMsg(`Password reset email sent to ${u.email}.`)}catch(x){setMsg(x.message.replace('Firebase: ',''))}};
  return <><h2>Customers</h2><p className="muted sm">Passwords are encrypted by Firebase Authentication, so the real password can never be read back. Use “Send reset” to let a customer set a new one.</p>{msg&&<p className="ok">{msg}</p>}
    <div className="row bar"><input placeholder="Search customers" value={q} onChange={e=>setQ(e.target.value)}/><button className="btn ghost" onClick={()=>csv('customers.csv',rows.map(u=>({customer_name:u.name,email_id:u.email,tool_purchased:(u.purchases||[]).map(x=>x.toolName).join('; '),purchase_date:(u.purchases||[]).map(x=>x.date).join('; '),wallet_balance:u.wallet||0})))}>Export CSV</button></div>
    <div className="scroll"><table><thead><tr><th>Customer name</th><th>Email ID</th><th>Password</th><th>Tool purchased</th><th>Purchase date</th><th>Wallet balance (₹)</th></tr></thead><tbody>
    {rows.map(u=>{const p=u.purchases||[];return <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>••••••••<br/><button className="btn sm ghost" onClick={()=>reset(u)}>Send reset</button></td>
      <td>{p.length?p.map((x,i)=><div key={i}>{x.toolName}</div>):'—'}</td><td>{p.length?p.map((x,i)=><div key={i}>{x.date}</div>):'—'}</td>
      <td><input className="mini" type="number" defaultValue={u.wallet||0} onBlur={e=>updateDoc(doc(db,'users',u.id),{wallet:Number(e.target.value)})}/></td></tr>})}</tbody></table></div></>;}

const blank={category:'Firmware',name:'',description:'',purchaseDate:today(),vendor:'',fileSize:'',version:'',price:0,access:'paid',url:'',password:''};
function Tools(){const tools=useCol('tools');const secrets=Object.fromEntries(useCol('secrets').map(x=>[x.id,x]));const [f,setF]=useState(blank);const [id,setId]=useState(null);
  const set=k=>e=>setF({...f,[k]:e.target.value});
  const edit=async t=>{const s=await getDoc(doc(db,'secrets',t.id));setId(t.id);setF({...blank,...t,...(s.data()||{})});window.scrollTo(0,0)};
  const save=async e=>{e.preventDefault();const {url,password,...pub}=f;pub.price=pub.access==='free'?0:Number(pub.price);delete pub.id;
    const ref=id?doc(db,'tools',id):doc(collection(db,'tools'));await setDoc(ref,pub);await setDoc(doc(db,'secrets',ref.id),{url,password});setF(blank);setId(null);};
  const del=async t=>{if(confirm(`Delete ${t.name}?`)){await deleteDoc(doc(db,'tools',t.id));await deleteDoc(doc(db,'secrets',t.id))}};
  return <><h2>Tools</h2><form className="card formgrid" onSubmit={save}>
    <input required placeholder="Tool name" value={f.name} onChange={set('name')}/><input required placeholder="Vendor name" value={f.vendor} onChange={set('vendor')}/>
    <input placeholder="Version no (e.g. 2.4.1)" value={f.version} onChange={set('version')}/><input placeholder="File size (e.g. 480 MB)" value={f.fileSize} onChange={set('fileSize')}/>
    <select value={f.access} onChange={set('access')}><option value="paid">Paid</option><option value="free">Free</option></select>
    <select value={f.category} onChange={set('category')}>{CATS.map(c=><option key={c}>{c}</option>)}</select><input type="number" min="0" disabled={f.access==='free'} placeholder="Purchase price (₹)" value={f.access==='free'?0:f.price} onChange={set('price')}/>
    <input type="date" value={f.purchaseDate} onChange={set('purchaseDate')}/><input required placeholder="Tool URL (Google Drive link)" value={f.url} onChange={set('url')}/>
    <input placeholder="Tool password" value={f.password} onChange={set('password')}/>
    <textarea className="span" rows={3} placeholder="Tool description" value={f.description} onChange={set('description')}/>
    <div className="span row"><button className="btn">{id?'Save changes':'Add tool'}</button>{id&&<button type="button" className="btn ghost" onClick={()=>{setId(null);setF(blank)}}>Cancel</button>}</div></form>
    <div className="scroll"><table className="ttable"><thead><tr><th>Tool name</th><th>Tool description</th><th>Purchase date</th><th>Vendor name</th><th>File size</th><th>Tool URL</th><th>Purchase price</th><th>Version no</th><th>Tool password</th><th>Access mode</th><th></th></tr></thead><tbody>
    {tools.map(t=>{const sc=secrets[t.id]||{};return <tr key={t.id}><td>{t.name}</td><td className="dcell"><div className="dclamp" title={t.description}>{t.description}</div></td><td>{t.purchaseDate}</td><td>{t.vendor}</td><td>{t.fileSize}</td><td>{sc.url?<a href={sc.url} target="_blank" rel="noreferrer">Open link</a>:'—'}</td><td>{t.access==='free'?'Free':money(t.price)}</td><td>{t.version}</td><td><code>{sc.password||'—'}</code></td><td>{t.access==='free'?'Free':'Paid'}</td>
      <td className="row"><button className="btn sm ghost" onClick={()=>edit(t)}>Edit</button><button className="btn sm ghost" onClick={()=>del(t)}>Delete</button></td></tr>})}</tbody></table></div></>;}

export function AdminRegister(){const [f,setF]=useState({name:'',email:'',password:''});const [err,setErr]=useState('');const [open,setOpen]=useState(null);const nav=useNavigate();
  useEffect(()=>{getDoc(doc(db,'meta','adminLock')).then(s=>setOpen(!s.exists())).catch(()=>setOpen(false))},[]);
  const submit=async e=>{e.preventDefault();setErr('');try{
    const c=await createUserWithEmailAndPassword(auth,f.email,f.password);const b=writeBatch(db);
    b.set(doc(db,'admins',c.user.uid),{name:f.name,email:f.email,createdAt:serverTimestamp()});b.set(doc(db,'meta','adminLock'),{by:c.user.uid,at:serverTimestamp()});await b.commit();nav('/admin');
  }catch(x){setErr(x.message.replace('Firebase: ',''))}};
  const set=k=>e=>setF({...f,[k]:e.target.value});
  return <div className="alogin"><form className="card" onSubmit={submit}><div className="logo"><span className="mark">F</span>FlashVault Admin</div><h2>Create first admin account</h2>
    {open===null?<p className="muted">Checking…</p>:!open?<><p className="muted">Admin setup is closed. Ask an existing admin to create your account from Admin → Admins.</p><Link to="/admin/login" className="btn lg">Admin sign in</Link></>:<>
    <p className="muted sm">One-time setup. It locks after the first admin is created.</p>
    <input required placeholder="Full name" value={f.name} onChange={set('name')}/><input required type="email" placeholder="Admin email" value={f.email} onChange={set('email')}/><input required type="password" minLength={6} placeholder="Password (min 6)" value={f.password} onChange={set('password')}/>
    {err&&<p className="err">{err}</p>}<button className="btn lg">Create admin account</button><Link to="/admin/login" className="muted sm">Already an admin? Sign in</Link></>}</form></div>;}

export function AdminLogin(){const [f,setF]=useState({email:'',password:''});const [err,setErr]=useState('');const nav=useNavigate();
  const submit=async e=>{e.preventDefault();setErr('');try{
    const c=await signInWithEmailAndPassword(auth,f.email,f.password);
    if(!(await getDoc(doc(db,'admins',c.user.uid))).exists()){await signOut(auth);setErr('This account does not have admin access.');return}
    nav('/admin');}catch(x){setErr(x.message.replace('Firebase: ',''))}};
  return <div className="alogin"><form className="card" onSubmit={submit}><div className="logo"><span className="mark">F</span>FlashVault Admin</div><h2>Admin sign in</h2>
    <input required type="email" placeholder="Admin email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
    <input required type="password" placeholder="Password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
    {err&&<p className="err">{err}</p>}<button className="btn lg">Sign in</button><Link to="/admin/register" className="link">Create admin account</Link><a href="/" className="muted sm">← Back to store</a></form></div>;}

const Ic=({d,s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ad-ic">{d}</svg>;
const ICONS={
  overview:<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  customers:<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.7 2.8 2.3 3 5.2"/></>,
  tools:<><path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7z"/><path d="M3.5 7 12 11.5 20.5 7M12 11.5v10"/></>,
  orders:<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></>,
  bell:<><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
  logout:<><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/></>,
  menu:<><path d="M4 7h16M4 12h16M4 17h10"/></>,
  image:<><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 9"/></>,
  store:<><path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9v11H4z"/></>
};
const NAV=[['Overview',[['/admin','Overview','overview',true]]],['Management',[['/admin/customers','Customers','customers'],['/admin/tools','Tools','tools'],['/admin/banner','Hero slider','image']]],['Sales',[['/admin/orders','Orders','orders']]]];
const TITLES={'/admin':'Overview','/admin/customers':'Customers','/admin/tools':'Tools','/admin/banner':'Hero slider','/admin/orders':'Orders'};

function AdminShell({user}){const nav=useNavigate();const loc=useLocation();const [open,setOpen]=useState(true);const [bell,setBell]=useState(false);
  const orders=useCol('orders');const recent=[...orders].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);const todayCount=orders.filter(o=>o.date?.slice(0,10)===today()).length;
  const name=user.displayName||user.email?.split('@')[0]||'Admin';const initials=name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  const title=TITLES[loc.pathname.replace(/\/$/,'')]||'Admin';
  const out=()=>signOut(auth).then(()=>nav('/admin/login'));
  return <div className={'ad'+(open?'':' collapsed')}>
    <aside className="ad-side"><div className="ad-brand"><span className="mark">F</span><div className="ad-bt"><b>FlashVault</b><small>Admin console</small></div></div>
      <div className="ad-nav">{NAV.map(([g,items])=><div key={g}><div className="ad-group">{g}</div>{items.map(([to,label,ic,end])=><NavLink key={to} to={to} end={end} title={label} className="ad-link"><Ic d={ICONS[ic]}/><span>{label}</span></NavLink>)}</div>)}</div>
      <div className="ad-user"><div className="ad-av">{initials}</div><div className="ad-ui"><b>{name}</b><span className="ad-badge">Admin</span></div><button className="ad-out" onClick={out} title="Sign out" aria-label="Sign out"><Ic d={ICONS.logout} s={16}/></button></div></aside>
    <div className="ad-main"><header className="ad-top"><button className="ad-ico" onClick={()=>setOpen(!open)} title={open?'Collapse menu':'Expand menu'} aria-label="Toggle menu"><Ic d={ICONS.menu}/></button><h1>{title}</h1><div className="ad-sp"/>
      <a href="/" className="ad-store"><Ic d={ICONS.store} s={16}/>View store</a>
      <div className="ad-pop"><button className="ad-ico" onClick={()=>setBell(!bell)} aria-label="Notifications"><Ic d={ICONS.bell}/>{todayCount>0&&<i className="ad-dot"/>}</button>
        {bell&&<div className="ad-drop" onClick={()=>setBell(false)}><b>Recent orders</b>{!recent.length?<p className="muted sm">No orders yet.</p>:recent.map(o=><a key={o.orderNo} href={`/invoice/${o.orderNo}`}><span>{o.name||o.email}</span><small>{o.orderNo} · {money(o.total)}</small></a>)}</div>}</div>
      <div className="ad-me"><div className="ad-av sm">{initials}</div><span>{name}</span></div></header>
      <main className="ad-content"><Routes><Route index element={<Overview/>}/><Route path="customers" element={<Customers/>}/><Route path="tools" element={<Tools/>}/><Route path="banner" element={<Banner/>}/><Route path="orders" element={<Orders/>}/></Routes></main>
      <footer className="ad-foot">FlashVault admin console · Changes apply to the live store immediately</footer></div></div>;}

export default function Admin(){const {user,isAdmin}=useApp();const nav=useNavigate();
  if(!user)return <Navigate to="/admin/login"/>;
  if(!isAdmin)return <div className="alogin"><div className="card"><h2>Admins only</h2><p className="muted">Your account ({user.uid}) is not an admin. Create a document in the <code>admins</code> collection with this UID as its ID, then refresh.</p><button className="btn" onClick={()=>signOut(auth).then(()=>nav('/admin/login'))}>Sign out</button></div></div>;
  return <AdminShell user={user}/>;}
