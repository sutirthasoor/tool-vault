import {useEffect,useState} from 'react';
import {Routes,Route,Link,Navigate,Outlet,useNavigate,useParams,useLocation} from 'react-router-dom';
import {collection,doc,getDoc,getDocs,setDoc,writeBatch,arrayUnion,increment,serverTimestamp,query,where} from 'firebase/firestore';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,updateProfile,sendPasswordResetEmail} from 'firebase/auth';
import {auth,db} from './firebase';
import {useApp,money} from './store';
import {Header,Footer} from './Shell';
import {useTools} from './shared';
import {Home,Products} from './Home';

function Access({t}){const {user,owns}=useApp();const [s,setS]=useState(null);const [err,setErr]=useState('');
  const reveal=async()=>{setErr('');try{setS((await getDoc(doc(db,'secrets',t.id))).data())}catch{setErr('Could not load access details. Check you are signed in and own this tool.')}};
  if(s)return <div className="reveal"><div><span className="muted">Download link</span><a href={s.url} target="_blank" rel="noreferrer">{s.url}</a></div>
    <div><span className="muted">Password</span><code>{s.password||'None'}</code> <button className="btn sm ghost" onClick={()=>navigator.clipboard.writeText(s.password||'')}>Copy</button></div></div>;
  return <>{t.access==='free'||owns(t.id)?<button className="btn lg" onClick={reveal}>{t.access==='free'?'Get free download':'Show link & password'}</button>:null}{err&&<p className="err">{err}</p>}</>;}

function Detail(){const {id}=useParams();const [t,setT]=useState();const {user,owns,addToCart,cart}=useApp();const nav=useNavigate();
  useEffect(()=>{getDoc(doc(db,'tools',id)).then(s=>setT(s.exists()?{id:s.id,...s.data()}:null))},[id]);
  if(t===undefined)return <div className="wrap sec muted">Loading…</div>;if(!t)return <div className="wrap sec">Tool not found.</div>;
  const paid=t.access==='paid',own=owns(t.id);
  const buyNow=()=>{addToCart(t);nav(user?'/checkout':'/login',{state:{from:'/checkout'}})};
  return <div className="wrap sec detail"><div><Link to="/products" className="muted">← All products</Link><h1>{t.name}</h1>
    <p className="lead">{t.description}</p>
    <dl className="spec"><dt>Category</dt><dd>{t.category||"—"}</dd><dt>Vendor</dt><dd>{t.vendor}</dd><dt>Version</dt><dd>{t.version}</dd><dt>File size</dt><dd>{t.fileSize}</dd><dt>Added</dt><dd>{t.purchaseDate}</dd><dt>Access</dt><dd>{paid?'Paid':'Free'}</dd></dl></div>
    <aside className="card buy"><b className={paid?'price big':'free big'}>{paid?money(t.price):'Free'}</b>
      {paid&&!own&&<><button className="btn lg" onClick={buyNow}>Buy now</button><button className="btn lg ghost" disabled={cart.some(c=>c.id===t.id)} onClick={()=>addToCart(t)}>{cart.some(c=>c.id===t.id)?'In cart':'Add to cart'}</button>{!user&&<p className="muted sm">You’ll sign in before paying.</p>}</>}
      {(!paid||own)&&<Access t={t}/>}</aside></div>;}

function Cart(){const {cart,removeFromCart,user}=useApp();const total=cart.reduce((a,c)=>a+Number(c.price),0);
  return <div className="wrap sec"><h2>Cart</h2>{!cart.length?<p className="muted">Your cart is empty. <Link to="/products">Browse products</Link></p>:
    <div className="cartbox card">{cart.map(c=><div className="row line" key={c.id}><div><b>{c.name}</b><div className="muted sm">{c.vendor}</div></div><div className="row"><b>{money(c.price)}</b><button className="btn sm ghost" onClick={()=>removeFromCart(c.id)}>Remove</button></div></div>)}
      <div className="row line total"><b>Total</b><b>{money(total)}</b></div>
      <Link className="btn lg" to={user?'/checkout':'/login'} state={{from:'/checkout'}}>{user?'Checkout':'Sign in to checkout'}</Link></div>}</div>;}

function Checkout(){const {user,profile,cart,setCart}=useApp();const nav=useNavigate();const [m,setM]=useState('gateway'),[busy,setBusy]=useState(false)
  const total=cart.reduce((a,c)=>a+Number(c.price),0),wallet=Number(profile?.wallet||0);
  if(!user)return <Navigate to="/login" state={{from:'/checkout'}}/>;if(!cart.length)return <Navigate to="/cart"/>;
  const pay=async()=>{setBusy(true);const method=total===0?'free':m;if(method==='gateway')await new Promise(r=>setTimeout(r,1500)); // SIMULATED PAYMENT GATEWAY
    const date=new Date().toISOString(),day=date.slice(0,10),no='FV'+Date.now().toString().slice(-9);const b=writeBatch(db);
    b.set(doc(db,'orders',no),{orderNo:no,uid:user.uid,email:user.email,name:profile?.name||'',items:cart.map(c=>({toolId:c.id,toolName:c.name,vendor:c.vendor||'',price:Number(c.price)})),total,method,status:'Paid',date,createdAt:serverTimestamp()});
    b.set(doc(db,'users',user.uid),{purchases:arrayUnion(...cart.map(c=>({toolId:c.id,toolName:c.name,price:Number(c.price),date:day,orderNo:no}))),purchasedIds:arrayUnion(...cart.map(c=>c.id)),...(method==='wallet'?{wallet:increment(-total)}:{})},{merge:true});
    await b.commit();setCart([]);nav('/orders',{state:{paid:no}});};
  return <div className="wrap sec narrow"><h2>Checkout</h2><div className="card">
    {cart.map(c=><div className="row line" key={c.id}><span>{c.name}</span><b>{money(c.price)}</b></div>)}
    <div className="row line total"><b>Total</b><b>{money(total)}</b></div>
    {total>0&&<><label className="opt"><input type="radio" checked={m==='gateway'} onChange={()=>setM('gateway')}/> Pay with card / UPI (simulated gateway)</label>
    <label className="opt"><input type="radio" disabled={wallet<total} checked={m==='wallet'} onChange={()=>setM('wallet')}/> Wallet balance {money(wallet)}{wallet<total&&<span className="muted"> (not enough) · <Link to="/wallet">Top up</Link></span>}</label></>}
    <button className="btn lg" disabled={busy} onClick={pay}>{busy?'Processing payment…':total===0?'Place order':`Pay ${money(total)}`}</button></div></div>;}

function Login(){const loc0=useLocation();const [reg,setReg]=useState(!!loc0.state?.reg);const [f,setF]=useState({name:'',email:'',password:''});const [err,setErr]=useState('');const nav=useNavigate();const loc=useLocation();
  const go=()=>nav(loc.state?.from||'/products');
  const submit=async e=>{e.preventDefault();setErr('');try{
    if(reg){const c=await createUserWithEmailAndPassword(auth,f.email,f.password);await updateProfile(c.user,{displayName:f.name});
      await setDoc(doc(db,'users',c.user.uid),{name:f.name,email:f.email,wallet:0,purchases:[],purchasedIds:[],createdAt:serverTimestamp()});}
    else await signInWithEmailAndPassword(auth,f.email,f.password);go();}catch(x){setErr(x.message.replace('Firebase: ',''))}};
  const reset=async()=>{if(!f.email)return setErr('Enter your email first.');try{await sendPasswordResetEmail(auth,f.email);setErr('Password reset email sent. Check your inbox.')}catch(x){setErr(x.message.replace('Firebase: ',''))}};
  const set=k=>e=>setF({...f,[k]:e.target.value});
  return <div className="wrap sec narrow"><form className="card" onSubmit={submit}><h2>{reg?'Create account':'Sign in'}</h2>
    {reg&&<input required placeholder="Full name" value={f.name} onChange={set('name')}/>}
    <input required type="email" placeholder="Email" value={f.email} onChange={set('email')}/>
    <input required type="password" minLength={6} placeholder="Password" value={f.password} onChange={set('password')}/>
    {err&&<p className="err">{err}</p>}<button className="btn lg">{reg?'Create account':'Sign in'}</button>
    {!reg&&<button type="button" className="link" onClick={reset}>Forgot password?</button>}<button type="button" className="link" onClick={()=>setReg(!reg)}>{reg?'Have an account? Sign in':'New here? Create an account'}</button></form></div>;}

function Account(){const {user,profile}=useApp();const [tools,setTools]=useState({});const [open,setOpen]=useState(null);
  useEffect(()=>{getDocs(collection(db,'tools')).then(s=>setTools(Object.fromEntries(s.docs.map(d=>[d.id,{id:d.id,...d.data()}]))))},[]);
  if(!user)return <Navigate to="/login" state={{from:'/account'}}/>;
  return <div className="wrap sec"><h2>My downloads</h2>
    
    {!profile?.purchases?.length?<p className="muted">No purchases yet. <Link to="/products">Browse products</Link></p>:
    profile.purchases.map((p,i)=><div className="card" key={i}><div className="row line"><div><b>{p.toolName}</b><div className="muted sm">Bought {p.date} · {money(p.price)}</div></div>
      <button className="btn sm" onClick={()=>setOpen(open===i?null:i)}>{open===i?'Hide':'View access'}</button></div>{open===i&&tools[p.toolId]&&<Access t={tools[p.toolId]}/>}</div>)}</div>;}

function Orders(){const {user}=useApp();const loc=useLocation();const [o,setO]=useState(null);
  useEffect(()=>{if(user)getDocs(query(collection(db,'orders'),where('uid','==',user.uid))).then(s=>setO(s.docs.map(d=>d.data()).sort((a,b)=>b.date.localeCompare(a.date)))).catch(()=>setO([]))},[user]);
  if(!user)return <Navigate to="/login" state={{from:'/orders'}}/>;
  return <div className="wrap sec"><h2>My orders</h2>{loc.state?.paid&&<p className="ok">Order {loc.state.paid} placed. Open My downloads to see your link and password.</p>}
    {!o?<p className="muted">Loading…</p>:!o.length?<p className="muted">No orders yet. <Link to="/products">Browse products</Link></p>:
    <div className="scroll"><table><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{o.map(x=><tr key={x.orderNo}><td>{x.orderNo}</td><td>{x.date.slice(0,10)}</td><td>{x.items.map(i=>i.toolName).join(', ')}</td><td>{money(x.total)}</td><td><span className="tag">{x.status}</span></td><td><Link to={`/invoice/${x.orderNo}`}>Invoice</Link></td></tr>)}</tbody></table></div>}</div>;}

function Invoice(){const {no}=useParams();const {user}=useApp();const [o,setO]=useState();
  useEffect(()=>{getDoc(doc(db,'orders',no)).then(s=>setO(s.exists()?s.data():null)).catch(()=>setO(null))},[no]);
  if(!user)return <Navigate to="/login"/>;if(o===undefined)return <div className="wrap sec muted">Loading…</div>;if(!o)return <div className="wrap sec">Invoice not found.</div>;
  return <div className="wrap sec narrow"><div className="card invoice"><div className="row line"><div className="logo"><span className="mark">F</span>FlashVault</div><b>Invoice {o.orderNo}</b></div>
    <p className="muted sm">Date {o.date.slice(0,10)} · Billed to {o.name||o.email} ({o.email}) · Payment: {o.method} · Status: {o.status}</p>
    <table><thead><tr><th>Item</th><th>Vendor</th><th>Price</th></tr></thead><tbody>{o.items.map((i,k)=><tr key={k}><td>{i.toolName}</td><td>{i.vendor}</td><td>{money(i.price)}</td></tr>)}</tbody></table>
    <div className="row line total"><b>Total</b><b>{money(o.total)}</b></div><button className="btn noprint" onClick={()=>window.print()}>Print / save as PDF</button></div></div>;}

const PAGES={about:['About FlashVault','FlashVault is a marketplace for flash files, firmware and flashing tools from trusted vendors. Every tool lists its vendor, version and file size so you know what you are downloading.'],
 contact:['Contact us','Email support@flashvault.example with your order number and a short description of the problem. We reply within one business day.'],
 faq:['Frequently asked questions','How do I get a tool? Free tools show their link and password on the product page. Paid tools unlock after checkout and stay in My downloads. Can I top up my wallet? Yes, from the Wallet page. Where is my invoice? Open My orders and choose Invoice.'],
 terms:['Terms of use','Files are supplied by third-party vendors. You are responsible for using them on devices you own or are authorised to service. Access details may not be shared or resold.'],
 privacy:['Privacy policy','We store your name, email, orders and wallet balance to run your account. Passwords are handled by Firebase Authentication and never stored by us. We do not sell your data.'],
 refund:['Refund policy','Digital downloads are generally non-refundable once the link and password have been revealed. If a file is broken or not as described, contact support within 7 days.']};
function Info(){const {slug}=useParams();const p=PAGES[slug];return <div className="wrap sec narrow"><h1 className="h1s">{p?p[0]:'Page not found'}</h1><p className="lead">{p?p[1]:'This page does not exist.'}</p></div>;}

function Wallet(){const {user,profile}=useApp();const [amt,setAmt]=useState(500);const [busy,setBusy]=useState(false);const [ok,setOk]=useState('');
  if(!user)return <Navigate to="/login" state={{from:'/wallet'}}/>;
  const add=async()=>{const a=Number(amt);if(!(a>0))return;setBusy(true);setOk('');await new Promise(r=>setTimeout(r,1200)); // SIMULATED gateway
    await setDoc(doc(db,'users',user.uid),{wallet:increment(a),walletHistory:arrayUnion({amount:a,date:new Date().toISOString(),note:'Demo top-up'})},{merge:true});setBusy(false);setOk(`${money(a)} added to your wallet.`)};
  const hist=[...(profile?.walletHistory||[])].reverse();
  return <div className="wrap sec narrow"><h2>My wallet</h2><div className="card"><span className="muted">Available balance</span><b className="big price">{money(profile?.wallet)}</b></div>
    <div className="card"><b>Add money (demo)</b><div className="row">{[100,500,1000,2000].map(a=><button key={a} className={'btn sm '+(Number(amt)===a?'':'ghost')} onClick={()=>setAmt(a)}>{money(a)}</button>)}</div>
      <input type="number" min="1" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="Amount"/>
      <button className="btn lg" disabled={busy} onClick={add}>{busy?'Processing…':`Add ${money(amt)}`}</button>{ok&&<p className="ok">{ok}</p>}
      <p className="muted sm">Demo mode: no real money is charged.</p></div>
    <div className="card"><b>History</b>{!hist.length?<p className="muted">No top-ups yet.</p>:hist.map((h,i)=><div className="row line" key={i}><span>{h.note}<span className="muted sm"> · {h.date.slice(0,10)}</span></span><b className="free">+{money(h.amount)}</b></div>)}</div></div>;}

export default function App(){const {ready}=useApp();if(!ready)return null;
  return <Routes>
    <Route element={<><Header/><Outlet/><Footer/></>}>
      <Route path="/" element={<Home/>}/><Route path="/products" element={<Products/>}/><Route path="/brand/:brand" element={<Products/>}/><Route path="/products/:id" element={<Detail/>}/>
      <Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/login" element={<Login/>}/><Route path="/account" element={<Account/>}/><Route path="/wallet" element={<Wallet/>}/><Route path="/orders" element={<Orders/>}/><Route path="/invoice/:no" element={<Invoice/>}/><Route path="/page/:slug" element={<Info/>}/>
      <Route path="*" element={<div className="wrap sec">Page not found.</div>}/></Route></Routes>;}
